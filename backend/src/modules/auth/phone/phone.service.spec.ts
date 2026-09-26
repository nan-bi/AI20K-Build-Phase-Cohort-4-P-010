import { fakeConfig } from '../testing/fake-config';
import { PhoneService } from './phone.service';

const service = (env: Record<string, string> = { AES_SECRET_KEY: 'a-test-master-secret-of-32-chars!!' }) =>
  new PhoneService(fakeConfig(env));

describe('PhoneService', () => {
  it('hash ổn định, 64 ký tự hex, khác nhau theo số và theo khóa gốc', () => {
    const a = service();
    expect(a.hash('+84912345678')).toBe(a.hash('+84912345678'));
    expect(a.hash('+84912345678')).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash('+84912345678')).not.toBe(a.hash('+84912345679'));
    expect(a.hash('+84912345678')).not.toBe(service({ AES_SECRET_KEY: 'another-master-secret-32-chars!!!!' }).hash('+84912345678'));
  });

  it('mã hóa AES-GCM khứ hồi và không lộ plaintext', () => {
    const svc = service();
    const encrypted = svc.encrypt('+84912345678');
    expect(encrypted).not.toContain('84912345678');
    expect(svc.decrypt(encrypted)).toBe('+84912345678');
  });

  it('mỗi lần mã hóa cho ciphertext khác nhau (IV ngẫu nhiên)', () => {
    const svc = service();
    expect(svc.encrypt('+84912345678')).not.toBe(svc.encrypt('+84912345678'));
  });

  it('phát hiện ciphertext bị sửa (GCM auth tag)', () => {
    const svc = service();
    const [v, iv, tag, ct] = svc.encrypt('+84912345678').split(':');
    const tampered = [v, iv, tag, Buffer.from('x' + Buffer.from(ct, 'base64url').toString('latin1')).toString('base64url')].join(':');
    expect(() => svc.decrypt(tampered)).toThrow();
  });

  it('production bắt buộc có AES_SECRET_KEY', () => {
    expect(() => service({ NODE_ENV: 'production' })).toThrow(/AES_SECRET_KEY/);
  });
});
