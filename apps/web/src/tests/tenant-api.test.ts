import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ERROR_MESSAGES, errorText, tenantApi } from "@/lib/tenant/api";

describe("tenant-api & errorText (SPEC-P04 §8)", () => {
  it("mỗi mã lỗi trong bảng 01 §6 trả về câu thông báo tiếng Việt chính xác", () => {
    const codes = [
      "invalid_request",
      "unauthorized",
      "forbidden",
      "otp_required",
      "action_token_invalid",
      "otp_invalid",
      "otp_not_found_or_expired",
      "otp_locked",
      "otp_cooldown",
      "phone_already_registered",
      "unit_not_found",
      "unit_not_available",
      "slot_invalid",
      "slot_taken",
      "booking_not_found",
      "bad_status",
      "too_late_to_modify",
      "already_rated",
      "terms_version_stale",
      "unit_already_held",
      "hold_expired",
      "ekyc_already_done",
      "scan_expired",
      "kyc_fields_invalid",
      "kyc_confirmation_required",
      "lease_terms_invalid",
      "pdf_pending",
      "not_found",
    ];

    for (const code of codes) {
      expect(ERROR_MESSAGES[code]).toBeDefined();
      const text = errorText(code);
      expect(text).toBe(ERROR_MESSAGES[code]);
      expect(text.length).toBeGreaterThan(5);
    }
  });

  it("errorText hỗ trợ cả ApiResponse object lẫn fallback", () => {
    expect(errorText({ ok: false, status: 409, code: "slot_taken", data: {} })).toContain("vừa có người đặt");
    expect(errorText(null, "Mặc định")).toBe("Mặc định");
  });

  it("A6 gửi actionToken khi có tham số", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => {
      return new Response(JSON.stringify({ ok: true, data: { ref: "VS-TEST1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    await tenantApi.createBooking({
      unitCode: "VHOP-S1.02-1208",
      slot: "2026-10-05T01:30:00Z",
      contactName: "Khách Test",
      phone: "+84912345678",
      partySize: 2,
      actionToken: "sample-token-abc",
    });

    expect(spy).toHaveBeenCalled();
    const callArgs = spy.mock.calls[0];
    const body = JSON.parse(callArgs[1]?.body as string);
    expect(body.actionToken).toBe("sample-token-abc");

    spy.mockRestore();
  });

  it("tuyệt đối không có .catch(() => null) trong lib/tenant/api.ts", () => {
    const filePath = resolve(__dirname, "../lib/tenant/api.ts");
    const content = readFileSync(filePath, "utf-8");
    expect(content).not.toContain(".catch(() => null)");
  });
});
