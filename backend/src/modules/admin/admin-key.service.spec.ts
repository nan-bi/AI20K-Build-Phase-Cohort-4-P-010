/// <reference types="jest" />
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminKeyService } from './admin-key.service';

const ACTOR = { id: '11111111-1111-1111-1111-111111111111', role: 'ops_admin' };
const NOW = new Date('2026-10-04T03:00:00Z');
const OLD_CIPHER = 'aes:OLD-CIPHERTEXT';

function key(over: any = {}) {
  return {
    id: 'k1',
    unitId: 'u1',
    keyType: 'ELECTRONIC_PIN',
    vaultSecretRef: OLD_CIPHER,
    physicalKeyState: null,
    status: 'ACTIVE',
    issuedAt: new Date('2026-09-01'),
    lastRotatedAt: null,
    revokedAt: null,
    unit: { unitCode: 'VHOP-S1.02-12A08' },
    ...over,
  };
}

function build(k: any = key()) {
  const prisma: any = {
    doorAccessKey: {
      findMany: jest.fn(async () => (k ? [k] : [])),
      findUnique: jest.fn(async () => k),
      update: jest.fn(async ({ data }: any) => Object.assign(k, data)),
    },
    $transaction: jest.fn(async (cb: any) => cb(prisma)),
  };
  const audit = { log: jest.fn(async () => ({})) };
  const crypto = { encrypt: jest.fn((s: string) => `ENC(${s})`) };
  return { svc: new AdminKeyService(prisma, audit as any, crypto), prisma, audit, crypto, k };
}

describe('AdminKeyService — mã khóa cửa (không bao giờ trả plaintext)', () => {
  it('liệt kê chỉ metadata: không có vaultSecretRef', async () => {
    const { svc } = build();
    const r: any[] = await svc.listKeys();
    expect(r[0]).toMatchObject({ id: 'k1', unitCode: 'VHOP-S1.02-12A08', keyType: 'ELECTRONIC_PIN', status: 'ACTIVE' });
    expect(JSON.stringify(r)).not.toMatch(/vaultSecretRef|CIPHERTEXT/);
  });

  it('rotate: sinh PIN 6 số, lưu bản mã hóa, cập nhật lastRotatedAt; response/audit không chứa PIN hay bản mã', async () => {
    const { svc, k, crypto, audit } = build();
    const r: any = await svc.rotateKey('k1', { reason: 'Khách cũ trả phòng' }, ACTOR, NOW);
    const pin = crypto.encrypt.mock.calls[0][0];
    expect(pin).toMatch(/^\d{6}$/);
    expect(k.vaultSecretRef).toBe(`ENC(${pin})`);
    expect(k.vaultSecretRef).not.toBe(OLD_CIPHER);
    expect(k.lastRotatedAt).toEqual(NOW);
    expect(r).toMatchObject({ id: 'k1', status: 'ACTIVE', rotated: true });
    const leaked = JSON.stringify([r, audit.log.mock.calls]);
    expect(leaked).not.toContain(pin);
    expect(leaked).not.toContain('ENC(');
    expect(leaked).not.toContain(OLD_CIPHER);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ACTOR.id,
        actorRole: 'ops_admin',
        actionType: 'DOOR_KEY_ROTATED',
        entityName: 'door_access_keys',
        entityId: 'k1',
        newValue: expect.objectContaining({ reason: 'Khách cũ trả phòng' }),
      }),
    );
  });

  it('rotate: thiếu lý do ⇒ 400; không có khóa ⇒ 404; khóa vật lý ⇒ 400; đã REVOKED ⇒ 409', async () => {
    const a = build();
    await expect(a.svc.rotateKey('k1', { reason: ' ' }, ACTOR, NOW)).rejects.toBeInstanceOf(BadRequestException);
    const b = build(null);
    await expect(b.svc.rotateKey('k1', { reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(NotFoundException);
    const c = build(key({ keyType: 'PHYSICAL_KEY', vaultSecretRef: null }));
    await expect(c.svc.rotateKey('k1', { reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(BadRequestException);
    const d = build(key({ status: 'REVOKED' }));
    await expect(d.svc.rotateKey('k1', { reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
  });

  it('revoke: REVOKED, xóa vaultSecretRef, ghi revokedAt, audit không lộ bí mật', async () => {
    const { svc, k, audit } = build();
    const r: any = await svc.revokeKey('k1', { reason: 'Hết hợp đồng' }, ACTOR, NOW);
    expect(k.status).toBe('REVOKED');
    expect(k.vaultSecretRef).toBeNull();
    expect(k.revokedAt).toEqual(NOW);
    expect(r).toMatchObject({ id: 'k1', status: 'REVOKED' });
    expect(JSON.stringify([r, audit.log.mock.calls])).not.toMatch(/CIPHERTEXT|ENC\(/);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'DOOR_KEY_REVOKED',
        oldValue: expect.objectContaining({ status: 'ACTIVE' }),
        newValue: expect.objectContaining({ status: 'REVOKED', reason: 'Hết hợp đồng' }),
      }),
    );
  });

  it('revoke: lần hai ⇒ 409, thiếu lý do ⇒ 400, không có khóa ⇒ 404', async () => {
    const { svc } = build();
    await svc.revokeKey('k1', { reason: 'x' }, ACTOR, NOW);
    await expect(svc.revokeKey('k1', { reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(ConflictException);
    await expect(build().svc.revokeKey('k1', { reason: '' }, ACTOR, NOW)).rejects.toBeInstanceOf(BadRequestException);
    await expect(build(null).svc.revokeKey('k1', { reason: 'x' }, ACTOR, NOW)).rejects.toBeInstanceOf(NotFoundException);
  });
});
