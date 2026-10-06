import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { HostRole, TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LandlordPhotoStorage, sniffImage } from '../landlord/landlord-photo-storage.service';
import { CreateDigitalHandoverDto } from './dto/handover.dto';

const REQUIRED_CATEGORIES = [
  'wall',
  'floor',
  'door_lock',
  'air_conditioner',
  'refrigerator',
  'kitchen',
  'sanitary',
  'sofa',
  'bed',
  'electrical',
];
const ACCEPTED_TICKET_STATUSES = [TicketStatus.ACCEPTED, TicketStatus.CHECKED, TicketStatus.COMPLETED];

type Actor = { id: string; role: string };

@Injectable()
export class HandoverService {
  private readonly logger = new Logger(HandoverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storage: LandlordPhotoStorage,
  ) {}

  private async getAuthorizedInspector(contractId: string, actor: Actor) {
    const [contract, host] = await Promise.all([
      this.prisma.contract.findUnique({
        where: { id: contractId },
        include: {
          unit: true,
          tenant: { select: { fullName: true } },
          holdingDeposit: { include: { viewing: { include: { tickets: true } } } },
        },
      }),
      this.prisma.fieldHost.findUnique({
        where: { profileId: actor.id },
        select: { id: true, roles: true },
      }),
    ]);

    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    if (actor.role !== 'field_host' || !host?.roles.includes(HostRole.INSPECTOR)) {
      throw new ForbiddenException('Chỉ Field Host có vai thẩm định mới được lập biên bản.');
    }

    const assigned = contract.holdingDeposit?.viewing?.tickets.some(
      (ticket: any) => ticket.hostId === host.id && ACCEPTED_TICKET_STATUSES.includes(ticket.status),
    );
    if (!assigned) throw new ForbiddenException('Bạn không được phân công cho lịch xem/hợp đồng này.');
    return { contract, host };
  }

  async uploadPhoto(contractId: string, actor: Actor, buffer: Buffer) {
    const { host } = await this.getAuthorizedInspector(contractId, actor);
    const imageType = sniffImage(buffer);
    if (!imageType) throw new BadRequestException('Tệp tải lên không phải ảnh JPG, PNG hoặc WebP hợp lệ.');

    const key = `handovers/${contractId}/${randomUUID()}.${imageType.ext}`;
    await this.storage.uploadAt(key, buffer, imageType);
    return {
      photoKey: key,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      inspectorHostId: host.id,
    };
  }

  private async verifyPhotoKey(contractId: string, key: string) {
    if (!key.startsWith(`handovers/${contractId}/`) || key.includes('..')) {
      throw new BadRequestException('Ảnh phải được tải lên cho đúng hợp đồng.');
    }
    const image = await this.storage.download(key);
    if (!image || !sniffImage(image)) throw new BadRequestException('Không tìm thấy ảnh hợp lệ trong kho private.');
    return {
      key,
      sha256: createHash('sha256').update(image).digest('hex'),
      uploadedAt: new Date().toISOString(),
    };
  }

  async createHandover(dto: CreateDigitalHandoverDto, actor: Actor) {
    const { contract, host } = await this.getAuthorizedInspector(dto.contractId, actor);
    const categories = dto.items.map((item) => item.itemCategory);
    if (
      categories.length !== REQUIRED_CATEGORIES.length ||
      new Set(categories).size !== REQUIRED_CATEGORIES.length ||
      REQUIRED_CATEGORIES.some((category) => !categories.includes(category))
    ) {
      throw new BadRequestException('Biên bản phải có đủ 10 hạng mục, mỗi hạng mục đúng một lần.');
    }

    const items = await Promise.all(
      dto.items.map(async (item) => ({
        ...item,
        photos: await Promise.all(item.photos.map((key) => this.verifyPhotoKey(dto.contractId, key))),
      })),
    );
    const utilityReadings = await Promise.all(
      dto.utilityReadings.map(async (reading) => ({
        ...reading,
        photoEvidence: await this.verifyPhotoKey(dto.contractId, reading.photoKey),
      })),
    );

    const reportSha256 = createHash('sha256')
      .update(JSON.stringify({ contractId: dto.contractId, handoverType: dto.handoverType, items, utilityReadings }))
      .digest('hex');

    const handover = await this.prisma.digitalHandover.create({
      data: {
        contractId: dto.contractId,
        handoverType: dto.handoverType,
        inspectorHostId: host.id,
        inspectedAt: new Date(),
        reportSha256,
        items: {
          create: items.map((item) => ({
            itemCategory: item.itemCategory,
            conditionNote: item.conditionNote,
            isNormalWear: item.isNormalWear,
            photos: item.photos,
          })),
        },
        utilityReadings: {
          create: utilityReadings.map(({ photoEvidence: _evidence, ...reading }) => ({
            utilityType: reading.utilityType,
            meterIndex: reading.meterIndex,
            photoKey: reading.photoKey,
            recordedAt: new Date(),
          })),
        },
      },
      include: { items: true, utilityReadings: true },
    });

    await this.auditService.log({
      actorId: actor.id,
      actorRole: 'field_host',
      actionType: `HANDOVER_${dto.handoverType}_CREATED`,
      entityName: 'DigitalHandover',
      entityId: handover.id,
      newValue: {
        contractNumber: contract.contractNumber,
        reportSha256,
        itemsInspectedCount: items.length,
        utilityPhotoEvidence: utilityReadings.map((reading) => ({
          utilityType: reading.utilityType,
          photoKey: reading.photoEvidence.key,
          sha256: reading.photoEvidence.sha256,
          uploadedAt: reading.photoEvidence.uploadedAt,
        })),
      },
    });

    this.logger.log(`[DIGITAL HANDOVER] Created ${handover.id} for contract ${contract.contractNumber}.`);
    return {
      success: true,
      handoverId: handover.id,
      handoverType: handover.handoverType,
      unitCode: contract.unit.unitCode,
      tenantName: contract.tenant.fullName,
      reportSha256,
      inspectedItems: handover.items.length,
      utilityMeters: handover.utilityReadings,
    };
  }

  async getHandoverByContract(contractId: string, actor: Actor) {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, tenantId: true, landlordId: true },
    });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng');
    if (actor.role !== 'ops_admin' && actor.id !== contract.tenantId && actor.id !== contract.landlordId) {
      throw new ForbiddenException('Bạn không có quyền xem biên bản của hợp đồng này.');
    }

    const handovers = await this.prisma.digitalHandover.findMany({
      where: { contractId },
      include: { items: true, utilityReadings: true },
      orderBy: { inspectedAt: 'desc' },
    });
    const keys = handovers.flatMap((handover: any) => [
      ...handover.items.flatMap((item: any) => (Array.isArray(item.photos) ? item.photos.map((photo: any) => photo.key) : [])),
      ...handover.utilityReadings.map((reading: any) => reading.photoKey),
    ]);
    const signedUrls = await this.storage.signedUrls(keys);

    return handovers.map((handover: any) => ({
      ...handover,
      items: handover.items.map((item: any) => ({
        ...item,
        photos: (Array.isArray(item.photos) ? item.photos : []).map((photo: any) => ({
          ...photo,
          url: signedUrls.get(photo.key) ?? null,
        })),
      })),
      utilityReadings: handover.utilityReadings.map((reading: any) => ({
        ...reading,
        photoUrl: signedUrls.get(reading.photoKey) ?? null,
      })),
    }));
  }
}
