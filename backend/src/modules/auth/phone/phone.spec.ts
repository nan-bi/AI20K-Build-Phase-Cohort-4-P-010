import { isValidVnPhone, normalizeVnPhone } from './phone';

describe('normalizeVnPhone', () => {
  it('chuẩn hóa số bắt đầu bằng 0 về E.164', () => {
    expect(normalizeVnPhone('0912345678')).toBe('+84912345678');
  });

  it('chuẩn hóa số bắt đầu bằng 84', () => {
    expect(normalizeVnPhone('84912345678')).toBe('+84912345678');
  });

  it('giữ nguyên số đã ở dạng E.164', () => {
    expect(normalizeVnPhone('+84912345678')).toBe('+84912345678');
  });

  it('bỏ khoảng trắng/gạch nối trước khi chuẩn hóa', () => {
    expect(normalizeVnPhone('091 234 5678')).toBe('+84912345678');
    expect(normalizeVnPhone('(091) 234-5678')).toBe('+84912345678');
  });

  it('từ chối đầu vào không hợp lệ', () => {
    expect(normalizeVnPhone('123')).toBeNull();
    expect(normalizeVnPhone('not-a-phone')).toBeNull();
    expect(normalizeVnPhone('')).toBeNull();
  });

  it('isValidVnPhone khớp normalizeVnPhone', () => {
    expect(isValidVnPhone('0912345678')).toBe(true);
    expect(isValidVnPhone('abc')).toBe(false);
  });
});
