import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContractStatus, DepositStatus, MandateStatus, Prisma, ViewingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PhoneService } from '../auth/phone/phone.service';
import { LandlordAccessService } from './landlord-access.service';
import { LandlordDirectoryService, HostEntry } from './landlord-directory.service';
import { LandlordFeeService } from './landlord-fee.service';
import {
  isConsigned,
  isUuid,
  mandateRenewsAt,
  maskPhone,
  toLayoutKind,
  toLockKind,
  toUiMandateStatus,
  toUiUnitStatus,
} from './landlord.mappers';

const LIVE_VIEWING = { status: ViewingStatus.CONFIRMED, lobbyCheckInAt: { not: null }, completedAt: null };

@Injectable()
export class LandlordUnitsService {
  private readonly logger = new Logger(LandlordUnitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LandlordAccessService,
    private readonly phones: PhoneService,
    private readonly fees: LandlordFeeService,
    private readonly directory: LandlordDirectoryService,
  ) {}

  /** Các căn đã ký gửi của chủ nhà. Căn còn là hồ sơ ký gửi (chờ thẩm định/duyệt) nằm ở `/landlord/consignments`. */
  async list(landlordId: string) {
    const units = await this.prisma.unit.findMany({
      where: { landlordId },
      orderBy: { createdAt: 'desc' },
      include: {
        building: true,
        mandates: { orderBy: { createdAt: 'desc' }, take: 1 },
        deposits: { where: { paymentStatus: DepositStatus.PAID_HOLDING }, orderBy: { paidAt: 'desc' }, take: 1 },
        contract: { where: { status: ContractStatus.ACTIVE }, take: 1 },
        media: { orderBy: { order: 'asc' }, take: 1 },
        viewings: { where: LIVE_VIEWING, select: { id: true } },
        _count: { select: { viewings: true } },
      },
    });

    return units
      .filter(isConsigned)
      .map((u) => {
        const mandate = u.mandates[0] ?? null;
        const lease = u.contract[0] ?? null;
        return {
          id: u.id,
          unitCode: u.unitCode,
          building: u.building.buildingCode,
          zone: u.building.zoneName,
          floor: u.floorNumber,
          layout: u.layoutType,
          layoutKind: toLayoutKind(u.layoutType),
          carpetAreaM2: Number(u.carpetAreaM2),
          baseRentPrice: Number(u.baseRentPrice),
          rent: lease ? Number(lease.monthlyRentPrice) : Number(u.baseRentPrice),
          status: toUiUnitStatus(u.status, u.viewings.length > 0),
          isVerified: u.isVerified,
          lock: toLockKind(u.doorLockType),
          thumbnailUrl: u.media[0]?.url ?? null,
          holdExpiresAt: u.deposits[0]?.expiresAt ?? null,
          totalViewings: u._count.viewings,
          mandate: mandate && {
            id: mandate.id,
            status: toUiMandateStatus(mandate.status),
            signedAt: mandate.signedAt,
            exitRequestedAt: mandate.exitRequestedAt,
            exitEffectiveAt: mandate.exitEffectiveAt,
          },
        };
      });
  }

  /**
   * Chi tiết một căn, GỒM luôn nhật ký xem phòng và nhật ký mở cửa — trang chi tiết cần cả ba, nên gom vào một
   * request. Mỗi lượt truy vấn tới DB tốn ~0,5–1 giây, vì vậy các truy vấn độc lập chạy SONG SONG: quyền sở hữu
   * được áp bằng điều kiện `landlordId` trong từng truy vấn, và nếu căn không thuộc chủ nhà này thì kết quả
   * bị bỏ và trả 404 (không lộ dữ liệu).
   * KHÔNG trả bản ghi DoorAccessKey — chủ nhà chỉ cần biết loại khóa, không cần (và không được) thấy mã.
   */
  async detail(landlordId: string, idOrCode: string, now = new Date()) {
    const scope = { landlordId, ...(isUuid(idOrCode) ? { id: idOrCode } : { unitCode: idOrCode }) };
    const [unit, lease, fee, hosts, viewings, doorAudit] = await Promise.all([
      this.prisma.unit.findFirst({
        where: scope,
        include: {
          building: true,
          mandates: { orderBy: { createdAt: 'desc' }, take: 1 },
          deposits: { where: { paymentStatus: DepositStatus.PAID_HOLDING }, orderBy: { paidAt: 'desc' }, take: 1 },
          media: { orderBy: { order: 'asc' } },
          viewings: { where: LIVE_VIEWING, select: { id: true } },
          _count: { select: { viewings: true } },
        },
      }),
      this.prisma.contract.findFirst({
        where: { status: ContractStatus.ACTIVE, unit: scope },
        include: { tenant: { select: { fullName: true } } },
      }),
      this.fees.get(),
      this.directory.hosts(),
      this.viewingEntries({ unit: scope }),
      // Nhật ký mở cửa tra theo id căn nên chỉ chạy song song được khi client đã gửi id; gửi mã căn thì tra sau.
      isUuid(idOrCode) ? this.doorAuditEntries(idOrCode) : Promise.resolve(null),
    ]);
    if (!unit) throw new NotFoundException('Không tìm thấy căn hộ');

    const mandate = unit.mandates[0] ?? null;
    const deposit = unit.deposits[0] ?? null;
    const host = this.directory.hostForZone(hosts, unit.building.zoneName);

    const base = Number(unit.baseRentPrice);
    const costs = {
      rent: base,
      managementFee: Number(unit.managementFee),
      parkingFeeEstimate: Number(unit.parkingFeeEstimate),
      utilityCostEstimate: Number(unit.utilityCostEstimate),
    };

    return {
      id: unit.id,
      unitCode: unit.unitCode,
      building: unit.building.buildingCode,
      zone: unit.building.zoneName,
      floor: unit.floorNumber,
      layout: unit.layoutType,
      layoutKind: toLayoutKind(unit.layoutType),
      carpetAreaM2: Number(unit.carpetAreaM2),
      status: toUiUnitStatus(unit.status, unit.viewings.length > 0),
      isVerified: unit.isVerified,
      lock: toLockKind(unit.doorLockType),
      media: unit.media.map((m) => ({ url: m.url, category: m.category, verifiedAt: m.verifiedAt })),
      baseRentPrice: base,
      rent: lease ? Number(lease.monthlyRentPrice) : base,
      allInCost: { ...costs, total: Object.values(costs).reduce((sum, v) => sum + v, 0) },
      totalViewings: unit._count.viewings,
      host: host ? { id: host.id, name: host.name } : null,
      mandate: mandate && {
        id: mandate.id,
        contractNumber: mandate.contractNumber,
        status: toUiMandateStatus(mandate.status),
        signedAt: mandate.signedAt,
        renewsAt: mandate.signedAt ? mandateRenewsAt(mandate.signedAt, now) : null,
        exitRequestedAt: mandate.exitRequestedAt,
        exitEffectiveAt: mandate.exitEffectiveAt,
      },
      holding: deposit && {
        amount: Number(deposit.amount),
        paidAt: deposit.paidAt,
        expiresAt: deposit.expiresAt,
      },
      lease: lease && {
        contractNumber: lease.contractNumber,
        tenantName: lease.tenant?.fullName ?? null,
        startDate: lease.startDate,
        endDate: lease.endDate,
        months: lease.leaseTermMonths,
        rent: Number(lease.monthlyRentPrice),
        serviceFee: fee.of(Number(lease.monthlyRentPrice)),
        landlordNet: Number(lease.monthlyRentPrice) - fee.of(Number(lease.monthlyRentPrice)),
        securityDeposit: Number(lease.securityDepositAmount),
      },
      viewings: this.withHostNames(viewings, hosts),
      doorAudit: doorAudit ?? (await this.doorAuditEntries(unit.id)),
    };
  }

  /** Nhật ký xem phòng của căn: ai xem, Host nào dẫn, đến sảnh/kết thúc lúc nào, kết quả. SĐT khách luôn bị che. */
  async viewingLog(landlordId: string, idOrCode: string) {
    const [unit, hosts] = await Promise.all([this.access.ownedUnit(landlordId, idOrCode), this.directory.hosts()]);
    return this.withHostNames(await this.viewingEntries({ unitId: unit.id }), hosts);
  }

  /** Nhật ký mở cửa: chỉ các lần Host xem mã cửa CỦA CĂN NÀY (lọc theo entityId, không lộ log căn khác). */
  async doorAuditTrail(landlordId: string, idOrCode: string) {
    const unit = await this.access.ownedUnit(landlordId, idOrCode);
    return this.doorAuditEntries(unit.id);
  }

  // ─── nội bộ ───────────────────────────────────────────────────────────────────────────────

  private async viewingEntries(where: Prisma.ViewingWhereInput) {
    const viewings = await this.prisma.viewing.findMany({
      where,
      orderBy: { viewingSlot: 'desc' },
      take: 100,
      include: {
        tenant: { select: { fullName: true, phoneEnc: true } },
        deposit: { select: { paymentStatus: true } },
        // Chỉ lấy hostId; tên Host tra từ danh bạ trong bộ nhớ (đỡ hai tầng truy vấn lồng nhau).
        tickets: { orderBy: { offeredAt: 'desc' }, take: 1, select: { hostId: true } },
      },
    });

    return viewings.map((v) => {
      const paid =
        v.deposit?.paymentStatus === DepositStatus.PAID_HOLDING ||
        v.deposit?.paymentStatus === DepositStatus.CONVERTED_TO_CONTRACT;
      const outcome = paid
        ? 'deposit'
        : v.status === ViewingStatus.NO_SHOW
          ? 'no_show'
          : v.status === ViewingStatus.CANCELLED
            ? 'cancelled'
            : v.status === ViewingStatus.COMPLETED
              ? 'not_decided'
              : v.lobbyCheckInAt
                ? 'in_progress'
                : 'scheduled';
      const durationMin =
        v.lobbyCheckInAt && v.completedAt
          ? Math.max(0, Math.round((v.completedAt.getTime() - v.lobbyCheckInAt.getTime()) / 60_000))
          : null;
      return {
        id: v.id,
        bookingRef: v.bookingRefCode,
        slot: v.viewingSlot,
        lobbyCheckInAt: v.lobbyCheckInAt,
        completedAt: v.completedAt,
        durationMin,
        outcome,
        cancelReason: v.cancelReason,
        tenantName: v.tenant?.fullName ?? null,
        tenantPhoneMasked: this.maskedPhone(v.tenant?.phoneEnc),
        hostId: v.tickets[0]?.hostId ?? null,
      };
    });
  }

  private withHostNames<T extends { hostId: string | null }>(entries: T[], hosts: HostEntry[]) {
    const byId = new Map(hosts.map((h) => [h.id, h]));
    return entries.map(({ hostId, ...rest }) => ({
      ...rest,
      host: hostId ? { id: hostId, name: byId.get(hostId)?.name ?? null } : null,
    }));
  }

  private async doorAuditEntries(unitId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { entityName: 'Unit', entityId: unitId, actionType: 'DOOR_KEY_REVEAL' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { actor: { select: { fullName: true } } },
    });
    return logs.map((l) => {
      const value = (l.newValue ?? {}) as { revealedAt?: string; expiresAt?: string };
      return {
        id: l.id,
        at: l.createdAt,
        actorName: l.actor?.fullName ?? null,
        actorRole: l.actorRole,
        revealedAt: value.revealedAt ?? l.createdAt,
        expiresAt: value.expiresAt ?? null,
      };
    });
  }

  private maskedPhone(phoneEnc?: string | null): string | null {
    if (!phoneEnc) return null;
    try {
      return maskPhone(this.phones.decrypt(phoneEnc));
    } catch (err) {
      this.logger.warn(`Không giải mã được SĐT khách để che: ${err.message}`);
      return null;
    }
  }
}
