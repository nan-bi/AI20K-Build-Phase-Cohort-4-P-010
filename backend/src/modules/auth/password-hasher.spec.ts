import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './password-hasher';

describe('password-hasher (scrypt)', () => {
  it('định dạng scrypt$<salt>$<hash>, không chứa mật khẩu thô', async () => {
    const hash = await hashPassword('Matkhau-Manh-1');
    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(hash).not.toContain('Matkhau-Manh-1');
  });

  it('cùng mật khẩu băm hai lần cho kết quả khác nhau (salt riêng) nhưng đều verify đúng', async () => {
    const [a, b] = await Promise.all([hashPassword('same-password'), hashPassword('same-password')]);
    expect(a).not.toBe(b);
    expect(await verifyPassword('same-password', a)).toBe(true);
    expect(await verifyPassword('same-password', b)).toBe(true);
  });

  it('mật khẩu sai (kể cả khác hoa/thường hay thừa khoảng trắng) → false', async () => {
    const hash = await hashPassword('Abc12345');
    expect(await verifyPassword('abc12345', hash)).toBe(false);
    expect(await verifyPassword('Abc12345 ', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it.each([
    ['chuỗi rỗng', ''],
    ['không có dấu $', 'khong-phai-hash'],
    ['sai tiền tố', 'bcrypt$aa$bb'],
    ['thiếu hash', 'scrypt$aabb'],
    ['thiếu salt', 'scrypt$$aabb'],
    ['hash sai độ dài', `scrypt$${'00'.repeat(16)}$abcd`],
    ['hash không phải hex', `scrypt$${'00'.repeat(16)}$${'zz'.repeat(64)}`],
  ])('định dạng hỏng (%s) → false, không ném lỗi', async (_name, stored) => {
    await expect(verifyPassword('whatever', stored)).resolves.toBe(false);
  });

  it('chuẩn hoá NFKC: dạng viết khác nhau của cùng một ký tự vẫn khớp', async () => {
    const composed = 'Mật-khẩu'; // dựng sẵn
    const decomposed = composed.normalize('NFD');
    expect(decomposed).not.toBe(composed);
    const hash = await hashPassword(composed);
    expect(await verifyPassword(decomposed, hash)).toBe(true);
    // Ký tự tương thích (full-width) cũng được đưa về dạng chuẩn.
    const fullWidth = await hashPassword('ＡＢＣ12345');
    expect(await verifyPassword('ABC12345', fullWidth)).toBe(true);
  });

  it('DUMMY_PASSWORD_HASH đúng định dạng nhưng không khớp mật khẩu nào thông thường', async () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword('', DUMMY_PASSWORD_HASH)).toBe(false);
    expect(await verifyPassword('password', DUMMY_PASSWORD_HASH)).toBe(false);
  });
});
