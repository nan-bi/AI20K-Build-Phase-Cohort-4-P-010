import { generateOtpCode, hashOtpCode, otpHashesEqual } from './otp-crypto';

describe('otp-crypto', () => {
  it('sinh mã 4 chữ số có đệm số 0', () => {
    for (let i = 0; i < 50; i++) expect(generateOtpCode()).toMatch(/^\d{4}$/);
  });

  it('hash ổn định với cùng pepper, khác nhau với pepper khác', () => {
    expect(hashOtpCode('1234', 'pepper')).toBe(hashOtpCode('1234', 'pepper'));
    expect(hashOtpCode('1234', 'pepper-a')).not.toBe(hashOtpCode('1234', 'pepper-b'));
  });

  it('otpHashesEqual khớp hash bằng nhau và loại hash khác', () => {
    const hash = hashOtpCode('1234', 'pepper');
    expect(otpHashesEqual(hash, hashOtpCode('1234', 'pepper'))).toBe(true);
    expect(otpHashesEqual(hash, hashOtpCode('9999', 'pepper'))).toBe(false);
    expect(otpHashesEqual(hash, 'abcd')).toBe(false);
  });
});
