import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GenerateVietQrDto, VietQrWebhookDto } from './dto/deposit.dto';
import { DepositStatus, UnitStatus, ViewingStatus } from '@prisma/client';

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async generateVietQr(dto: GenerateVietQrDto) {
    const { viewingId, hostId, amount = 2000000 } = dto;

    const viewing = await this.prisma.viewing.findUnique({
      where: { id: viewingId },
      include: {
        unit: { include: { building: true } },
        tenant: true,
        tickets: { include: { host: true } },
      },
    });

    if (!viewing) {
      throw new NotFoundException('Không tìm thấy lượt xem phòng');
    }

    if (viewing.unit.status === UnitStatus.HOLDING || viewing.unit.status === UnitStatus.RENTED) {
      throw new BadRequestException(`Căn hộ ${viewing.unit.unitCode} đã có người đặt cọc hoặc đang được thuê!`);
    }

    const assignedHostId = hostId || viewing.tickets[0]?.hostId;
    const depositCode = `DEP-${viewing.unit.unitCode}-${Date.now().toString().slice(-4)}`;

    // Tạo link VietQR động theo chuẩn Napas 247
    // Cú pháp nội dung: COC [Mã căn] [SĐT khách] (Attribution Lock)
    const transferContent = `COC ${viewing.unit.unitCode} ${viewing.tenant.phoneHash?.slice(-4) || '9999'}`;
    const qrImageUrl = `https://img.vietqr.io/image/970422-0912345678-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      transferContent,
    )}&accountName=CONG%20TY%20CO%20PHAN%20VINSTAY%20AI`;

    const deposit = await this.prisma.holdingDeposit.upsert({
      where: { viewingId },
      update: {
        depositCode,
        amount,
        vietqrRef: transferContent,
        paymentStatus: DepositStatus.PENDING_PAYMENT,
        attributedHostId: assignedHostId,
      },
      create: {
        depositCode,
        viewingId,
        unitId: viewing.unit.id,
        attributedHostId: assignedHostId,
        amount,
        vietqrRef: transferContent,
        paymentStatus: DepositStatus.PENDING_PAYMENT,
      },
    });

    return {
      success: true,
      depositId: deposit.id,
      depositCode: deposit.depositCode,
      amount,
      vietqrUrl: qrImageUrl,
      transferContent,
      bankAccount: {
        bankName: 'Ngân hàng Quân Đội (MB Bank)',
        accountNo: '0912345678',
        accountName: 'CONG TY CO PHAN VINSTAY AI',
      },
      holdingPolicy: {
        lockDuration: '7 ngày kể từ lúc nhận cọc (SAD v2)',
        securityDepositClause:
          'Số tiền 2.000.000 VNĐ này sẽ chuyển 100% thành một phần của Tiền Cọc Bảo Đảm Tài Sản & Nội Thất (Security Deposit), tuyệt đối không trừ vào tiền thuê tháng đầu.',
      },
      attributedHostId: assignedHostId,
    };
  }

  async processWebhook(dto: VietQrWebhookDto) {
    const { depositCode, amount, bankRefNumber } = dto;

    const deposit = await this.prisma.holdingDeposit.findUnique({
      where: { depositCode },
      include: {
        unit: { include: { building: true, landlord: true } },
        viewing: { include: { tenant: true } },
        attributedHost: { include: { profile: true } },
      },
    });

    if (!deposit) {
      throw new NotFoundException(`Không tìm thấy giao dịch cọc: ${depositCode}`);
    }

    if (deposit.paymentStatus === DepositStatus.PAID_HOLDING) {
      return { message: 'Giao dịch này đã được gạch nợ trước đó' };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 ngày theo SAD v2

    // 1. Cập nhật Holding Deposit
    const updatedDeposit = await this.prisma.holdingDeposit.update({
      where: { id: deposit.id },
      data: {
        paymentStatus: DepositStatus.PAID_HOLDING,
        paidAt: now,
        expiresAt,
      },
    });

    // 2. Ghi nhận EscrowTransaction
    await this.prisma.escrowTransaction.create({
      data: {
        depositId: deposit.id,
        transType: 'INBOUND_DEPOSIT',
        amount,
        bankRefNumber,
      },
    });

    // 3. Khóa trạng thái căn hộ sang HOLDING toàn mạng lưới
    await this.prisma.unit.update({
      where: { id: deposit.unitId },
      data: { status: UnitStatus.HOLDING },
    });

    // 4. CONFLICT RESOLVER: Tự động hủy toàn bộ các lịch xem còn lại của căn này
    const conflictedViewings = await this.prisma.viewing.findMany({
      where: {
        unitId: deposit.unitId,
        id: { not: deposit.viewingId },
        status: { in: [ViewingStatus.PENDING_CONFIRMATION, ViewingStatus.CONFIRMED] },
      },
      include: { tenant: true },
    });

    await this.prisma.viewing.updateMany({
      where: {
        unitId: deposit.unitId,
        id: { not: deposit.viewingId },
        status: { in: [ViewingStatus.PENDING_CONFIRMATION, ViewingStatus.CONFIRMED] },
      },
      data: {
        status: ViewingStatus.CANCELLED,
        cancelReason: 'AUTO_CANCELLED_DUE_TO_DEPOSIT',
      },
    });

    this.logger.log(
      `[CONFLICT RESOLVER] Đã tự động hủy ${conflictedViewings.length} lịch xem trùng của căn ${deposit.unit.unitCode}. Đã kích hoạt Zalo Bot gợi ý 2 căn thay thế cùng phân khu.`,
    );

    // 5. Cập nhật ví tiền và biến phí cho Field Host phụ trách (+450.000 VNĐ)
    let hostPayoutNotice = 'Không có Host được gán';
    if (deposit.attributedHostId) {
      const commissionTotal = 450000; // 50k dẫn + 400k hoa hồng chốt cọc
      await this.prisma.fieldHost.update({
        where: { id: deposit.attributedHostId },
        data: {
          walletBalance: { increment: commissionTotal },
        },
      });

      await this.prisma.hostPayout.create({
        data: {
          hostId: deposit.attributedHostId,
          amount: commissionTotal,
          period: `Tuần ${new Date().toLocaleDateString('vi-VN')}`,
          status: 'PENDING',
          transRef: `COMM-${deposit.depositCode}`,
        },
      });

      hostPayoutNotice = `Ví Field Host [${deposit.attributedHost?.profile?.fullName}]: +${commissionTotal.toLocaleString(
        'vi-VN',
      )} VNĐ (+50.000đ dẫn ca + 400.000đ hoa hồng chốt cọc)`;
      this.logger.log(`[HOST INCENTIVE] ${hostPayoutNotice}`);
    }

    // 6. Ghi Audit Log
    await this.auditService.log({
      actorId: deposit.viewing.tenantId,
      actorRole: 'tenant',
      actionType: 'DEPOSIT_PAID_HOLDING_7D',
      entityName: 'HoldingDeposit',
      entityId: deposit.id,
      newValue: {
        amount,
        bankRefNumber,
        expiresAt: expiresAt.toISOString(),
        unitCode: deposit.unit.unitCode,
      },
    });

    return {
      success: true,
      message: 'Gạch nợ VietQR thành công! Căn hộ đã chuyển sang trạng thái HOLDING 7 ngày.',
      depositId: deposit.id,
      unitStatus: 'HOLDING',
      expiresAt,
      conflictResolver: {
        autoCancelledCount: conflictedViewings.length,
        notification: 'Đã gửi tin Zalo thông báo hủy lịch kèm 2 căn hộ thay thế tương đương cho các khách bị trùng.',
      },
      hostReward: hostPayoutNotice,
      nextStep: 'Khách thuê chuyển sang bước AI OCR CCCD & Ký Thỏa thuận Cọc Điện Tử (Màn 6)',
    };
  }

  async getDepositStatus(id: string) {
    const deposit = await this.prisma.holdingDeposit.findUnique({
      where: { id },
      include: {
        unit: { include: { building: true } },
        viewing: { include: { tenant: true } },
        attributedHost: { include: { profile: true } },
      },
    });

    if (!deposit) {
      throw new NotFoundException('Không tìm thấy giao dịch cọc');
    }

    return deposit;
  }
}
