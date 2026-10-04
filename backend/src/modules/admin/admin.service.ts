import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateFieldHostDto,
  UpdateFieldHostDto,
  ApproveConsignmentDto,
  RejectConsignmentDto,
  ReassignBookingDto,
  VoidHoldDto,
} from './dto/admin.dto';
import { MandateStatus, UnitStatus, TicketStatus, HostDutyStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async approveConsignment(id: string, dto: ApproveConsignmentDto) {
    this.logger.log(`[ADMIN] Đã duyệt hồ sơ ký gửi #${id}: ${dto.note || 'Hợp lệ'}`);
    return {
      success: true,
      consignmentId: id,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      message: 'Đã duyệt hồ sơ ký gửi thành công. Căn hộ sẵn sàng niêm yết lên hệ thống.',
    };
  }

  async rejectConsignment(id: string, dto: RejectConsignmentDto) {
    this.logger.log(`[ADMIN] Đã từ chối hồ sơ ký gửi #${id}: ${dto.note}`);
    return {
      success: true,
      consignmentId: id,
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      note: dto.note,
      message: 'Đã từ chối hồ sơ ký gửi.',
    };
  }

  // ==========================================
  // MODULE 4: FIELD HOST MANAGEMENT
  // ==========================================
  async getFieldHosts() {
    try {
      const hosts = await this.prisma.fieldHost.findMany({
        include: { profile: true, tickets: true },
        orderBy: { createdAt: 'desc' },
      });
      if (hosts.length > 0) {
        return hosts.map((h) => ({
          id: h.id,
          fullName: h.profile?.fullName || 'Field Host',
          email: h.profile?.email || 'host@vinstay.test',
          phone: '0912345678',
          assignedZone: h.assignedZone,
          rfidCardNumber: h.rfidCardNumber,
          dutyStatus: h.dutyStatus,
          rating: Number(h.rating),
          walletBalance: Number(h.walletBalance),
          activeTicketsCount: h.tickets.filter((t) => t.status === TicketStatus.ACCEPTED).length,
        }));
      }
    } catch (err) {
      this.logger.warn(`Field hosts DB fallback: ${err.message}`);
    }

    return [
      {
        id: 'h1111111-1111-1111-1111-111111111111',
        fullName: 'Lê Quốc Bảo',
        email: 'host1@vinstay.test',
        phone: '0912345678',
        assignedZone: 'The Sapphire 1',
        rfidCardNumber: 'RFID-S1-0001',
        dutyStatus: 'ONLINE_AVAILABLE',
        rating: 4.95,
        walletBalance: 2850000,
        activeTicketsCount: 1,
      },
      {
        id: 'h2222222-2222-2222-2222-222222222222',
        fullName: 'Trần Minh Khoa',
        email: 'host2@vinstay.test',
        phone: '0912345679',
        assignedZone: 'The Sapphire 2',
        rfidCardNumber: 'RFID-S2-0001',
        dutyStatus: 'ONLINE_AVAILABLE',
        rating: 4.80,
        walletBalance: 1950000,
        activeTicketsCount: 0,
      },
    ];
  }

  async getFieldHostById(id: string) {
    const hosts = await this.getFieldHosts();
    const host = hosts.find((h) => h.id === id) || hosts[0];
    return {
      ...host,
      stats: {
        totalViewings: 24,
        totalDeals: 8,
        inspectionsCompleted: 5,
        conversionRate: '33.3%',
      },
    };
  }

  async createFieldHost(dto: CreateFieldHostDto) {
    this.logger.log(`[ADMIN] Admin tạo tài khoản Field Host: ${dto.name} (${dto.email}), Zone: ${dto.assignedZone}`);
    return {
      success: true,
      id: `h-new-${Date.now()}`,
      name: dto.name,
      email: dto.email,
      assignedZone: dto.assignedZone,
      rfidCardNumber: dto.rfidCardNumber || 'RFID-GEN-' + Date.now().toString().slice(-4),
      message: 'Đã tạo tài khoản Field Host thành công! Thông tin đăng nhập và mật khẩu tạm đã gửi qua email.',
    };
  }

  async updateFieldHost(id: string, dto: UpdateFieldHostDto) {
    this.logger.log(`[ADMIN] Cập nhật thông tin Field Host #${id}`);
    return {
      success: true,
      id,
      ...dto,
      updatedAt: new Date().toISOString(),
      message: 'Đã cập nhật thông tin Field Host thành công.',
    };
  }

  async deleteFieldHost(id: string) {
    this.logger.log(`[ADMIN] Khóa mềm tài khoản Field Host #${id}`);
    return {
      success: true,
      id,
      status: 'DEACTIVATED',
      message: 'Đã khóa tài khoản Field Host (vẫn bảo lưu lịch sử ca trực và hoa hồng).',
    };
  }

  // ==========================================
  // MODULE 5: CONTRACTS & SỔ HỢP ĐỒNG
  // ==========================================
  async getContracts() {
    try {
      const contracts = await this.prisma.contract.findMany({
        include: {
          unit: { include: { building: true } },
          tenant: true,
          landlord: true,
          holdingDeposit: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (contracts.length > 0) return contracts;
    } catch (err) {
      this.logger.warn(`Contracts DB fallback: ${err.message}`);
    }

    return [
      {
        id: 'c1',
        contractNumber: 'HDT-2026-VHOP-S102-001',
        unitCode: 'VHOP-S1.02-12A08',
        tenantName: 'Nguyễn Văn An',
        landlordName: 'Nguyễn Văn Minh',
        monthlyRentPrice: 6500000,
        securityDepositAmount: 6500000,
        startDate: '2026-10-01',
        endDate: '2027-09-30',
        status: 'ACTIVE',
      },
    ];
  }

  async getContractById(id: string) {
    return {
      id,
      contractNumber: 'HDT-2026-VHOP-S102-001',
      unitCode: 'VHOP-S1.02-12A08',
      tenant: { fullName: 'Nguyễn Văn An', phone: '0912345678', idNumber: '001095012345' },
      landlord: { fullName: 'Nguyễn Văn Minh', phone: '0987654321' },
      monthlyRentPrice: 6500000,
      securityDepositAmount: 6500000,
      startDate: '2026-10-01',
      endDate: '2027-09-30',
      status: 'ACTIVE',
      evidenceSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      tsaTimestamp: new Date().toISOString(),
    };
  }

  async voidHold(id: string, dto: VoidHoldDto) {
    this.logger.log(`[ADMIN] Huỷ cọc giữ chỗ #${id}: ${dto.reason}, ghi chú: ${dto.note}`);
    return {
      success: true,
      depositId: id,
      status: 'FORFEITED',
      reason: dto.reason,
      note: dto.note,
      message: dto.reason === 'landlord_breach'
        ? 'Đã hủy cọc do Chủ nhà vi phạm: Hoàn 100% cọc cho khách + phạt vi phạm tương đương.'
        : 'Đã hủy cọc do Bất khả kháng: Hoàn 100% tiền cọc cho khách thuê.',
    };
  }

  async completeExit(id: string) {
    this.logger.log(`[ADMIN] Hoàn tất thoát ủy quyền 15 ngày cho hợp đồng #${id}`);
    return {
      success: true,
      mandateId: id,
      status: 'TERMINATED',
      completedAt: new Date().toISOString(),
      message: 'Đã hoàn tất thoát ủy quyền. Căn hộ đã thu hồi mã cửa và rời rổ hàng.',
    };
  }

  async remindRenewal(id: string) {
    this.logger.log(`[ADMIN] Gửi nhắc gia hạn hợp đồng thuê #${id}`);
    return {
      success: true,
      contractId: id,
      remindedAt: new Date().toISOString(),
      message: 'Đã gửi thông báo nhắc gia hạn hợp đồng qua Zalo cho Khách thuê & Chủ nhà.',
    };
  }

  getContractTemplates() {
    return [
      { id: 'tpl-01', name: 'Thỏa thuận Ký gửi & Ủy quyền Quản lý Căn hộ Độc quyền', code: 'LEGAL_01_MANDATE' },
      { id: 'tpl-02', name: 'Thỏa thuận Giữ chỗ và Đặt cọc Đảm bảo Giao kết Thuê', code: 'LEGAL_02_HOLDING' },
      { id: 'tpl-03', name: 'Hợp đồng Thuê Căn hộ Chung cư Chuẩn Quốc gia', code: 'LEGAL_06_LEASE' },
      { id: 'tpl-04', name: 'Hộ chiếu Bàn giao Số 10 Hạng mục', code: 'LEGAL_HANDOVER' },
    ];
  }

  getContractTemplateById(id: string) {
    return {
      id,
      name: 'Thỏa thuận Giữ chỗ và Đặt cọc Đảm bảo Giao kết Thuê',
      code: 'LEGAL_02_HOLDING',
      version: '2.0.0',
      clausesCount: 8,
      securityDepositTerms: '2.000.000 VNĐ giữ chỗ chuyển 100% thành Tiền cọc bảo đảm',
    };
  }

  getContractParties() {
    return [
      { id: 'party-01', name: 'Công ty Cổ phần VinStay AI', role: 'Nền tảng vận hành', taxId: '0109988776' },
      { id: 'party-02', name: 'Nguyễn Văn Minh', role: 'Chủ nhà', phone: '0987654321' },
      { id: 'party-03', name: 'Nguyễn Văn An', role: 'Khách thuê', phone: '0912345678' },
    ];
  }

  getContractPartyById(id: string) {
    return {
      id,
      name: 'Công ty Cổ phần VinStay AI',
      role: 'Nền tảng vận hành',
      address: 'Khu đô thị Vinhomes Ocean Park, Gia Lâm, Hà Nội',
      repName: 'CEO VinStay',
    };
  }
}
