import { Injectable, NotFoundException, BadRequestException, NotImplementedException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PhoneService } from '../auth/phone/phone.service';
import { AdminInventoryService } from './admin-inventory.service';
import {
  ApproveConsignmentDto,
  RejectConsignmentDto,
  ReassignBookingDto,
  VoidHoldDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @Optional() private readonly phones?: PhoneService,
    @Optional() private readonly inventory?: AdminInventoryService,
  ) {}

  async approveConsignment(id: string, dto: ApproveConsignmentDto) {
    void id;
    void dto;
    throw new NotImplementedException('Duyệt ký gửi thủ công đã được thay bằng quy trình thẩm định và niêm yết tự động.');
  }

  async rejectConsignment(id: string, dto: RejectConsignmentDto) {
    void id;
    void dto;
    throw new NotImplementedException('Từ chối ký gửi thủ công đã được thay bằng quy trình thẩm định hiện hành.');
  }

  // ==========================================
  // MODULE 5: CONTRACTS & SỔ HỢP ĐỒNG
  // ==========================================
  async getContractById(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: {
        unit: true,
        tenant: true,
        landlord: true,
        document: true,
        holdingDeposit: { include: { identity: true } },
      },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');

    const decrypt = (value: string | null): string | null => {
      if (!value || !this.phones) return null;
      try {
        return this.phones.decrypt(value);
      } catch {
        return null;
      }
    };

    let identity: { idNumber?: string } | null = null;
    const encryptedIdentity = contract.holdingDeposit?.identity?.verifiedDataRef;
    if (encryptedIdentity && this.phones) {
      try {
        identity = JSON.parse(this.phones.decrypt(encryptedIdentity));
      } catch {
        identity = null;
      }
    }

    return {
      id: contract.id,
      contractNumber: contract.contractNumber,
      unitCode: contract.unit.unitCode,
      tenant: {
        fullName: contract.tenant.fullName,
        phone: decrypt(contract.tenant.phoneEnc),
        idNumber: identity?.idNumber ?? null,
      },
      landlord: {
        fullName: contract.landlord.fullName,
        phone: decrypt(contract.landlord.phoneEnc),
      },
      monthlyRentPrice: Number(contract.monthlyRentPrice),
      securityDepositAmount: Number(contract.securityDepositAmount),
      startDate: contract.startDate,
      endDate: contract.endDate,
      status: contract.status,
      evidenceSha256: contract.document?.sha256 ?? null,
      tsaTimestamp: contract.document?.tsaTime?.toISOString() ?? null,
    };
  }

  async completeExit(id: string, actor?: { id: string; role: string }) {
    const mandate = await this.prisma.exclusiveMandate.findUnique({ where: { id } });
    if (!mandate) throw new NotFoundException('Không tìm thấy hợp đồng ủy quyền.');
    if (!this.inventory || !actor) {
      throw new ServiceUnavailableException('Dịch vụ hoàn tất thoát ủy quyền chưa được cấu hình.');
    }
    return this.inventory.terminateMandate(mandate.id, 'Hoàn tất yêu cầu thoát ủy quyền đã đủ thời hạn.', actor);
  }

  async remindRenewal(id: string) {
    const contract = await this.prisma.contract.findUnique({ where: { id }, select: { id: true } });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');
    throw new ServiceUnavailableException({
      message: 'Chưa cấu hình dịch vụ gửi thông báo gia hạn; hệ thống không ghi nhận đã gửi.',
      code: 'notification_provider_unavailable',
    });
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
    const template = this.getContractTemplates().find((item) => item.id === id || item.code === id);
    if (!template) throw new NotFoundException('Không tìm thấy mẫu văn bản.');
    return template;
  }

  async getContractParties() {
    const contracts = await this.prisma.contract.findMany({
      select: {
        id: true,
        status: true,
        tenant: { select: { id: true, fullName: true, email: true, phoneEnc: true } },
        landlord: { select: { id: true, fullName: true, email: true, phoneEnc: true } },
      },
    });
    const parties = new Map<string, {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
      role: 'tenant' | 'landlord';
      contracts: string[];
      activeContracts: number;
      needsSignature: number;
    }>();
    for (const contract of contracts) {
      for (const [profile, role] of [[contract.tenant, 'tenant'], [contract.landlord, 'landlord']] as const) {
        const key = `${role}:${profile.id}`;
        let party = parties.get(key);
        if (!party) {
          let phone: string | null = null;
          if (profile.phoneEnc && this.phones) {
            try {
              phone = this.phones.decrypt(profile.phoneEnc);
            } catch {
              phone = null;
            }
          }
          party = {
            id: profile.id,
            name: profile.fullName,
            email: profile.email,
            phone,
            role,
            contracts: [],
            activeContracts: 0,
            needsSignature: 0,
          };
          parties.set(key, party);
        }
        party.contracts.push(contract.id);
        if (contract.status === 'ACTIVE') party.activeContracts += 1;
        if (contract.status === 'AWAITING_TENANT_SIGN' || contract.status === 'AWAITING_LANDLORD_SIGN') party.needsSignature += 1;
      }
    }
    return [...parties.values()];
  }

  async getContractPartyById(id: string) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        id,
        OR: [{ tenantContracts: { some: {} } }, { landlordContracts: { some: {} } }],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneEnc: true,
        tenantContracts: { select: { id: true }, take: 1 },
        landlordContracts: { select: { id: true }, take: 1 },
      },
    });
    if (!profile) throw new NotFoundException('Không tìm thấy bên ký kết.');
    let phone: string | null = null;
    if (profile.phoneEnc && this.phones) {
      try {
        phone = this.phones.decrypt(profile.phoneEnc);
      } catch {
        phone = null;
      }
    }
    return {
      id: profile.id,
      name: profile.fullName,
      email: profile.email,
      phone,
      role: profile.tenantContracts.length ? 'tenant' : 'landlord',
      contracts: [...profile.tenantContracts, ...profile.landlordContracts].map((contract) => contract.id),
    };
  }
}
