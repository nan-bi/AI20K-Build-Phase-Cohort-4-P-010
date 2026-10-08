import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { choiceOfRoles, hostRoleLabel, rolesOfChoice } from "@/lib/admin/hosts";
import { HostRoleRadios } from "@/components/admin/HostRoleRadios";
import { adminHostsApi } from "@/lib/admin/hosts";

describe("W6 vai Host trên Admin", () => {
  it("radio → đúng 2 tập vai gửi backend", () => {
    expect(rolesOfChoice("sale")).toEqual(["sale"]);
    expect(rolesOfChoice("sale_inspector")).toEqual(["sale", "inspector"]);
  });

  it("Host cũ chỉ có inspector hiển thị là 'Sale + Thẩm định'", () => {
    expect(hostRoleLabel(["inspector"])).toBe("Sale + Thẩm định");
    expect(choiceOfRoles(["inspector"])).toBe("sale_inspector");
    expect(hostRoleLabel(["sale", "inspector"])).toBe("Sale + Thẩm định");
    expect(hostRoleLabel(["sale"])).toBe("Sale");
    expect(choiceOfRoles([])).toBe("sale");
  });

  it("render 2 radio, đúng 1 được chọn, không còn checkbox vai", () => {
    const html = renderToStaticMarkup(createElement(HostRoleRadios, { name: "r", value: "sale_inspector", onChange: () => {} }));
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html).not.toContain('type="checkbox"');
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain("Sale + Thẩm định");
  });

  it("payload create/update chứa đúng roles", async () => {
    const bodies: unknown[] = [];
    vi.stubGlobal("fetch", async (_u: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return new Response("{}", { status: 200 });
    });
    await adminHostsApi.create({ email: "a@b.vn", fullName: "A B", assignedZone: "S1", roles: rolesOfChoice("sale") });
    await adminHostsApi.update("h1", { roles: rolesOfChoice("sale_inspector") });
    vi.unstubAllGlobals();
    expect((bodies[0] as { roles: string[] }).roles).toEqual(["sale"]);
    expect((bodies[1] as { roles: string[] }).roles).toEqual(["sale", "inspector"]);
  });

  it("source AdminHosts/AdminHostDetail không còn checkbox vai", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    for (const f of ["AdminHosts.tsx", "AdminHostDetail.tsx"]) {
      const src = readFileSync(resolve(__dirname, "../components/admin", f), "utf8");
      expect(src, f).not.toMatch(/toggleRole|checked=\{roles\.includes/);
    }
  });
});
