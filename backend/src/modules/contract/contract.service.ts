import { Injectable, NotFoundException, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMandateDto } from './dto/contract.dto';
import { MandateStatus } from '@prisma/client';
import { DoorCodeService } from '../door/door-code.service';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private auditService: AuditService | undefined,
    private readonly doorCodes: DoorCodeService,
  ) {}

  async createMandate(dto: CreateMandateDto, landlordId?: string) {
    const { unitCode, doorPin } = dto;

    const unit = await this.prisma.unit.findUnique({
      where: { unitCode },
      include: { landlord: true, building: true },
    });

    if (!unit) {
      throw new NotFoundException(`Không tìm thấy căn hộ ${unitCode}`);
    }

    const contractNumber = `MANDATE-${unitCode}-${Date.now().toString().slice(-4)}`;

    // 1. Cập nhật mã khóa cửa an toàn vào Vault (AES-256)
    await this.prisma.doorAccessKey.upsert({
      where: { unitId: unit.id },
      update: {
        vaultSecretRef: this.doorCodes.encryptDoorPin(doorPin.replace(/\D/g, '')),
        lastRotatedAt: new Date(),
      },
      create: {
        unitId: unit.id,
        keyType: 'ELECTRONIC_PIN',
        vaultSecretRef: this.doorCodes.encryptDoorPin(doorPin.replace(/\D/g, '')),
      },
    });

    // 2. Tạo ExclusiveMandate
    const mandate = await this.prisma.exclusiveMandate.create({
      data: {
        unitId: unit.id,
        contractNumber,
        status: MandateStatus.ACTIVE,
        signedAt: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 năm
        doorAccessConfig: {
          doorLockType: 'ELECTRONIC_PIN',
          exitClause: 'Báo trước 15 ngày, chỉ áp dụng khi trạng thái nhà trống (AVAILABLE)',
        },
      },
    });

    this.logger.log(
      `[EXCLUSIVE MANDATE] Chủ nhà [${unit.landlord.fullName}] đã kích hoạt Ký gửi Quản lý Độc quyền căn ${unitCode}. Mã PIN cửa đã lưu an toàn vào Vault (không lưu plaintext).`,
    );

    return {
      success: true,
      mandateId: mandate.id,
      contractNumber: mandate.contractNumber,
      unitCode: unit.unitCode,
      status: mandate.status,
      landlordEffort: {
        travelDistanceKm: 0,
        viewingMinutesSpent: 0,
        message: 'Chủ nhà ở nhà 100%! Đội ngũ Field Host nội khu VinStay AI sẽ đảm nhiệm dẫn khách và báo cáo tức thì qua Zalo.',
      },
      exitPolicy: 'Thoát ủy quyền linh hoạt 15 ngày bất kỳ lúc nào nếu ngưng cho thuê hoặc tự cho thuê (khi căn Available).',
    };
  }

  async getEvidencePackage(contractId: string) {
    const contract = await this.prisma.signedDocument.findUnique({
      where: { id: contractId },
      include: { signatures: { include: { signer: true } } },
    });

    if (!contract) {
      throw new NotFoundException('Không tìm thấy tài liệu');
    }

    return {
      manifestVersion: '1.0.0',
      documentId: contract.id,
      documentSha256: contract.sha256,
      tsaRFC3161Timestamp: contract.tsaTime,
      signatures: contract.signatures.map((s) => ({
        signerName: s.signer.fullName,
        signerRole: s.signerRole,
        method: s.method,
        signedAt: s.signedAt,
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
      })),
      legalIntegrity: 'Bảo toàn tính toàn vẹn 100% bằng hàm băm SHA-256 và dấu thời gian độc lập',
    };
  }
}
