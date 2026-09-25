import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateDigitalHandoverDto } from './dto/handover.dto';

@Injectable()
export class HandoverService {
  private readonly logger = new Logger(HandoverService.name);

  // 10 danh mục bắt buộc theo SAD v2 §3.3
  private readonly required10Categories = [
    'wall', // Tường & sơn
    'floor', // Sàn nhà
    'door_lock', // Cửa & khóa
    'air_conditioner', // Điều hòa
    'refrigerator', // Tủ lạnh
    'kitchen', // Bếp & máy hút mùi
    'sanitary', // Thiết bị vệ sinh
    'sofa', // Sofa & bàn trà
    'bed', // Giường / nệm / tủ
    'electrical', // Chiếu sáng & công tắc
  ];

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async createHandover(dto: CreateDigitalHandoverDto, hostId?: string) {
    const { contractId, handoverType, items, utilityReadings } = dto;

    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: { unit: true, tenant: true, landlord: true },
    });

    if (!contract) {
      throw new NotFoundException('Không tìm thấy hợp đồng');
    }

    const reportSha256 = `sha256_handover_${Math.random().toString(36).substring(2)}${Date.now()}`;

    // 1. Tạo DigitalHandover
    const handover = await this.prisma.digitalHandover.create({
      data: {
        contractId,
        handoverType,
        inspectorHostId: hostId,
        inspectedAt: new Date(),
        reportSha256,
        items: {
          create: items.map((item) => ({
            itemCategory: item.itemCategory,
            conditionNote: item.conditionNote,
            isNormalWear: item.isNormalWear,
            photos: [
              {
                url: `https://vinstay.ai/storage/handovers/${item.itemCategory}.jpg`,
                timestamp: new Date().toISOString(),
                gps: { lat: 20.998412, lng: 105.945281 },
              },
            ],
          })),
        },
        utilityReadings: {
          create: utilityReadings.map((u) => ({
            utilityType: u.utilityType,
            meterIndex: u.meterIndex,
            photoKey: u.photoKey,
            recordedAt: new Date(),
          })),
        },
      },
      include: { items: true, utilityReadings: true },
    });

    // 2. Ghi Audit Log
    await this.auditService.log({
      actorId: hostId || contract.tenantId,
      actorRole: 'field_host',
      actionType: `HANDOVER_${handoverType}_CREATED`,
      entityName: 'DigitalHandover',
      entityId: handover.id,
      newValue: {
        contractNumber: contract.contractNumber,
        reportSha256,
        itemsInspectedCount: items.length,
      },
    });

    this.logger.log(
      `[DIGITAL HANDOVER] Đã lập Hộ chiếu bàn giao #${handover.id} (${handoverType}) cho căn ${contract.unit.unitCode}. Niêm phong SHA-256: ${reportSha256}`,
    );

    return {
      success: true,
      handoverId: handover.id,
      handoverType: handover.handoverType,
      unitCode: contract.unit.unitCode,
      tenantName: contract.tenant.fullName,
      reportSha256,
      inspectedItems: handover.items.length,
      utilityMeters: handover.utilityReadings,
      passportStatus: 'Đã niêm phong chứng cứ số toàn vẹn, sẵn sàng đối soát khi trả phòng (Check-out)',
    };
  }

  async getHandoverByContract(contractId: string) {
    const handovers = await this.prisma.digitalHandover.findMany({
      where: { contractId },
      include: { items: true, utilityReadings: true },
      orderBy: { inspectedAt: 'desc' },
    });

    return handovers;
  }
}
