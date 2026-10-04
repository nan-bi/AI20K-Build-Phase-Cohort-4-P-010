import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AdminActor } from './admin-fee.service';

export const ADMIN_KEY_CRYPTO = 'ADMIN_KEY_CRYPTO';
export interface KeyCrypto {
  encrypt(plain: string): string;
}

@Injectable()
export class AdminKeyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(ADMIN_KEY_CRYPTO) private readonly crypto: KeyCrypto,
  ) {}

  async listKeys() {
    const rows: any[] = (await this.prisma.doorAccessKey.findMany({
      include: { unit: true },
      orderBy: { issuedAt: 'desc' },
    } as any)) as any;
    return rows.map((k) => ({
      id: k.id,
      unitCode: k.unit?.unitCode,
      keyType: k.keyType,
      status: k.status,
      issuedAt: k.issuedAt,
      lastRotatedAt: k.lastRotatedAt,
      revokedAt: k.revokedAt,
    }));
  }

  async rotateKey(id: string, dto: { reason: string }, actor: AdminActor, now: Date = new Date()) {
    if (!dto.reason?.trim()) throw new BadRequestException('Cần nhập lý do');
    const key = await this.load(id);
    if (key.keyType !== 'ELECTRONIC_PIN') throw new BadRequestException('Chỉ xoay được mã điện tử');
    if (key.status === 'REVOKED') throw new ConflictException('Khóa đã bị thu hồi');

    const pin = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.doorAccessKey.update({
      where: { id },
      data: { vaultSecretRef: this.crypto.encrypt(pin), lastRotatedAt: now },
    });
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'DOOR_KEY_ROTATED',
      entityName: 'door_access_keys',
      entityId: id,
      oldValue: { status: key.status },
      newValue: { status: key.status, reason: dto.reason },
    } as any);
    return { id, status: key.status, rotated: true };
  }

  async revokeKey(id: string, dto: { reason: string }, actor: AdminActor, now: Date = new Date()) {
    if (!dto.reason?.trim()) throw new BadRequestException('Cần nhập lý do');
    const key = await this.load(id);
    if (key.status === 'REVOKED') throw new ConflictException('Khóa đã bị thu hồi');

    const oldStatus = key.status;
    await this.prisma.doorAccessKey.update({
      where: { id },
      data: { status: 'REVOKED', vaultSecretRef: null, revokedAt: now },
    });
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      actionType: 'DOOR_KEY_REVOKED',
      entityName: 'door_access_keys',
      entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status: 'REVOKED', reason: dto.reason },
    } as any);
    return { id, status: 'REVOKED' };
  }

  private async load(id: string): Promise<any> {
    const key = await this.prisma.doorAccessKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('Không tìm thấy khóa');
    return key;
  }
}