import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { HostDutyStatus, Prisma, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContext } from '../auth/auth.service';
import { authError } from '../auth/auth.errors';
import { hashPassword } from '../auth/password-hasher';
import { HostRoleCode, normalizeHostRoles, toHostRoleCodes, toHostRoleEnums } from '../auth/host-roles';
import { PhoneService } from '../auth/phone/phone.service';
import { decryptPhoneForDisplay } from '../auth/phone/phone-display';
import { AuthSessionService } from '../auth/session/auth-session.service';
import { RoleIdService } from '../auth/session/role-ids.service';
import { AuthenticatedUser } from '../auth/session/authenticated-user';
import { isoWeekPeriod } from '../admin/admin-payout.service';
import { CreateFieldHostDto, ListFieldHostsQueryDto, UpdateFieldHostDto } from './dto/field-hosts.dto';

const HOST_INCLUDE = {
  profile: {
    select: {
      id: true,
      email: true,
      fullName: true,
      phoneEnc: true,
      isPhoneVerified: true,
      isActive: true,
      lastLoginAt: true,
      // Chỉ để tính `hasPassword`; hash không bao giờ ra khỏi service này.
      passwordHash: true,
    },
  },
} as const;

type HostRow = Prisma.FieldHostGetPayload<{ include: typeof HOST_INCLUDE }>;

/** Ticket còn đang chạy: khoá Host lúc này sẽ bỏ rơi khách đang chờ ở sảnh. */
const ACTIVE_TICKETS: TicketStatus[] = [TicketStatus.OFFERED, TicketStatus.ACCEPTED, TicketStatus.CHECKED];
const TICKET_KEYS = Object.values(TicketStatus);

/** Cọc đã thu thật ⇒ tính là một deal Host chốt được (Attribution Lock: attributedHostId). */
const DEAL_STATUSES = ['PAID_HOLDING', 'CONVERTED_TO_CONTRACT'] as const;

/** Số liệu vận hành của một Host cho bảng/ hồ sơ Admin (AGENTS.md vận hành #3–#5). */
export interface HostStats {
  /** Ca xem đã dẫn xong (ticket COMPLETED). */
  completedViewings: number;
  /** Ca đang chạy (OFFERED/ACCEPTED/CHECKED) — khác 0 thì không khoá được tài khoản. */
  openTickets: number;
  deals: number;
  /** Trung bình acceptedAt − offeredAt; null khi chưa nhận ca nào. */
  avgAcceptSeconds: number | null;
  /** % khách bỏ hẹn trên các ca đã kết thúc của Host; null khi chưa có ca kết thúc. */
  noShowRate: number | null;
  /** Tổng HostPayout của tuần ISO hiện tại (giờ VN). */
  weekEarnings: number;
}

const sameRoles = (a: HostRoleCode[], b: HostRoleCode[]) => a.length === b.length && a.every((r, i) => r === b[i]);
const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === 'P2002';

/**
 * Admin quản lý Field Host (thay luồng tự đăng ký + nhập RFID cũ). Tạo Profile `field_host` và `field_hosts` trong CÙNG
 * một transaction; khoá mềm (FK từ ticket/cọc/hoa hồng); mọi thay đổi ghi AuditLog (không bao giờ ghi mật khẩu/hash).
 */
@Injectable()
export class FieldHostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phones: PhoneService,
    private readonly sessions: AuthSessionService,
    private readonly roleIds: RoleIdService,
  ) {}

  // ------------------------------------------------------------------ Đọc

  async zones(): Promise<string[]> {
    const rows = await this.prisma.building.findMany({
      distinct: ['zoneName'],
      select: { zoneName: true },
      orderBy: { zoneName: 'asc' },
    });
    return rows.map((r) => r.zoneName);
  }

  async list(query: ListFieldHostsQueryDto) {
    const where: Prisma.FieldHostWhereInput = {};
    if (query.zone) where.assignedZone = query.zone;
    if (query.active) where.profile = { isActive: query.active === 'true' };
    if (query.role === 'both') where.roles = { hasEvery: toHostRoleEnums(['sale', 'inspector']) };
    else if (query.role) where.roles = { has: toHostRoleEnums([query.role])[0] };

    const rows = await this.prisma.fieldHost.findMany({ where, include: HOST_INCLUDE, orderBy: { createdAt: 'desc' } });
    const stats = await this.statsFor(rows.map((r) => r.id));
    const views = rows.map((r) => ({ ...this.toView(r), stats: stats.get(r.id)! }));

    // SĐT chỉ có thể so sau khi giải mã nên tìm kiếm văn bản làm trong bộ nhớ (số Host nhỏ).
    const q = query.q?.trim().toLowerCase();
    if (!q) return views;
    const digits = q.replace(/\D/g, '');
    return views.filter(
      (v) =>
        v.fullName?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        (digits.length >= 3 && v.phone?.replace(/\D/g, '').includes(digits)),
    );
  }

  async detail(id: string) {
    const row = await this.load(id);
    const groups = await this.prisma.dispatchTicket.groupBy({ by: ['status'], where: { hostId: id }, _count: true });
    const ticketStats = Object.fromEntries(TICKET_KEYS.map((k) => [k, 0])) as Record<TicketStatus, number>;
    for (const g of groups) ticketStats[g.status] = g._count;
    const stats = (await this.statsFor([id])).get(id)!;
    return { ...this.toView(row), ticketStats, stats };
  }

  /** Số liệu theo lô cho nhiều Host: mỗi bảng đúng một truy vấn, không N+1. */
  async statsFor(hostIds: string[], now: Date = new Date()): Promise<Map<string, HostStats>> {
    const out = new Map<string, HostStats>(
      hostIds.map((id) => [
        id,
        { completedViewings: 0, openTickets: 0, deals: 0, avgAcceptSeconds: null, noShowRate: null, weekEarnings: 0 },
      ]),
    );
    if (hostIds.length === 0) return out;

    const [tickets, deposits, payouts] = await Promise.all([
      this.prisma.dispatchTicket.findMany({
        where: { hostId: { in: hostIds } },
        select: { hostId: true, status: true, offeredAt: true, acceptedAt: true, viewing: { select: { status: true } } },
      }),
      this.prisma.holdingDeposit.findMany({
        where: { attributedHostId: { in: hostIds }, paymentStatus: { in: [...DEAL_STATUSES] } },
        select: { attributedHostId: true },
      }),
      this.prisma.hostPayout.findMany({
        where: { hostId: { in: hostIds }, period: isoWeekPeriod(now) },
        select: { hostId: true, amount: true },
      }),
    ]);

    const accept = new Map<string, { sum: number; n: number }>();
    const ended = new Map<string, { noShow: number; n: number }>();
    for (const t of tickets as any[]) {
      const s = out.get(t.hostId);
      if (!s) continue;
      if (t.status === TicketStatus.COMPLETED) s.completedViewings += 1;
      if (ACTIVE_TICKETS.includes(t.status)) s.openTickets += 1;
      if (t.acceptedAt && t.offeredAt) {
        const a = accept.get(t.hostId) ?? { sum: 0, n: 0 };
        a.sum += Math.max(0, (new Date(t.acceptedAt).getTime() - new Date(t.offeredAt).getTime()) / 1000);
        a.n += 1;
        accept.set(t.hostId, a);
      }
      const vs = t.viewing?.status;
      if (vs === 'COMPLETED' || vs === 'NO_SHOW') {
        const e = ended.get(t.hostId) ?? { noShow: 0, n: 0 };
        e.n += 1;
        if (vs === 'NO_SHOW') e.noShow += 1;
        ended.set(t.hostId, e);
      }
    }
    for (const [id, a] of accept) out.get(id)!.avgAcceptSeconds = Math.round(a.sum / a.n);
    for (const [id, e] of ended) out.get(id)!.noShowRate = Math.round((e.noShow / e.n) * 1000) / 10;
    for (const d of deposits as any[]) {
      const s = out.get(d.attributedHostId);
      if (s) s.deals += 1;
    }
    for (const p of payouts as any[]) {
      const s = out.get(p.hostId);
      if (s) s.weekEarnings += Number(p.amount);
    }
    return out;
  }

  // ------------------------------------------------------------------ Tạo

  async create(dto: CreateFieldHostDto, actor: AuthenticatedUser, ctx: RequestContext) {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    const assignedZone = await this.assertZone(dto.assignedZone);
    const roles = normalizeHostRoles(dto.roles);
    // Băm scrypt TRƯỚC transaction: không giữ giao dịch mở trong lúc tính toán nặng.
    const passwordHash = dto.password ? await hashPassword(dto.password) : null;
    const roleId = await this.roleIds.idOf('field_host');

    let created: { hostId: string; profileId: string };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.profile.findUnique({
          where: { email },
          include: { role: true, hostProfile: { select: { id: true } } },
        });
        if (existing && existing.role.code !== 'field_host') throw authError('account_conflict');
        if (existing?.hostProfile) throw authError('host_already_exists');

        // Profile field_host "mồ côi" (vd. chỉnh `role_id` bằng tay, không có hồ sơ Host) ⇒ nhận vào, giữ nguyên id đăng nhập Google.
        let profileId: string;
        if (existing) {
          profileId = existing.id;
          await tx.profile.update({
            where: { id: profileId },
            data: { fullName, isActive: true, ...(passwordHash ? { passwordHash } : {}) },
          });
        } else {
          profileId = randomUUID();
          await tx.profile.create({ data: { id: profileId, roleId, email, fullName, passwordHash } });
        }

        const host = await tx.fieldHost.create({
          data: { profileId, assignedZone, roles, dutyStatus: HostDutyStatus.OFF_DUTY },
        });
        await this.audit(tx, actor, ctx, 'HOST_CREATE', host.id, undefined, {
          email,
          fullName,
          assignedZone,
          roles: toHostRoleCodes(roles),
          adoptedProfile: Boolean(existing),
          passwordSet: Boolean(passwordHash),
        });
        return { hostId: host.id, profileId };
      });
    } catch (err) {
      // Hai Admin tạo cùng email gần như đồng thời: bên kia thắng.
      if (isUniqueViolation(err)) throw authError('host_already_exists');
      throw err;
    }
    this.sessions.invalidate(created.profileId);
    return this.detail(created.hostId);
  }

  // ------------------------------------------------------------------ Sửa / khoá

  async update(id: string, dto: UpdateFieldHostDto, actor: AuthenticatedUser, ctx: RequestContext) {
    const { fullName, assignedZone, roles, password, isActive } = dto;
    if ([fullName, assignedZone, roles, password, isActive].every((v) => v === undefined)) throw authError('invalid_request');

    const normalizedRoles = roles !== undefined ? normalizeHostRoles(roles) : undefined;
    const host = await this.load(id);
    const zone = assignedZone !== undefined ? await this.assertZone(assignedZone) : undefined;
    const passwordHash = password ? await hashPassword(password) : undefined;

    const profileData: Prisma.ProfileUpdateInput = {};
    const hostData: Prisma.FieldHostUpdateInput = {};
    const oldGeneral: Record<string, unknown> = {};
    const newGeneral: Record<string, unknown> = {};

    if (fullName !== undefined && fullName !== (host.profile.fullName ?? '')) {
      profileData.fullName = fullName;
      oldGeneral.fullName = host.profile.fullName;
      newGeneral.fullName = fullName;
    }
    if (zone !== undefined && zone !== host.assignedZone) {
      hostData.assignedZone = zone;
      oldGeneral.assignedZone = host.assignedZone;
      newGeneral.assignedZone = zone;
    }
    if (passwordHash) {
      profileData.passwordHash = passwordHash;
      newGeneral.password = '<changed>'; // CẤM ghi giá trị hay hash vào log
    }
    const oldRoles = toHostRoleCodes(host.roles);
    const rolesChanged = normalizedRoles !== undefined && !sameRoles(toHostRoleCodes(normalizedRoles), oldRoles);
    if (rolesChanged) hostData.roles = normalizedRoles;
    const activeChanged = isActive !== undefined && isActive !== host.profile.isActive;
    if (activeChanged) {
      profileData.isActive = isActive;
      if (!isActive) hostData.dutyStatus = HostDutyStatus.OFF_DUTY;
    }

    const nothingChanged =
      !rolesChanged && !activeChanged && Object.keys(profileData).length === 0 && Object.keys(hostData).length === 0;
    if (nothingChanged) return this.detail(id);

    await this.prisma.$transaction(async (tx) => {
      if (activeChanged && !isActive) {
        const open = await tx.dispatchTicket.count({ where: { hostId: id, status: { in: ACTIVE_TICKETS } } });
        if (open > 0) throw authError('host_has_active_tickets');
      }
      if (Object.keys(profileData).length) await tx.profile.update({ where: { id: host.profileId }, data: profileData });
      if (Object.keys(hostData).length) await tx.fieldHost.update({ where: { id }, data: hostData });

      if (rolesChanged) {
        await this.audit(tx, actor, ctx, 'HOST_ROLES_UPDATE', id, { roles: oldRoles }, { roles: normalizedRoles && toHostRoleCodes(normalizedRoles) });
      }
      if (Object.keys(newGeneral).length) await this.audit(tx, actor, ctx, 'HOST_UPDATE', id, oldGeneral, newGeneral);
      if (activeChanged) {
        await this.audit(tx, actor, ctx, isActive ? 'HOST_REACTIVATE' : 'HOST_DEACTIVATE', id, { isActive: !isActive }, { isActive });
      }
    });
    this.sessions.invalidate(host.profileId);
    return this.detail(id);
  }

  /** Khoá mềm (idempotent): Profile `isActive=false` ⇒ đăng nhập trả `account_suspended`, phiên đang có bị xoá. */
  deactivate(id: string, actor: AuthenticatedUser, ctx: RequestContext) {
    return this.update(id, { isActive: false }, actor, ctx);
  }

  // ------------------------------------------------------------------ nội bộ

  private async load(id: string): Promise<HostRow> {
    const row = await this.prisma.fieldHost.findUnique({ where: { id }, include: HOST_INCLUDE });
    if (!row) throw authError('host_not_found');
    return row;
  }

  /** Phân khu hợp lệ = có ít nhất một toà nhà thuộc phân khu đó. */
  private async assertZone(zone: string): Promise<string> {
    const name = zone.trim();
    const found = await this.prisma.building.findFirst({ where: { zoneName: name }, select: { id: true } });
    if (!found) throw authError('invalid_zone');
    return name;
  }

  private audit(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedUser,
    ctx: RequestContext,
    actionType: string,
    entityId: string,
    oldValue: Record<string, unknown> | undefined,
    newValue: Record<string, unknown>,
  ) {
    return tx.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: 'ops_admin',
        actionType,
        entityName: 'field_hosts',
        entityId,
        oldValue: oldValue as Prisma.InputJsonValue | undefined,
        newValue: newValue as Prisma.InputJsonValue,
        ipAddress: ctx.ipAddress?.slice(0, 45),
        userAgent: ctx.userAgent,
      },
    });
  }

  private toView(row: HostRow) {
    return {
      id: row.id,
      profileId: row.profileId,
      email: row.profile.email,
      fullName: row.profile.fullName,
      phone: decryptPhoneForDisplay(this.phones, row.profile.phoneEnc),
      isPhoneVerified: row.profile.isPhoneVerified,
      assignedZone: row.assignedZone,
      roles: toHostRoleCodes(row.roles),
      dutyStatus: row.dutyStatus,
      rating: Number(row.rating),
      isActive: row.profile.isActive,
      hasPassword: Boolean(row.profile.passwordHash),
      lastLoginAt: row.profile.lastLoginAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
