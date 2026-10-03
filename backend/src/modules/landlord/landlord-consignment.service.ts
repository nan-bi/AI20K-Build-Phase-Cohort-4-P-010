import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MandateStatus, OtpPurpose, PhysicalKeyState, UnitStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OtpService } from '../auth/otp/otp.service';
import { PhoneVerificationService } from '../auth/otp/phone-verification.service';
import { PhoneService } from '../auth/phone/phone.service';
import { LandlordAccessService } from './landlord-access.service';
import { LandlordPhotoService } from './landlord-photo.service';
import { CreateConsignmentDto, SignConsignmentDto } from './dto/landlord.dto';
import {
  ConsignmentMeta,
  DEFAULT_MGMT_FEE_PER_M2,
  INSPECT_SLA_HOURS,
  LockKind,
  MGMT_FEE_CONFIG_KEY,
  consignmentStage,
  maskPhone,
  parseLock,
  readConsignmentMeta,
  toDoorLockType,
  toLayoutKind,
  toLayoutType,
  toLockKind,
  withConsignmentMeta,
} from './landlord.mappers';

type MandateWithUnit = Awaited<ReturnType<LandlordAccessService['ownedMandate']>>;

/**
 * Hồ sơ ký gửi = Unit (chưa niêm yết, `isVerified=false`) + ExclusiveMandate `PENDING_INSPECTION`.
 * `consignmentId` chính là `ExclusiveMandate.id` — cùng khóa mà module Host dùng khi liệt kê ca thẩm định.
 */
@Injectable()
export class LandlordConsignmentService {
  private readonly logger = new Logger(LandlordConsignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: LandlordAccessService,
    private readonly audit: AuditService,
    private readonly otp: OtpService,
    private readonly phones: PhoneService,
    private readonly phoneVerification: PhoneVerificationService,
    private readonly photos: LandlordPhotoService,
  ) {}

  async list(landlordId: string) {
    const mandates = await this.prisma.exclusiveMandate.findMany({
      where: { unit: { landlordId } },
      orderBy: { createdAt: 'desc' },
      include: { unit: { include: { building: true } } },
    });
    // Căn nhập thẳng vào DB (không qua luồng ký gửi) không có meta và đã ACTIVE ⇒ không phải hồ sơ ký gửi.
    return mandates
      .filter((m) => readConsignmentMeta(m.doorAccessConfig) || m.status === MandateStatus.PENDING_INSPECTION)
      .map((m) => this.toDto(m));
  }

  /** Chi tiết một hồ sơ, kèm ảnh chủ nhà đã tải lên (URL xem có hạn 1 giờ). */
  async get(landlordId: string, id: string) {
    const mandate = await this.access.ownedMandate(landlordId, id);
    const photos = await this.photos.withUrls(readConsignmentMeta(mandate.doorAccessConfig)?.photos ?? []);
    return { ...this.toDto(mandate), photos };
  }

  async create(landlordId: string, dto: CreateConsignmentDto) {
    const layout = toLayoutType(dto.layout);
    if (!layout) throw new BadRequestException(`Loại căn không hợp lệ: ${dto.layout}`);

    const locks = this.parseLocks(dto.locks);
    const suggestedDeposit = dto.suggestedDeposit ?? dto.askRent;
    if (!dto.draft && (suggestedDeposit < 2_000_000 || suggestedDeposit > 3 * dto.askRent)) {
      throw new BadRequestException('Tiền cọc đề xuất phải từ 2.000.000đ đến 3 lần giá thuê.');
    }

    const building = await this.prisma.building.findUnique({ where: { buildingCode: dto.building } });
    if (!building) throw new BadRequestException('Tòa nhà không thuộc phân khu hỗ trợ.');
    if (dto.floor > building.totalFloors) {
      throw new BadRequestException(`Tòa ${building.buildingCode} chỉ có ${building.totalFloors} tầng.`);
    }

    const unitCode = `VHOP-${building.buildingCode}-${dto.floor}${dto.door.toUpperCase()}`;
    if (await this.prisma.unit.findUnique({ where: { unitCode } })) {
      throw new ConflictException(`Căn ${unitCode} đã có trong hệ thống.`);
    }

    const mgmtRate = await this.configValue(MGMT_FEE_CONFIG_KEY, DEFAULT_MGMT_FEE_PER_M2);
    const lock = toDoorLockType(locks[0]);
    const meta: ConsignmentMeta = {
      stage: 'draft',
      form: {
        building: building.buildingCode,
        floor: dto.floor,
        door: dto.door.toUpperCase(),
        areaM2: dto.areaM2,
        askRent: dto.askRent,
        suggestedDeposit,
        leaseTerm: dto.leaseTerm ?? null,
        furnished: dto.furnished ?? null,
        locks,
        note: dto.note?.trim() || null,
      },
    };

    const mandate = await this.prisma.$transaction(async (tx) => {
      const unit = await tx.unit.create({
        data: {
          unitCode,
          buildingId: building.id,
          landlordId,
          floorNumber: dto.floor,
          layoutType: layout,
          carpetAreaM2: dto.areaM2,
          baseRentPrice: dto.askRent,
          managementFee: Math.round(dto.areaM2 * mgmtRate),
          // Chưa có số liệu thị trường: đặt bằng giá chào ⇒ chưa có badge "Căn hời". Admin cập nhật khi duyệt.
          marketAvgPrice: dto.askRent,
          doorLockType: lock,
          isVerified: false,
          status: UnitStatus.UNLISTED,
        },
      });
      if (dto.doorCode || locks.includes('physical')) {
        await tx.doorAccessKey.create({
          data: {
            unitId: unit.id,
            keyType: lock,
            vaultSecretRef: dto.doorCode && lock === 'ELECTRONIC_PIN' ? `aes:${this.phones.encrypt(dto.doorCode)}` : null,
            physicalKeyState: lock === 'PHYSICAL_KEY' ? PhysicalKeyState.AT_DESK : null,
          },
        });
      }
      return tx.exclusiveMandate.create({
        data: {
          unitId: unit.id,
          contractNumber: `UQ-${new Date().getFullYear()}-${building.buildingCode.replace('.', '')}-${randomBytes(3).toString('hex').toUpperCase()}`,
          status: MandateStatus.PENDING_INSPECTION,
          doorAccessConfig: withConsignmentMeta(null, meta) as object,
        },
        include: { unit: { include: { building: true } } },
      });
    });

    await this.audit.log({
      actorId: landlordId,
      actorRole: 'landlord',
      actionType: 'CONSIGNMENT_CREATED',
      entityName: 'ExclusiveMandate',
      entityId: mandate.id,
      newValue: { unitCode, askRent: dto.askRent, draft: !!dto.draft },
    });
    this.logger.log(`[CONSIGNMENT] ${landlordId} tạo hồ sơ ký gửi ${unitCode}`);
    return this.toDto(mandate);
  }

  /** Ký ủy quyền độc quyền: draft → awaiting_host, giao ca thẩm định cho Host phân khu (SLA 48h). */
  async sign(landlordId: string, id: string, dto: SignConsignmentDto) {
    const mandate = await this.access.ownedMandate(landlordId, id);
    if (consignmentStage(mandate) !== 'draft') {
      throw new ConflictException('Hồ sơ không ở trạng thái nháp để ký ủy quyền.');
    }
    if (dto.ownershipWarranted !== true) {
      throw new BadRequestException('Cần cam kết quyền sở hữu/sử dụng hợp pháp căn hộ trước khi ký.');
    }
    await this.verifySignOtp(landlordId, dto.otp, dto.phone);

    const now = new Date();
    const meta = readConsignmentMeta(mandate.doorAccessConfig);
    if (!meta) throw new NotFoundException('Hồ sơ ký gửi không có dữ liệu biểu mẫu.');

    const host = await this.prisma.fieldHost.findFirst({
      where: { assignedZone: { contains: mandate.unit.building.zoneName } },
    });
    const signedMeta: ConsignmentMeta = {
      ...meta,
      stage: 'awaiting_host',
      ownershipWarrantedAt: now.toISOString(),
      inspectDueAt: new Date(now.getTime() + INSPECT_SLA_HOURS * 3_600_000).toISOString(),
      ...(host ? { hostId: host.id } : {}),
    };

    const updated = await this.prisma.exclusiveMandate.update({
      where: { id: mandate.id },
      data: { signedAt: now, doorAccessConfig: withConsignmentMeta(mandate.doorAccessConfig, signedMeta) as object },
      include: { unit: { include: { building: true } } },
    });

    await this.audit.log({
      actorId: landlordId,
      actorRole: 'landlord',
      actionType: 'CONSIGNMENT_SIGNED',
      entityName: 'ExclusiveMandate',
      entityId: mandate.id,
      newValue: { signedAt: now.toISOString(), hostId: host?.id ?? null },
    });
    return this.toDto(updated);
  }

  // ─── nội bộ ───────────────────────────────────────────────────────────────────────────────

  private parseLocks(raw?: string[]): LockKind[] {
    if (!raw?.length) return ['smart'];
    const parsed = raw.map((l) => parseLock(l));
    if (parsed.some((l) => !l)) throw new BadRequestException('Hình thức khóa phải là smart hoặc physical.');
    return [...new Set(parsed as LockKind[])];
  }

  private async configValue(key: string, fallback: number): Promise<number> {
    const row = await this.prisma.feeConfig.findUnique({ where: { configKey: key } });
    return row ? Number(row.paramValue) : fallback;
  }

  /**
   * Gửi OTP ký ủy quyền. Hồ sơ đã có SĐT thì gửi tới SĐT đã lưu (bỏ qua `phone` client gửi); chưa có thì dùng
   * `phone` client gửi — OTP đúng ở bước ký sẽ gắn số đó vào hồ sơ.
   */
  async sendSignOtp(landlordId: string, id: string, phoneRaw?: string) {
    const mandate = await this.access.ownedMandate(landlordId, id);
    if (consignmentStage(mandate) !== 'draft') {
      throw new ConflictException('Hồ sơ không ở trạng thái nháp để ký ủy quyền.');
    }
    const phone = await this.signingPhone(landlordId, phoneRaw);
    const { devCode } = await this.otp.send({ phone, purpose: OtpPurpose.PHONE_VERIFY });
    return { maskedPhone: maskPhone(phone), expiresInSeconds: this.otp.expiresInSeconds, ...(devCode ? { devCode } : {}) };
  }

  /** SĐT nhận OTP: đã lưu trong hồ sơ, hoặc (nếu chưa có) số hợp lệ do client gửi. */
  private async signingPhone(landlordId: string, phoneRaw?: string): Promise<string> {
    const profile = await this.prisma.profile.findUnique({ where: { id: landlordId }, select: { phoneEnc: true } });
    if (profile?.phoneEnc) return this.phones.decrypt(profile.phoneEnc);
    const phone = phoneRaw ? this.phones.normalize(phoneRaw) : null;
    if (!phone) throw new BadRequestException('Nhập số điện thoại hợp lệ để nhận mã OTP ký ủy quyền.');
    return phone;
  }

  /** Xác thực OTP ký. Hồ sơ chưa có SĐT thì OTP đúng đồng thời gắn SĐT (đã xác thực) vào hồ sơ. */
  private async verifySignOtp(landlordId: string, code: string, phoneRaw?: string) {
    const profile = await this.prisma.profile.findUnique({ where: { id: landlordId }, select: { phoneEnc: true } });
    const phone = await this.signingPhone(landlordId, phoneRaw);
    if (!profile?.phoneEnc) {
      await this.phoneVerification.verifyAndBind(landlordId, phone, code, {});
      return;
    }
    const verified = await this.otp.verify({ phone, purpose: OtpPurpose.PHONE_VERIFY, code });
    await this.otp.consume(verified.id);
  }

  private toDto(mandate: MandateWithUnit) {
    const meta = readConsignmentMeta(mandate.doorAccessConfig);
    const unit = mandate.unit;
    const form = meta?.form;
    return {
      id: mandate.id,
      unitId: unit.id,
      unitCode: unit.unitCode,
      contractNumber: mandate.contractNumber,
      status: consignmentStage(mandate),
      building: unit.building.buildingCode,
      zone: unit.building.zoneName,
      floor: unit.floorNumber,
      door: form?.door ?? null,
      layout: unit.layoutType,
      layoutKind: toLayoutKind(unit.layoutType),
      areaM2: form?.areaM2 ?? Number(unit.carpetAreaM2),
      askRent: form?.askRent ?? Number(unit.baseRentPrice),
      suggestedDeposit: form?.suggestedDeposit ?? Number(unit.baseRentPrice),
      leaseTerm: form?.leaseTerm ?? null,
      furnished: form?.furnished ?? null,
      locks: form?.locks ?? [toLockKind(unit.doorLockType)],
      note: form?.note ?? null,
      photoCount: meta?.photos?.length ?? 0,
      createdAt: mandate.createdAt,
      signedAt: mandate.signedAt,
      ownershipWarrantedAt: meta?.ownershipWarrantedAt ?? null,
      inspectDueAt: meta?.inspectDueAt ?? null,
      hostId: meta?.hostId ?? null,
      hostAcceptedAt: meta?.hostAcceptedAt ?? null,
      report: meta?.report ?? null,
      decidedAt: meta?.decidedAt ?? null,
      decidedBy: meta?.decidedBy ?? null,
      decisionNote: meta?.decisionNote ?? null,
    };
  }
}
