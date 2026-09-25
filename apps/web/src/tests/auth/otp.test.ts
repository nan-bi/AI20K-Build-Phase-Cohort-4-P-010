import { describe, expect, it } from "vitest";
import { generateOtpCode, hashOtpCode, otpHashesEqual } from "@/lib/auth/otpCrypto";
import { normalizeVnPhone, isValidVnPhone } from "@/lib/auth/phone";
import { signActionToken, verifyActionTokenSignature, ActionTokenInvalidError } from "@/lib/auth/actionToken";

describe("otpCrypto", () => {
  it("generates a zero-padded 4-digit code", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{4}$/);
    }
  });

  it("hashes deterministically for the same pepper", () => {
    const a = hashOtpCode("1234", "pepper");
    const b = hashOtpCode("1234", "pepper");
    expect(a).toBe(b);
  });

  it("hashes differently for a different pepper", () => {
    const a = hashOtpCode("1234", "pepper-a");
    const b = hashOtpCode("1234", "pepper-b");
    expect(a).not.toBe(b);
  });

  it("otpHashesEqual matches equal hashes and rejects unequal ones", () => {
    const hash = hashOtpCode("1234", "pepper");
    expect(otpHashesEqual(hash, hashOtpCode("1234", "pepper"))).toBe(true);
    expect(otpHashesEqual(hash, hashOtpCode("9999", "pepper"))).toBe(false);
  });
});

describe("normalizeVnPhone", () => {
  it("normalizes local 0-prefixed numbers to E.164", () => {
    expect(normalizeVnPhone("0912345678")).toBe("+84912345678");
  });

  it("normalizes 84-prefixed numbers to E.164", () => {
    expect(normalizeVnPhone("84912345678")).toBe("+84912345678");
  });

  it("passes through already-normalized E.164 numbers", () => {
    expect(normalizeVnPhone("+84912345678")).toBe("+84912345678");
  });

  it("strips spaces/dashes before normalizing", () => {
    expect(normalizeVnPhone("091 234 5678")).toBe("+84912345678");
  });

  it("rejects implausible input", () => {
    expect(normalizeVnPhone("123")).toBeNull();
    expect(normalizeVnPhone("not-a-phone")).toBeNull();
  });

  it("isValidVnPhone mirrors normalizeVnPhone", () => {
    expect(isValidVnPhone("0912345678")).toBe(true);
    expect(isValidVnPhone("abc")).toBe(false);
  });
});

describe("actionToken", () => {
  const secret = "test-secret";

  it("round-trips a valid token", () => {
    const token = signActionToken({ phone: "+84912345678", purpose: "tenant_viewing" }, secret);
    const payload = verifyActionTokenSignature(token, "tenant_viewing", secret);
    expect(payload.phone).toBe("+84912345678");
    expect(payload.purpose).toBe("tenant_viewing");
  });

  it("rejects a token signed with a different secret", () => {
    const token = signActionToken({ phone: "+84912345678", purpose: "tenant_viewing" }, secret);
    expect(() => verifyActionTokenSignature(token, "tenant_viewing", "wrong-secret")).toThrow(
      ActionTokenInvalidError,
    );
  });

  it("rejects a token used for the wrong purpose", () => {
    const token = signActionToken({ phone: "+84912345678", purpose: "tenant_viewing" }, secret);
    expect(() => verifyActionTokenSignature(token, "tenant_deposit_sign", secret)).toThrow(
      ActionTokenInvalidError,
    );
  });

  it("rejects an expired token", () => {
    const token = signActionToken({ phone: "+84912345678", purpose: "tenant_viewing" }, secret, -1);
    expect(() => verifyActionTokenSignature(token, "tenant_viewing", secret)).toThrow(
      ActionTokenInvalidError,
    );
  });

  it("rejects a malformed token", () => {
    expect(() => verifyActionTokenSignature("not-a-token", "tenant_viewing", secret)).toThrow(
      ActionTokenInvalidError,
    );
  });
});
