import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PhoneService } from '../auth/phone/phone.service';
import { BookingAccessService } from '../tenant/booking-access.service';
import { DepositService } from '../deposit/deposit.service';
import { LeasePdfService } from '../contract/lease-pdf.service';
import { EkycSimulator, EKYC_CONSENT_VERSION } from './ekyc.simulator';
import { EkycScanRequestDto, SubmitEkycInputDto } from './dto/identity.dto';
import { toTenantBooking, toTenantContract, statusToWeb } from '../tenant/tenant.mappers';
import { EkycScanResult, TenantBooking, TenantContract } from '../tenant/tenant.types';
import {
  ContractStatus,
  DepositStatus,
  IdentityStatus,
  UnitStatus,
  ViewingStatus,
} from '@prisma/client';

function norm(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function parseDobAge(dob: string): number {
  if (!dob) return -1;
  const parts = dob.split('/');
  if (parts.length !== 3) return -1;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const birth = new Date(year, month, day);
  if (isNaN(birth.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function parseVnDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly phones: PhoneService,
    private readonly bookingAccess: BookingAccessService,
    private readonly depositService: DepositService,
    private readonly leasePdfService: LeasePdfService,
  ) {}

  async scan(
    ref: string,
    user: { id: string },
    dto: EkycScanRequestDto,
  ): Promise<EkycScanResult> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);

    // 1. Status check: must be HOLDING
    if (viewing.status !== ViewingStatus.HOLDING) {
      throw new ConflictException({
        message: 'Lịch hẹn không ở trạng thái giữ chỗ.',
        code: 'bad_status',
        expected: 'holding',
        actual: statusToWeb(viewing.status),
      });
    }

    // 2. Deposit check: must be PAID_HOLDING and not expired
    const deposit = viewing.deposit;
    const now = new Date();
    if (
      !deposit ||
      deposit.paymentStatus !== DepositStatus.PAID_HOLDING ||
      (deposit.expiresAt && deposit.expiresAt <= now)
    ) {
      if (deposit && deposit.expiresAt && deposit.expiresAt <= now) {
        await this.depositService.expireIfDue(viewing.unitId);
      }
      throw new ConflictException({
        message: 'Thời hạn giữ chỗ đã kết thúc.',
        code: 'hold_expired',
      });
    }

    // 3. Consent check
    if (dto.consent !== true || dto.consentVersion !== EKYC_CONSENT_VERSION) {
      throw new ConflictException({
        message: 'Phiên bản chấp thuận dữ liệu cá nhân đã cũ, vui lòng cập nhật.',
        code: 'terms_version_stale',
      });
    }

    // 4. Resolve contact info
    let contactPhone = '0912345678';
    if (viewing.contactPhoneEnc) {
      try {
        contactPhone = this.phones.decrypt(viewing.contactPhoneEnc);
      } catch {}
    }

    const scanData = EkycSimulator.scan(
      viewing.contactName || viewing.tenant?.fullName,
      contactPhone,
    );

    const scanId = EkycSimulator.createScanToken(
      viewing.id,
      scanData,
      dto.consentVersion,
    );

    return {
      scanId,
      ...scanData,
    };
  }

  async submit(
    ref: string,
    user: { id: string },
    dto: SubmitEkycInputDto,
  ): Promise<{ booking: TenantBooking; contract: TenantContract }> {
    const viewing = await this.bookingAccess.loadOwned(ref, user);

    // 1. Verify scan token
    const token = EkycSimulator.verifyScanToken(dto.scanId);
    if (!token || token.viewingId !== viewing.id) {
      throw new UnprocessableEntityException({
        message: 'Mã phiên quét eKYC đã hết hạn (15 phút) hoặc không hợp lệ.',
        code: 'scan_expired',
      });
    }

    // 1b. Phiên bản đồng ý quyền riêng tư phải là bản khách ĐÃ đồng ý lúc scan (nằm trong token ký), không tin body.
    if (dto.consentVersion !== token.consentVersion || token.consentVersion !== EKYC_CONSENT_VERSION) {
      throw new ConflictException({
        message: 'Phiên bản đồng ý xử lý dữ liệu cá nhân không còn hiệu lực. Vui lòng quét lại.',
        code: 'terms_version_stale',
      });
    }

    // 2. Verify status
    if (viewing.status !== ViewingStatus.HOLDING) {
      throw new ConflictException({
        message: 'Lịch hẹn không ở trạng thái giữ chỗ.',
        code: 'bad_status',
      });
    }

    // 3. Expire check
    await this.depositService.expireIfDue(viewing.unitId);
    const deposit = await this.prisma.holdingDeposit.findUnique({
      where: { viewingId: viewing.id },
      include: { identity: true },
    });

    const now = new Date();
    if (
      !deposit ||
      deposit.paymentStatus !== DepositStatus.PAID_HOLDING ||
      (deposit.expiresAt && deposit.expiresAt <= now)
    ) {
      throw new ConflictException({
        message: 'Thời hạn giữ chỗ đã kết thúc.',
        code: 'hold_expired',
      });
    }

    // 4. Duplicate eKYC check
    if (deposit.identity) {
      throw new ConflictException({
        message: 'Thông tin eKYC đã được gửi và xác thực trước đó.',
        code: 'ekyc_already_done',
      });
    }

    // 5. Fields validation
    const invalidFields: string[] = [];
    const fields = dto.fields;

    if (!fields.fullName || fields.fullName.trim().length < 2 || fields.fullName.trim().length > 100) {
      invalidFields.push('fullName');
    }
    if (!fields.idNumber || !/^\d{12}$/.test(fields.idNumber.trim())) {
      invalidFields.push('idNumber');
    }
    const age = parseDobAge(fields.dob);
    if (age < 18) {
      invalidFields.push('dob');
    }
    const issued = parseVnDate(fields.issuedDate);
    if (!issued || issued > now) {
      invalidFields.push('issuedDate');
    }
    if (!fields.address || fields.address.trim().length < 3) {
      invalidFields.push('address');
    }

    if (invalidFields.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Dữ liệu CCCD không hợp lệ.',
        code: 'kyc_fields_invalid',
        fields: invalidFields,
      });
    }

    // 6. Low confidence & name mismatch confirmations
    if (token.lowConfidenceKeys.length > 0 && !dto.confirmedLowConfidence) {
      throw new UnprocessableEntityException({
        message: 'Vui lòng xác nhận các trường thông tin có độ tin cậy thấp.',
        code: 'kyc_confirmation_required',
      });
    }

    const viewingContactName = viewing.contactName || viewing.tenant?.fullName || '';
    const isNameMismatch = norm(fields.fullName) !== norm(viewingContactName);
    if (isNameMismatch && !dto.confirmedNameMismatch) {
      throw new UnprocessableEntityException({
        message: 'Họ tên trên CCCD khác tên người đặt lịch xem phòng, vui lòng xác nhận.',
        code: 'kyc_confirmation_required',
      });
    }

    // 7. Lease terms validation
    const unit = viewing.unit;
    const minMonths = unit.minLeaseMonths ?? 6;
    if (
      !dto.lease ||
      typeof dto.lease.months !== 'number' ||
      dto.lease.months < minMonths ||
      dto.lease.months > 36
    ) {
      throw new UnprocessableEntityException({
        message: `Thời hạn thuê phải từ ${minMonths} đến 36 tháng.`,
        code: 'lease_terms_invalid',
      });
    }

    if (![1, 3, 6].includes(dto.lease.paymentCycle)) {
      throw new UnprocessableEntityException({
        message: 'Kỳ thanh toán chỉ chấp nhận 1, 3 hoặc 6 tháng/lần.',
        code: 'lease_terms_invalid',
      });
    }

    const startDate = new Date(dto.lease.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxStart = new Date(today);
    maxStart.setDate(maxStart.getDate() + 30);
    maxStart.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || startDate < today || startDate > maxStart) {
      throw new UnprocessableEntityException({
        message: 'Ngày bắt đầu hợp đồng phải trong vòng 30 ngày kể từ hôm nay.',
        code: 'lease_terms_invalid',
      });
    }

    // 8. Transaction: Record IdentityVerification, Contract, Escrow, Update Unit & Viewing
    const { contract, updatedViewing } = await this.prisma.$transaction(async (tx) => {
      const minConfidence = Math.min(...Object.values(token.confidence));
      const manuallyEdited = JSON.stringify(dto.fields) !== JSON.stringify(token.fields);
      const mismatchFields = isNameMismatch ? ['fullName'] : [];

      await tx.identityVerification.create({
        data: {
          tenantId: viewing.tenantId,
          depositId: deposit.id,
          providerName: 'SIMULATED',
          providerRefId: token.jti,
          confidenceScore: minConfidence,
          fieldConfidence: token.confidence,
          faceMatchScore: token.faceMatch,
          manuallyEdited,
          mismatchFields,
          c06Confirmed: true,
          status: IdentityStatus.VERIFIED,
          verifiedDataRef: this.phones.encrypt(JSON.stringify(dto.fields)),
          consentAt: new Date(token.consentAt),
          consentVersion: token.consentVersion, // từ token đã ký lúc scan, không từ body
          verifiedAt: now,
          rawDataPurgeAt: now,
          rawDataPurgedAt: now,
        },
      });

      // Update tenant profile full name from verified CCCD
      await tx.profile.update({
        where: { id: viewing.tenantId },
        data: { fullName: fields.fullName },
      });

      // Contract number generation
      const currentYear = now.getFullYear();
      const countYear = await tx.contract.count({
        where: { contractNumber: { contains: `-${currentYear}-` } },
      });
      let seq = countYear + 1;
      let contractNumber = `VSA-LEASE-${unit.unitCode}-${currentYear}-${String(seq).padStart(4, '0')}`;
      let conflict = await tx.contract.findUnique({ where: { contractNumber } });
      while (conflict) {
        seq++;
        contractNumber = `VSA-LEASE-${unit.unitCode}-${currentYear}-${String(seq).padStart(4, '0')}`;
        conflict = await tx.contract.findUnique({ where: { contractNumber } });
      }

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + dto.lease.months);
      endDate.setDate(endDate.getDate() - 1);

      const monthlyRent = Number(unit.baseRentPrice);
      const secDeposit = Math.max(monthlyRent, 2000000);

      const createdContract = await tx.contract.create({
        data: {
          contractNumber,
          unitId: unit.id,
          holdingDepositId: deposit.id,
          tenantId: viewing.tenantId,
          landlordId: unit.landlordId,
          leaseTermMonths: dto.lease.months,
          startDate,
          endDate,
          monthlyRentPrice: monthlyRent,
          paymentCycleMonths: dto.lease.paymentCycle,
          securityDepositAmount: secDeposit,
          convertedHoldingAmount: 2000000,
          status: ContractStatus.ACTIVE,
          signedAt: now,
        },
        include: {
          unit: { include: { building: true } },
          document: true,
          holdingDeposit: { include: { viewing: true } },
        },
      });

      await tx.holdingDeposit.update({
        where: { id: deposit.id },
        data: { paymentStatus: DepositStatus.CONVERTED_TO_CONTRACT },
      });

      await tx.escrowTransaction.create({
        data: {
          depositId: deposit.id,
          transType: 'HOLD_CONVERTED',
          amount: 2000000,
          bankRefNumber: `CONV-${deposit.depositCode}`,
          executedAt: now,
        },
      });

      await tx.unit.update({
        where: { id: unit.id },
        data: { status: UnitStatus.RENTED },
      });

      await tx.viewing.update({
        where: { id: viewing.id },
        data: { status: ViewingStatus.LEASED },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          actorRole: 'tenant',
          actionType: 'LEASE_ESTABLISHED',
          entityName: 'Contract',
          entityId: createdContract.id,
          newValue: {
            contractNumber,
            unitCode: unit.unitCode,
            leaseTermMonths: dto.lease.months,
            securityDeposit: secDeposit,
          },
        },
      });

      if (isNameMismatch) {
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            actorRole: 'tenant',
            actionType: 'EKYC_NAME_MISMATCH',
            entityName: 'IdentityVerification',
            entityId: deposit.id,
            newValue: {
              bookingName: viewingContactName,
              cccdName: fields.fullName,
            },
          },
        });
      }

      const reloaded = await tx.viewing.findUnique({
        where: { id: viewing.id },
        include: {
          unit: { include: { building: true } },
          tenant: true,
          tickets: { include: { host: { include: { profile: true } } } },
          deposit: { include: { identity: true, contract: true } },
        },
      });

      return { contract: createdContract, updatedViewing: reloaded };
    });

    // 9. Asynchronously ensure PDF generation (non-blocking for response)
    this.leasePdfService.ensure(contract.id).catch((err) => {
      this.logger.error(`PDF background generation failed for contract ${contract.id}: ${err.message}`);
    });

    let rawPhone: string | undefined;
    if (viewing.contactPhoneEnc) {
      try {
        rawPhone = this.phones.decrypt(viewing.contactPhoneEnc);
      } catch {}
    }

    return {
      booking: toTenantBooking(updatedViewing, { rawPhone }),
      contract: toTenantContract(contract),
    };
  }
}
