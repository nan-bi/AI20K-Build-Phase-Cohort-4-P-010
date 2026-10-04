import { describe, expect, it } from "vitest";
import { hostGateRedirect, hostHome } from "@/lib/auth/portals";
import { errorMessage, unwrap } from "@/components/auth/authApi";
import { hostFilterQuery } from "@/lib/admin/hosts";
import { rebuildCookieHeader } from "@/lib/auth/setCookie";

describe("hostHome", () => {
  it("W1: trang đích theo vai", () => {
    expect(hostHome(["sale"])).toBe("/host/dispatch");
    expect(hostHome(["sale", "inspector"])).toBe("/host/dispatch");
    expect(hostHome(["inspector"])).toBe("/host/inspections");
    expect(hostHome([])).toBe("/host/account");
  });
});

describe("errorMessage — mã lỗi Field Host", () => {
  const DEFAULT = errorMessage("khong_co_ma_nay");
  it("W2: 6 mã mới có câu riêng, mã cũ của luồng RFID đã bỏ", () => {
    for (const code of [
      "host_not_provisioned",
      "host_role_missing",
      "host_not_found",
      "host_already_exists",
      "host_has_active_tickets",
      "invalid_zone",
    ]) {
      expect(errorMessage(code), code).not.toBe(DEFAULT);
    }
    for (const code of ["rfid_mismatch", "invalid_host", "rfid_in_use"]) {
      expect(errorMessage(code), code).toBe(DEFAULT);
    }
  });

  it("W2b: unwrap lỗi giữ chi tiết `errors`", () => {
    const r = unwrap({ ok: false, status: 403 }, { code: "host_role_missing", errors: { required: ["sale"] } });
    expect(r.code).toBe("host_role_missing");
    expect(r.errors).toEqual({ required: ["sale"] });
  });
});

describe("hostGateRedirect", () => {
  it("W3: Host chưa có hồ sơ field_hosts bị đưa về trang đăng nhập; Host đủ hồ sơ và cổng khác thì qua", () => {
    expect(hostGateRedirect({ portal: "host", isHostVerified: false })).toBe(
      "/admin/login?tab=host&error=host_not_provisioned",
    );
    expect(hostGateRedirect({ portal: "host", isHostVerified: true })).toBeNull();
    expect(hostGateRedirect({ portal: "admin", isHostVerified: false })).toBeNull();
  });
});

describe("hostFilterQuery", () => {
  it("W4: dựng query string, bỏ tham số rỗng", () => {
    expect(hostFilterQuery({})).toBe("");
    expect(hostFilterQuery({ q: "  ", role: undefined })).toBe("");
    expect(hostFilterQuery({ role: "both", zone: "The Sapphire 1", active: false })).toBe(
      "?role=both&zone=The+Sapphire+1&active=false",
    );
  });
});

describe("rebuildCookieHeader", () => {
  const hint = "vs_google_hint=" + encodeURIComponent(JSON.stringify({ name: "Phương Nam", email: "a@b.vn" }));

  it("giữ cookie mã hoá phần trăm nguyên vẹn: header chỉ gồm ký tự Latin-1 (lỗi ByteString khi đăng nhập Google tên có dấu)", () => {
    const header = rebuildCookieHeader(`vs_access=abc.def.ghi; ${hint}`, []);
    expect(header).toContain(hint);
    expect([...header].every((c) => c.charCodeAt(0) <= 255)).toBe(true);
    expect(() => new Headers().set("cookie", header)).not.toThrow();
  });

  it("áp Set-Cookie của backend: đặt mới/thay giá trị, xoá cookie hết hạn", () => {
    const header = rebuildCookieHeader(`vs_access=old; ${hint}`, ["vs_access=new; Path=/; HttpOnly", "vs_google_hint=; Max-Age=0; Path=/"]);
    expect(header).toBe("vs_access=new");
  });
});
