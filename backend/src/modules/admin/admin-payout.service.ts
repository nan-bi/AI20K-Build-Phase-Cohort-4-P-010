import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdminActor } from './admin-fee.service';
import { roundVnd } from './money.util';

const ICT_OFFSET_MIN = 7 * 60;
const PERIOD_RE = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;
const SWEEP_LIMIT = 500;

type Fees = Record<string, Prisma.Decimal>;

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
export class AdminPayoutService {
  private readonly logger = new Logger(AdminPayoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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

  /** B + C: hoa hồng cọc và thưởng 5 sao khi cọc PAID_HOLDING. Idempotent theo transRef. */
  async accrueDeposit(depositId: string): Promise<number> {
    const dep: any = await this.prisma.holdingDeposit.findUnique({
      where: { id: depositId },
      include: { viewing: { select: { id: true, tenantRating: true } } },
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
    if (dep.viewing?.tenantRating === 5 && star) {
      const bonus = roundVnd(deal.mul(star.sub(1)));
      if (bonus.gt(0)) {
        if (await this.record(dep.attributedHostId, `deposit:${depositId}:rating`, bonus, period, {
          kind: 'RATING_BONUS',
          dealCommission: deal.toNumber(),
          ratingMultiplier: star.toNumber(),
        })) count++;
      }
    }
    return count;
  }

  /** Quét các sự kiện đã đủ điều kiện nhưng chưa có khoản; cấu hình áp dụng là cấu hình lúc quét. */
  async sweep(actor: AdminActor) {
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

    let created = 0;
    for (const v of viewings) created += await this.accrueViewing(v.id);
    for (const d of deposits) created += await this.accrueDeposit(d.id);

    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'PAYOUT_SWEEP',
      entityName: 'HostPayout',
      entityId: 'sweep',
      newValue: { viewingsScanned: viewings.length, depositsScanned: deposits.length, created },
    });
    return { viewingsScanned: viewings.length, depositsScanned: deposits.length, created };
  }

  async getWeeklyStatement(period?: string) {
    const p = this.resolvePeriod(period);
    const rows = await this.prisma.hostPayout.findMany({
      where: { period: p },
      orderBy: { createdAt: 'asc' },
      include: { host: { select: { profile: { select: { fullName: true } } } } },
    });
    const byHost = new Map<string, { fullName: string | null; total: Prisma.Decimal; count: number }>();
    for (const r of rows) {
      const cur = byHost.get(r.hostId) ?? {
        fullName: r.host.profile.fullName,
        total: new Prisma.Decimal(0),
        count: 0,
      };
      byHost.set(r.hostId, { fullName: cur.fullName, total: cur.total.add(r.amount), count: cur.count + 1 });
    }
    const hosts = [...byHost.entries()].map(([hostId, v]) => ({
      hostId,
      fullName: v.fullName,
      total: v.total.toNumber(),
      count: v.count,
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
