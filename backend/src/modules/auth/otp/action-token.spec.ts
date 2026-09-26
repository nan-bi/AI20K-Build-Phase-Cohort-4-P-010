import { ActionTokenInvalidError, signActionToken, verifyActionTokenSignature } from './action-token';

const secret = 'test-secret';
const base = { phone: '+84912345678', purpose: 'TENANT_VIEWING' as const, jti: 'otp-1' };

describe('action-token', () => {
  it('khứ hồi token hợp lệ', () => {
    const payload = verifyActionTokenSignature(signActionToken(base, secret), 'TENANT_VIEWING', secret);
    expect(payload).toMatchObject(base);
  });

  it('từ chối token ký bằng secret khác', () => {
    const token = signActionToken(base, secret);
    expect(() => verifyActionTokenSignature(token, 'TENANT_VIEWING', 'wrong')).toThrow(ActionTokenInvalidError);
  });

  it('từ chối token dùng sai mục đích', () => {
    const token = signActionToken(base, secret);
    expect(() => verifyActionTokenSignature(token, 'TENANT_DEPOSIT_SIGN', secret)).toThrow(ActionTokenInvalidError);
  });

  it('từ chối token hết hạn', () => {
    const token = signActionToken(base, secret, -1);
    expect(() => verifyActionTokenSignature(token, 'TENANT_VIEWING', secret)).toThrow(ActionTokenInvalidError);
  });

  it('từ chối token sai định dạng', () => {
    expect(() => verifyActionTokenSignature('not-a-token', 'TENANT_VIEWING', secret)).toThrow(ActionTokenInvalidError);
    expect(() => verifyActionTokenSignature('', 'TENANT_VIEWING', secret)).toThrow(ActionTokenInvalidError);
  });

  it('từ chối payload bị sửa nhưng giữ chữ ký cũ', () => {
    const [, sig] = signActionToken(base, secret).split('.');
    const forged = Buffer.from(JSON.stringify({ ...base, phone: '+84900000000', exp: 9999999999 })).toString('base64url');
    expect(() => verifyActionTokenSignature(`${forged}.${sig}`, 'TENANT_VIEWING', secret)).toThrow(ActionTokenInvalidError);
  });
});
