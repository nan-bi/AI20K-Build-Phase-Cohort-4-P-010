import { PhoneService } from '../auth/phone/phone.service';
import { fakeConfig } from '../auth/testing/fake-config';
import { classifyDoorRef, extractPlainPin, planRekey } from './door-code.util';
import { DoorCodeService } from './door-code.service';

const phones = new PhoneService(fakeConfig({ AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!', NODE_ENV: 'test' }));

describe('classifyDoorRef — 4 định dạng (SPEC-P02 §6 ca 13)', () => {
  it('phân loại aes / chuỗi giữ chỗ / PIN để trần / thiếu', () => {
    expect(classifyDoorRef(`aes:${phones.encrypt('482910')}`)).toBe('aes');
    expect(classifyDoorRef('vault:aes256:door_pin:VHOP-S1.02-1208')).toBe('placeholder');
    expect(classifyDoorRef('vault:enc:pin:482910')).toBe('plain_pin');
    expect(classifyDoorRef('vault:aes256:pin:482910')).toBe('plain_pin');
    expect(classifyDoorRef('aes:')).toBe('missing');
    expect(classifyDoorRef(null)).toBe('missing');
    expect(classifyDoorRef('')).toBe('missing');
    expect(extractPlainPin('vault:enc:pin:482910')).toBe('482910');
    expect(extractPlainPin('vault:aes256:door_pin:X')).toBeNull();
  });
});

describe('planRekey', () => {
  it('aes: đọc được ⇒ giữ nguyên (idempotent)', () => {
    expect(planRekey(`aes:${phones.encrypt('482910')}`, true)).toEqual({ action: 'keep' });
  });
  it('PIN để trần ⇒ mã hoá lại GIỮ NGUYÊN số', () => {
    expect(planRekey('vault:enc:pin:482910', false)).toEqual({ action: 'rekey', pin: '482910' });
  });
  it('bỏ qua chuỗi giữ chỗ / thiếu / aes: hỏng thay vì tự ghi PIN giả', () => {
    expect(planRekey('vault:aes256:door_pin:U', false)).toEqual({ action: 'skip', reason: 'placeholder' });
    expect(planRekey(null, false)).toEqual({ action: 'skip', reason: 'missing' });
    expect(planRekey('aes:hong', false)).toEqual({ action: 'skip', reason: 'unreadable_aes' });
  });
});

describe('DoorCodeService.readPin', () => {
  const svc = (key: any) =>
    new DoorCodeService({ doorAccessKey: { findUnique: async () => key } } as any, phones);

  it('đọc đúng PIN từ aes:; khoá bị thu hồi ⇒ null; chìa cơ ⇒ PHYSICAL_KEY không PIN', async () => {
    const s = svc({ keyType: 'ELECTRONIC_PIN', status: 'ACTIVE', vaultSecretRef: `aes:${phones.encrypt('482910')}` });
    expect(await s.readPin('u1')).toEqual({ type: 'ELECTRONIC_PIN', pin: '482910' });
    expect(await svc({ keyType: 'ELECTRONIC_PIN', status: 'REVOKED', vaultSecretRef: `aes:${phones.encrypt('482910')}` }).readPin('u1')).toBeNull();
    expect(await svc({ keyType: 'PHYSICAL_KEY', status: 'ACTIVE', vaultSecretRef: null }).readPin('u1')).toEqual({ type: 'PHYSICAL_KEY' });
    expect(await svc(null).readPin('u1')).toBeNull();
  });

  it('encryptDoorPin → readPin khứ hồi; ciphertext không lộ PIN', async () => {
    const s = svc({ keyType: 'ELECTRONIC_PIN', status: 'ACTIVE', vaultSecretRef: new DoorCodeService({} as any, phones).encryptDoorPin('135790') });
    expect(await s.readPin('u1')).toEqual({ type: 'ELECTRONIC_PIN', pin: '135790' });
    expect(new DoorCodeService({} as any, phones).encryptDoorPin('135790')).not.toContain('135790');
  });
});
