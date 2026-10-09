import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Sổ hợp đồng hợp nhất cho Admin: 4 loại văn bản đọc thẳng từ bảng thật, không bảng mới.
 *   mandate     ← ExclusiveMandate (HĐ ký gửi độc quyền, legal/01)
 *   holding     ← HoldingDeposit   (thoả thuận cọc giữ chỗ 2.000.000đ, legal/02)
 *   lease       ← Contract         (HĐ thuê, legal/06)
 *   partnership ← FieldHost        (thoả thuận đối tác Field Host, legal/08)
 * `GET /admin/contracts` (chỉ HĐ thuê) giữ nguyên cho các màn đang dùng.
 */
export const CONTRACT_KINDS = ['mandate', 'holding', 'lease', 'partnership'] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';
type PartyRole = 'landlord' | 'tenant' | 'host' | 'platform';

export interface RegistryRow {
  /** `${kind}-${id}` — dùng làm đường dẫn chi tiết. */
  key: string;
  kind: ContractKind;
  id: string;
  docNumber: string;
  unitId: string | null;
  unitCode: string | null;
  /** Căn [Toà · Tầng · Căn] hoặc phân khu (đối tác Host). */
  scope: string;
  parties: { role: PartyRole; name: string; id?: string }[];
  status: string;
  statusLabel: string;
  tone: Tone;
  startAt: string | null;
  endAt: string | null;
  amount: number | null;
  amountLabel: string | null;
  /** Lý do cần Admin xử lý; null = không cần. */
  needsAction: string | null;
  createdAt: string;
}

export interface RegistryDetail extends RegistryRow {
  facts: { label: string; value: string }[];
  timeline: { label: string; at: string | null }[];
  evidence: {
    sha256: string | null;
    tsaTime: string | null;
    signatures: { role: string; method: string; signedAt: string }[];
  } | null;
  hostId: string | null;
}

const DAY_MS = 86_400_000;
const PLATFORM = { role: 'platform' as const, name: 'VinStay AI' };

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);
const money = (n: unknown) => new Intl.NumberFormat('vi-VN').format(Number(n ?? 0)) + 'đ';
const dateVi = (d: Date | string | null | undefined) =>
  d ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(d)) : '—';

/**
 * Cọc giữ chỗ chuyển đổi 100% thành MỘT PHẦN của Tiền cọc bảo đảm (không phải khoản cọc thứ hai, không trừ tiền thuê tháng đầu).
 * Phần còn lại là số khách nộp thêm khi ký hợp đồng thuê.
 */
export function depositBreakdown(security: unknown, converted: unknown): string {
  const total = Number(security ?? 0);
  if (converted == null) return `${money(total)} (chưa ghi nhận cọc giữ chỗ chuyển đổi)`;
  const held = Number(converted);
  const extra = Math.max(0, total - held);
  return extra > 0
    ? `${money(held)} cọc giữ chỗ (chuyển đổi 100%) + ${money(extra)} nộp thêm khi ký = ${money(total)}`
    : `${money(held)} cọc giữ chỗ chuyển đổi 100%, không phải nộp thêm`;
}

const unitScope = (u: any) =>
  u ? `${u.building?.buildingCode ?? ''} · Tầng ${u.floorNumber} · Căn ${u.doorNumber ?? '—'}` : '—';

const MANDATE_STATUS: Record<string, [string, Tone]> = {
  PENDING_INSPECTION: ['Chờ thẩm định', 'warn'],
  ACTIVE: ['Đang hiệu lực', 'ok'],
  EXIT_REQUESTED: ['Đang thoát 15 ngày', 'warn'],
  TERMINATED: ['Đã chấm dứt', 'neutral'],
  EXPIRED: ['Hết hạn', 'neutral'],
};
const DEPOSIT_STATUS: Record<string, [string, Tone]> = {
  PENDING_PAYMENT: ['Chờ chuyển khoản', 'info'],
  QR_EXPIRED: ['Mã QR hết hạn', 'neutral'],
  UNC_PENDING_REVIEW: ['Chờ duyệt UNC', 'warn'],
  PAID_HOLDING: ['Đang giữ căn', 'ok'],
  CONVERTED_TO_CONTRACT: ['Đã chuyển thành cọc HĐ', 'ok'],
  REFUNDED: ['Đã hoàn cọc', 'neutral'],
  FORFEITED: ['Mất cọc', 'danger'],
};
const LEASE_STATUS: Record<string, [string, Tone]> = {
  DRAFT: ['Bản nháp', 'neutral'],
  AWAITING_TENANT_SIGN: ['Chờ khách ký', 'warn'],
  AWAITING_LANDLORD_SIGN: ['Chờ chủ nhà ký', 'warn'],
  ACTIVE: ['Đang hiệu lực', 'ok'],
  TERMINATED_SETTLED: ['Đã thanh lý', 'neutral'],
  DISPUTED: ['Đang tranh chấp', 'danger'],
};

const statusOf = (map: Record<string, [string, Tone]>, s: string): [string, Tone] => map[s] ?? [s, 'neutral'];

@Injectable()
export class AdminContractRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(now: Date = new Date()): Promise<RegistryRow[]> {
    const [mandates, deposits, leases, hosts] = await Promise.all([
      this.prisma.exclusiveMandate.findMany({ include: this.mandateInclude, orderBy: { createdAt: 'desc' } }),
      this.prisma.holdingDeposit.findMany({ include: this.depositInclude, orderBy: { createdAt: 'desc' } }),
      this.prisma.contract.findMany({ include: this.leaseInclude, orderBy: { createdAt: 'desc' } }),
      this.prisma.fieldHost.findMany({ include: this.hostInclude, orderBy: { createdAt: 'desc' } }),
    ]);
    return [
      ...mandates.map((m) => this.mandateRow(m, now)),
      ...deposits.map((d) => this.depositRow(d, now)),
      ...leases.map((c) => this.leaseRow(c, now)),
      ...hosts.map((h) => this.hostRow(h)),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async detail(kind: string, id: string, now: Date = new Date()): Promise<RegistryDetail> {
    if (!(CONTRACT_KINDS as readonly string[]).includes(kind)) throw new BadRequestException('Loại hợp đồng không hợp lệ.');
    const notFound = () => new NotFoundException('Không tìm thấy hợp đồng.');

    if (kind === 'mandate') {
      const m: any = await this.prisma.exclusiveMandate.findUnique({ where: { id }, include: { ...this.mandateInclude, document: { include: { signatures: true } } } });
      if (!m) throw notFound();
      const row = this.mandateRow(m, now);
      return {
        ...row,
        facts: [
          { label: 'Số hợp đồng', value: m.contractNumber },
          { label: 'Căn hộ', value: `${row.scope} (${m.unit.unitCode})` },
          { label: 'Chủ nhà', value: m.unit.landlord?.fullName ?? '—' },
          { label: 'Giá thuê niêm yết', value: money(m.unit.baseRentPrice) },
          { label: 'Hiệu lực đến', value: dateVi(m.validUntil) },
          { label: 'Điều khoản thoát', value: 'Báo trước 15 ngày kèm trạng thái nhà trống' },
        ],
        timeline: [
          { label: 'Tạo hồ sơ ký gửi', at: iso(m.createdAt) },
          { label: 'Ký hợp đồng ký gửi', at: iso(m.signedAt) },
          { label: 'Chủ nhà yêu cầu thoát', at: iso(m.exitRequestedAt) },
          { label: 'Đủ 15 ngày báo trước', at: iso(m.exitEffectiveAt) },
        ],
        evidence: this.evidence(m.document),
        hostId: null,
      };
    }

    if (kind === 'holding') {
      const d: any = await this.prisma.holdingDeposit.findUnique({ where: { id }, include: { ...this.depositInclude, agreementDoc: { include: { signatures: true } } } });
      if (!d) throw notFound();
      const row = this.depositRow(d, now);
      return {
        ...row,
        facts: [
          { label: 'Mã cọc', value: d.depositCode },
          { label: 'Căn hộ', value: `${row.scope} (${d.unit.unitCode})` },
          { label: 'Khách thuê', value: d.viewing?.tenant?.fullName ?? d.viewing?.contactName ?? '—' },
          { label: 'Host chốt cọc', value: d.attributedHost?.profile?.fullName ?? 'Chưa gán' },
          { label: 'Số tiền', value: money(d.amount) },
          { label: 'Nội dung chuyển khoản', value: d.transferContent ?? d.vietqrRef },
          { label: 'Phiên bản điều khoản', value: d.termsVersion ?? '—' },
          { label: 'Khi ký HĐ thuê', value: 'Chuyển 100% thành Tiền cọc bảo đảm, không trừ tiền thuê tháng đầu' },
        ],
        timeline: [
          { label: 'Tạo mã VietQR', at: iso(d.createdAt) },
          { label: 'Khách chấp thuận điều khoản cọc', at: iso(d.termsAcceptedAt) },
          { label: 'Gạch nợ — khoá căn', at: iso(d.paidAt) },
          { label: 'Hết hạn giữ căn', at: iso(d.expiresAt) },
        ],
        evidence: this.evidence(d.agreementDoc),
        hostId: d.attributedHostId ?? null,
      };
    }

    if (kind === 'lease') {
      const c: any = await this.prisma.contract.findUnique({ where: { id }, include: { ...this.leaseInclude, document: { include: { signatures: true } } } });
      if (!c) throw notFound();
      const row = this.leaseRow(c, now);
      return {
        ...row,
        facts: [
          { label: 'Số hợp đồng', value: c.contractNumber },
          { label: 'Căn hộ', value: `${row.scope} (${c.unit.unitCode})` },
          { label: 'Khách thuê', value: c.tenant?.fullName ?? '—' },
          { label: 'Chủ nhà', value: c.landlord?.fullName ?? '—' },
          { label: 'Kỳ hạn', value: `${c.leaseTermMonths} tháng · ${dateVi(c.startDate)} → ${dateVi(c.endDate)}` },
          { label: 'Tiền thuê/tháng', value: money(c.monthlyRentPrice) },
          { label: 'Chu kỳ thanh toán', value: `${c.paymentCycleMonths} tháng/lần` },
          { label: 'Tiền cọc bảo đảm', value: money(c.securityDepositAmount) },
          { label: 'Cấu thành tiền cọc', value: depositBreakdown(c.securityDepositAmount, c.convertedHoldingAmount) },
        ],
        timeline: [
          { label: 'Tạo hợp đồng', at: iso(c.createdAt) },
          { label: 'Ký số hoàn tất', at: iso(c.signedAt) },
          { label: 'Bắt đầu thuê', at: iso(c.startDate) },
          { label: 'Kết thúc thuê', at: iso(c.endDate) },
        ],
        evidence: this.evidence(c.document),
        hostId: null,
      };
    }

    const h: any = await this.prisma.fieldHost.findUnique({ where: { id }, include: this.hostInclude });
    if (!h) throw notFound();
    const row = this.hostRow(h);
    return {
      ...row,
      facts: [
        { label: 'Field Host', value: h.profile?.fullName ?? h.profile?.email ?? '—' },
        { label: 'Email đăng nhập', value: h.profile?.email ?? '—' },
        { label: 'Phân khu phụ trách', value: h.assignedZone },
        { label: 'Vai', value: (h.roles ?? []).map((r: string) => (r === 'SALE' ? 'Sale' : 'Thẩm định')).join(' + ') },
        { label: 'Thù lao', value: 'Biến phí theo cấu hình Admin (không lương cứng)' },
        { label: 'Đánh giá', value: `${Number(h.rating)}★` },
      ],
      timeline: [{ label: 'Admin tạo tài khoản đối tác', at: iso(h.createdAt) }],
      evidence: null,
      hostId: h.id,
    };
  }

  // ------------------------------------------------------------------ dựng hàng

  private readonly mandateInclude = { unit: { include: { building: true, landlord: true } } } as const;
  private readonly depositInclude = {
    unit: { include: { building: true } },
    viewing: { include: { tenant: true } },
    attributedHost: { include: { profile: true } },
  } as const;
  private readonly leaseInclude = { unit: { include: { building: true } }, tenant: true, landlord: true } as const;
  private readonly hostInclude = { profile: true } as const;

  private mandateRow(m: any, now: Date): RegistryRow {
    const [statusLabel, tone] = statusOf(MANDATE_STATUS, m.status);
    const exitDue = m.status === 'EXIT_REQUESTED' && m.exitEffectiveAt && new Date(m.exitEffectiveAt) <= now;
    return {
      key: `mandate-${m.id}`,
      kind: 'mandate',
      id: m.id,
      docNumber: m.contractNumber,
      unitId: m.unit?.id ?? m.unitId,
      unitCode: m.unit?.unitCode ?? null,
      scope: unitScope(m.unit),
      parties: [{ role: 'landlord', name: m.unit?.landlord?.fullName ?? 'Chủ nhà', id: m.unit?.landlordId }, PLATFORM],
      status: m.status,
      statusLabel,
      tone,
      startAt: iso(m.signedAt),
      endAt: iso(m.status === 'EXIT_REQUESTED' ? m.exitEffectiveAt : m.validUntil),
      amount: null,
      amountLabel: null,
      needsAction: exitDue
        ? 'Đủ 15 ngày báo trước — hoàn tất thoát uỷ quyền'
        : m.status === 'PENDING_INSPECTION'
          ? 'Chờ Host thẩm định căn'
          : null,
      createdAt: iso(m.createdAt)!,
    };
  }

  private depositRow(d: any, now: Date): RegistryRow {
    const [statusLabel, tone] = statusOf(DEPOSIT_STATUS, d.paymentStatus);
    const expiringSoon =
      d.paymentStatus === 'PAID_HOLDING' && d.expiresAt && new Date(d.expiresAt).getTime() - now.getTime() <= DAY_MS;
    const tenant = d.viewing?.tenant;
    const parties: RegistryRow['parties'] = [
      { role: 'tenant', name: tenant?.fullName ?? d.viewing?.contactName ?? 'Khách thuê', id: tenant?.id },
      PLATFORM,
    ];
    if (d.attributedHost) parties.push({ role: 'host', name: d.attributedHost.profile?.fullName ?? 'Field Host', id: d.attributedHost.id });
    return {
      key: `holding-${d.id}`,
      kind: 'holding',
      id: d.id,
      docNumber: d.depositCode,
      unitId: d.unit?.id ?? d.unitId,
      unitCode: d.unit?.unitCode ?? null,
      scope: unitScope(d.unit),
      parties,
      status: d.paymentStatus,
      statusLabel,
      tone,
      startAt: iso(d.paidAt),
      endAt: iso(d.expiresAt),
      amount: Number(d.amount),
      amountLabel: 'Cọc giữ chỗ',
      needsAction:
        d.paymentStatus === 'UNC_PENDING_REVIEW'
          ? 'Duyệt uỷ nhiệm chi thủ công'
          : expiringSoon
            ? 'Hết hạn giữ căn trong 24 giờ — nhắc ký HĐ thuê'
            : null,
      createdAt: iso(d.createdAt)!,
    };
  }

  private leaseRow(c: any, now: Date): RegistryRow {
    const [statusLabel, tone] = statusOf(LEASE_STATUS, c.status);
    const left = c.endDate ? new Date(c.endDate).getTime() - now.getTime() : Infinity;
    const expiring = c.status === 'ACTIVE' && left >= 0 && left <= 30 * DAY_MS;
    return {
      key: `lease-${c.id}`,
      kind: 'lease',
      id: c.id,
      docNumber: c.contractNumber,
      unitId: c.unit?.id ?? c.unitId,
      unitCode: c.unit?.unitCode ?? null,
      scope: unitScope(c.unit),
      parties: [
        { role: 'landlord', name: c.landlord?.fullName ?? 'Chủ nhà', id: c.landlordId },
        { role: 'tenant', name: c.tenant?.fullName ?? 'Khách thuê', id: c.tenantId },
      ],
      status: c.status,
      statusLabel,
      tone,
      startAt: iso(c.startDate),
      endAt: iso(c.endDate),
      amount: Number(c.monthlyRentPrice),
      amountLabel: 'Tiền thuê/tháng',
      needsAction: c.status === 'DISPUTED'
        ? 'Đang tranh chấp — đối soát Hộ chiếu bàn giao'
        : c.status === 'AWAITING_TENANT_SIGN' || c.status === 'AWAITING_LANDLORD_SIGN'
          ? `${statusLabel}`
          : expiring
            ? 'Hết hạn trong 30 ngày — nhắc gia hạn'
            : null,
      createdAt: iso(c.createdAt)!,
    };
  }

  private hostRow(h: any): RegistryRow {
    const active = h.profile?.isActive !== false;
    return {
      key: `partnership-${h.id}`,
      kind: 'partnership',
      id: h.id,
      // Chưa có số HĐ đối tác riêng trong DB ⇒ dùng mã hồ sơ Host (8 ký tự đầu id), ghi rõ ở UI.
      docNumber: `HOST-${String(h.id).slice(0, 8).toUpperCase()}`,
      unitId: null,
      unitCode: null,
      scope: h.assignedZone,
      parties: [{ role: 'host', name: h.profile?.fullName ?? h.profile?.email ?? 'Field Host', id: h.id }, PLATFORM],
      status: active ? 'ACTIVE' : 'SUSPENDED',
      statusLabel: active ? 'Đang hợp tác' : 'Tạm ngừng (đã khoá)',
      tone: active ? 'ok' : 'neutral',
      startAt: iso(h.createdAt),
      endAt: null,
      amount: null,
      amountLabel: null,
      needsAction: null,
      createdAt: iso(h.createdAt)!,
    };
  }

  private evidence(doc: any): RegistryDetail['evidence'] {
    if (!doc) return null;
    return {
      sha256: doc.sha256 ?? null,
      tsaTime: iso(doc.tsaTime),
      signatures: (doc.signatures ?? []).map((s: any) => ({ role: s.signerRole, method: s.method, signedAt: iso(s.signedAt)! })),
    };
  }
}
