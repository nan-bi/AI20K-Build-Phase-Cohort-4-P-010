import { BadRequestException, ConflictException, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdminActor } from './admin-fee.service';
import { roundVnd } from './money.util';

const ICT_OFFSET_MIN = 7 * 60;
const PERIOD_RE = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;
const SWEEP_LIMIT = 500;
/** Host có điểm đánh giá trung bình từ mức này trở lên được nhân hệ số thưởng (Admin chốt: 4,8★ → ×hệ số; dưới đó ×1). */
export const RATING_BONUS_MIN_AVG = 4.8;
/** Thưởng nóng chiến dịch chỉ áp cho tối đa số deal này mỗi tuần ISO của mỗi Host. */
export const CAMPAIGN_MAX_DEALS_PER_WEEK = 3;
/** Chu kỳ tự quét ghi thu nhập (mili giây). Đặt PAYOUT_SWEEP_INTERVAL_MS=0 để tắt; test luôn tắt. */
export const DEFAULT_SWEEP_INTERVAL_MS = 5 * 60_000;

type Fees = Record<string, Prisma.Decimal>;

interface HostStatementAcc {
  fullName: string | null;
  rating: number | null;
  total: Prisma.Decimal;
  count: number;
  viewings: number;
  viewingFee: Prisma.Decimal;
  deals: number;
  commission: Prisma.Decimal;
  ratingBonus: Prisma.Decimal;
  campaignBonus: Prisma.Decimal;
  roles: string[];
  inspections: number;
  inspectionFee: Prisma.Decimal;
}

/** Tuần ISO 8601 (ví dụ 2026-W41) tính theo ngày lịch Asia/Ho_Chi_Minh. */
export function isoWeekPeriod(date: Date): string {
  const local = new Date(date.getTime() + ICT_OFFSET_MIN * 60_000);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

@Injectable()
export class AdminPayoutService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AdminPayoutService.name);
  private timer?: NodeJS.Timeout;
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Nghiệp vụ (ca xem xong, cọc được thu, phiếu thẩm định nộp) không gọi thẳng vào đây, nên thu nhập Host chỉ xuất hiện khi có
   * lượt quét. Quét định kỳ ở nền (idempotent theo transRef) để bảng kê và trang thu nhập luôn có số liệu mà không cần ai bấm tay.
   */
  onApplicationBootstrap() {
    const ms = Number(process.env.PAYOUT_SWEEP_INTERVAL_MS ?? DEFAULT_SWEEP_INTERVAL_MS);
    if (process.env.NODE_ENV === 'test' || !Number.isFinite(ms) || ms <= 0) return;
    this.timer = setInterval(() => void this.backgroundSweep(), ms);
    this.timer.unref();
    void this.backgroundSweep();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async backgroundSweep() {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      const r = await this.collect();
      if (r.created > 0) {
        await this.audit.log({
          actorRole: 'system',
          actionType: 'PAYOUT_SWEEP',
          entityName: 'HostPayout',
          entityId: 'auto',
          newValue: r,
        } as any);
      }
    } catch (err) {
      this.logger.warn(`Tự quét thu nhập Host lỗi: ${(err as Error).message}`);
    } finally {
      this.sweeping = false;
    }
  }

  /** A: thù lao dẫn khi Viewing COMPLETED. Idempotent theo transRef `viewing:<id>`. */
  async accrueViewing(viewingId: string): Promise<number> {
    const viewing: any = await this.prisma.viewing.findUnique({
      where: { id: viewingId },
      include: { tickets: { orderBy: { offeredAt: 'desc' } } },
    });
    if (!viewing || viewing.status !== 'COMPLETED') return 0;
    const ticket = (viewing.tickets ?? []).find(
      (t: any) => t.hostId && ['ACCEPTED', 'CHECKED', 'COMPLETED'].includes(t.status),
    );
    if (!ticket) return 0;

    const fees = await this.loadFees();
    const base = this.requireFee(fees, 'host_base_viewing_fee');
    const multiplier = this.isPeakHour(viewing.viewingSlot, fees) ? fees.host_peak_hour_multiplier : undefined;
    const amount = roundVnd(multiplier ? base.mul(multiplier) : base);

    const period = isoWeekPeriod(viewing.completedAt ?? viewing.viewingSlot);
    const created = await this.record(ticket.hostId, `viewing:${viewingId}`, amount, period, {
      kind: 'VIEWING_FEE',
      base: base.toNumber(),
      peakMultiplier: multiplier?.toNumber() ?? 1,
    });
    return created ? 1 : 0;
  }

  /** B + C: hoa hồng cọc và thưởng đánh giá (Host ≥ 4,8★ trung bình) khi cọc PAID_HOLDING. Idempotent theo transRef. */
  async accrueDeposit(depositId: string): Promise<number> {
    const dep: any = await this.prisma.holdingDeposit.findUnique({
      where: { id: depositId },
      include: { viewing: { select: { id: true } } },
    });
    if (!dep || !dep.attributedHostId) return 0;
    if (!['PAID_HOLDING', 'CONVERTED_TO_CONTRACT'].includes(dep.paymentStatus)) return 0;

    const fees = await this.loadFees();
    const deal = this.requireFee(fees, 'host_deal_commission');
    const period = isoWeekPeriod(dep.paidAt ?? new Date());
    let count = 0;

    if (await this.record(dep.attributedHostId, `deposit:${depositId}`, roundVnd(deal), period, {
      kind: 'DEAL_COMMISSION',
      dealCommission: deal.toNumber(),
    })) count++;

    const star = fees.host_rating_multiplier_5star;
    if (star && (await this.hostAverageRating(dep.attributedHostId)) >= RATING_BONUS_MIN_AVG) {
      const bonus = roundVnd(deal.mul(star.sub(1)));
      if (bonus.gt(0)) {
        if (await this.record(dep.attributedHostId, `deposit:${depositId}:rating`, bonus, period, {
          kind: 'RATING_BONUS',
          dealCommission: deal.toNumber(),
          ratingMultiplier: star.toNumber(),
        })) count++;
      }
    }

    // Thưởng nóng chiến dịch: cộng thêm cho mỗi deal, tối đa CAMPAIGN_MAX_DEALS_PER_WEEK deal/tuần/Host; cấu hình 0 hoặc thiếu = tắt.
    const campaign = fees.host_campaign_bonus;
    if (campaign && campaign.gt(0) && (await this.dealsInPeriod(dep.attributedHostId, period)) <= CAMPAIGN_MAX_DEALS_PER_WEEK) {
      if (await this.record(dep.attributedHostId, `deposit:${depositId}:campaign`, roundVnd(campaign), period, {
        kind: 'CAMPAIGN_BONUS',
        campaignBonus: campaign.toNumber(),
        maxDealsPerWeek: CAMPAIGN_MAX_DEALS_PER_WEEK,
      })) count++;
    }
    return count;
  }

  /** Số deal (hoa hồng cọc) Host đã được ghi trong tuần, tính cả deal vừa ghi. Khoản `deposit:<id>` — không hậu tố. */
  private async dealsInPeriod(hostId: string, period: string): Promise<number> {
    const rows: Array<{ transRef: string | null }> = await this.prisma.hostPayout.findMany({
      where: { hostId, period, transRef: { startsWith: 'deposit:' } },
      select: { transRef: true },
    });
    return rows.filter((r) => (r.transRef ?? '').startsWith('deposit:') && (r.transRef ?? '').split(':').length === 2).length;
  }

  /**
   * Điểm trung bình khách đã chấm cho Host (mỗi lịch xem tính một lần). Tính trực tiếp từ đánh giá thật vì cột
   * `FieldHost.rating` không được cập nhật từ đánh giá (luôn là 5,00 mặc định). Chưa có đánh giá nào ⇒ 0 (không thưởng).
   */
  async hostAverageRating(hostId: string): Promise<number> {
    const tickets: any[] = await this.prisma.dispatchTicket.findMany({
      where: { hostId, viewing: { tenantRating: { not: null } } },
      select: { viewingId: true, viewing: { select: { tenantRating: true } } },
    });
    const byViewing = new Map<string, number>();
    for (const t of tickets) {
      if (t.viewing?.tenantRating != null) byViewing.set(t.viewingId, Number(t.viewing.tenantRating));
    }
    if (byViewing.size === 0) return 0;
    const sum = [...byViewing.values()].reduce((a, b) => a + b, 0);
    return sum / byViewing.size;
  }

  /**
   * Thù lao thẩm định ký gửi: ghi MỘT khoản cho Host đã nộp phiếu thẩm định của hồ sơ ủy quyền, bất kể kết luận (đạt/không đạt) —
   * công việc thực địa đã làm xong. transRef `inspection:<mandateId>` ⇒ idempotent. Chưa cấu hình `host_inspection_fee` ⇒ bỏ qua.
   */
  async accrueInspection(mandateId: string, submitterProfileId: string, at: Date = new Date()): Promise<number> {
    const host: any = await this.prisma.fieldHost.findUnique({ where: { profileId: submitterProfileId } });
    if (!host) return 0;
    const fees = await this.loadFees();
    const fee = fees.host_inspection_fee;
    if (!fee || !fee.gt(0)) return 0;
    const created = await this.record(host.id, `inspection:${mandateId}`, roundVnd(fee), isoWeekPeriod(at), {
      kind: 'INSPECTION_FEE',
      inspectionFee: fee.toNumber(),
      mandateId,
    });
    return created ? 1 : 0;
  }

  /** Quét các sự kiện đã đủ điều kiện nhưng chưa có khoản; cấu hình áp dụng là cấu hình lúc quét. Có ghi audit người bấm. */
  async sweep(actor: AdminActor) {
    const result = await this.collect();
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'PAYOUT_SWEEP',
      entityName: 'HostPayout',
      entityId: 'sweep',
      newValue: result,
    });
    return result;
  }

  /** Một khoản lỗi nghiệp vụ (vd. thiếu cấu hình) chỉ bị bỏ qua và đếm, không làm hỏng cả lượt quét. */
  private async collect() {
    const viewings = await this.prisma.viewing.findMany({
      where: { status: 'COMPLETED' },
      select: { id: true },
      orderBy: { completedAt: 'desc' },
      take: SWEEP_LIMIT,
    });
    const deposits = await this.prisma.holdingDeposit.findMany({
      where: { paymentStatus: { in: ['PAID_HOLDING', 'CONVERTED_TO_CONTRACT'] }, attributedHostId: { not: null } },
      select: { id: true },
      orderBy: { paidAt: 'desc' },
      take: SWEEP_LIMIT,
    });
    const inspections: Array<{ entityId: string; actorId: string; createdAt: Date }> = await this.prisma.auditLog.findMany({
      where: { actionType: 'INSPECTION_SUBMITTED' },
      select: { entityId: true, actorId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: SWEEP_LIMIT,
    });

    let created = 0;
    let skipped = 0;
    const run = async (fn: () => Promise<number>) => {
      try {
        created += await fn();
      } catch (err) {
        if (!(err instanceof ConflictException)) throw err;
        skipped += 1;
      }
    };
    for (const v of viewings) await run(() => this.accrueViewing(v.id));
    for (const d of deposits) await run(() => this.accrueDeposit(d.id));
    for (const i of inspections) await run(() => this.accrueInspection(i.entityId, i.actorId, i.createdAt));

    return {
      viewingsScanned: viewings.length,
      depositsScanned: deposits.length,
      inspectionsScanned: inspections.length,
      created,
      skipped,
    };
  }

  async getWeeklyStatement(period?: string) {
    const p = this.resolvePeriod(period);
    const rows = await this.prisma.hostPayout.findMany({
      where: { period: p },
      orderBy: { createdAt: 'asc' },
      include: { host: { select: { rating: true, roles: true, profile: { select: { fullName: true } } } } },
    });
    const zero = () => new Prisma.Decimal(0);
    const byHost = new Map<string, HostStatementAcc>();
    for (const r of rows) {
      const cur = byHost.get(r.hostId) ?? {
        fullName: r.host?.profile?.fullName ?? null,
        rating: r.host?.rating != null ? Number(r.host.rating) : null,
        total: zero(),
        count: 0,
        viewings: 0,
        viewingFee: zero(),
        deals: 0,
        commission: zero(),
        ratingBonus: zero(),
        campaignBonus: zero(),
        roles: ((r.host as any)?.roles ?? []).map((x: string) => String(x).toLowerCase()),
        inspections: 0,
        inspectionFee: zero(),
      };
      cur.total = cur.total.add(r.amount);
      cur.count += 1;
      // Loại khoản suy từ transRef (xem accrueViewing/accrueDeposit): viewing:<id> · deposit:<id> · deposit:<id>:rating · deposit:<id>:campaign · inspection:<mandateId>
      const ref = r.transRef ?? '';
      if (ref.startsWith('viewing:')) {
        cur.viewings += 1;
        cur.viewingFee = cur.viewingFee.add(r.amount);
      } else if (ref.startsWith('inspection:')) {
        cur.inspections += 1;
        cur.inspectionFee = cur.inspectionFee.add(r.amount);
      } else if (ref.startsWith('deposit:') && ref.endsWith(':campaign')) {
        cur.campaignBonus = cur.campaignBonus.add(r.amount);
      } else if (ref.startsWith('deposit:') && ref.endsWith(':rating')) {
        cur.ratingBonus = cur.ratingBonus.add(r.amount);
      } else if (ref.startsWith('deposit:')) {
        cur.deals += 1;
        cur.commission = cur.commission.add(r.amount);
      }
      byHost.set(r.hostId, cur);
    }
    const hosts = [...byHost.entries()].map(([hostId, v]) => ({
      hostId,
      fullName: v.fullName,
      rating: v.rating,
      total: v.total.toNumber(),
      count: v.count,
      viewings: v.viewings,
      viewingFee: v.viewingFee.toNumber(),
      deals: v.deals,
      commission: v.commission.toNumber(),
      ratingBonus: v.ratingBonus.toNumber(),
      campaignBonus: v.campaignBonus.toNumber(),
      roles: v.roles,
      inspections: v.inspections,
      inspectionFee: v.inspectionFee.toNumber(),
    }));
    const grandTotal = hosts.reduce((s, h) => s.add(h.total), new Prisma.Decimal(0)).toNumber();
    return { period: p, hosts, grandTotal };
  }

  async toCsv(period?: string, actor?: AdminActor): Promise<string> {
    const p = this.resolvePeriod(period);
    const rows = await this.prisma.hostPayout.findMany({ where: { period: p }, orderBy: { createdAt: 'asc' } });
    const lines = [['hostId', 'period', 'transRef', 'amount', 'status'].join(',')];
    for (const r of rows) {
      lines.push(
        [r.hostId, r.period, r.transRef ?? '', new Prisma.Decimal(r.amount).toFixed(0), r.status].map(csvCell).join(','),
      );
    }
    if (actor) {
      await this.audit.log({
        actorId: actor.id,
        actorRole: actor.role,
        actionType: 'PAYOUT_CSV_EXPORT',
        entityName: 'HostPayout',
        entityId: p,
        newValue: { rows: rows.length },
      });
    }
    return '\uFEFF' + lines.join('\r\n') + '\r\n';
  }

  private resolvePeriod(period?: string): string {
    if (!period) return isoWeekPeriod(new Date());
    if (!PERIOD_RE.test(period)) throw new BadRequestException('period phải có dạng YYYY-Www (tuần ISO), ví dụ 2026-W41');
    return period;
  }

  private async loadFees(): Promise<Fees> {
    const rows = await this.prisma.feeConfig.findMany();
    const fees: Fees = {};
    for (const r of rows) fees[r.configKey] = new Prisma.Decimal(r.paramValue as any);
    return fees;
  }

  private requireFee(fees: Fees, key: string): Prisma.Decimal {
    const v = fees[key];
    if (!v) throw new ConflictException(`Thiếu cấu hình biến phí: ${key}`);
    return v;
  }

  /** Giờ vàng: [start, end) theo Asia/Ho_Chi_Minh; thiếu một trong các khóa cấu hình ⇒ không áp dụng. */
  private isPeakHour(slot: Date, fees: Fees): boolean {
    const { host_peak_hour_start: start, host_peak_hour_end: end, host_peak_hour_multiplier: mult } = fees;
    if (!start || !end || !mult) return false;
    const local = new Date(new Date(slot).getTime() + ICT_OFFSET_MIN * 60_000);
    const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
    return minutes >= start.mul(60).toNumber() && minutes < end.mul(60).toNumber();
  }

  /** Ghi HostPayout và cộng ví trong cùng transaction; trả false nếu transRef đã tồn tại. */
  private async record(
    hostId: string,
    transRef: string,
    amount: Prisma.Decimal,
    period: string,
    detail: Record<string, unknown>,
  ): Promise<boolean> {
    const created = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.hostPayout.findFirst({ where: { transRef } });
      if (existing) return false;
      await tx.hostPayout.create({ data: { hostId, amount, period, status: 'PENDING', transRef } });
      await tx.fieldHost.update({ where: { id: hostId }, data: { walletBalance: { increment: amount } } });
      return true;
    });
    if (created) {
      await this.audit.log({
        actorRole: 'system',
        actionType: 'HOST_PAYOUT_ACCRUED',
        entityName: 'HostPayout',
        entityId: transRef,
        newValue: { hostId, transRef, period, amount: amount.toNumber(), ...detail },
      });
    }
    return created;
  }
}

function csvCell(value: string): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
