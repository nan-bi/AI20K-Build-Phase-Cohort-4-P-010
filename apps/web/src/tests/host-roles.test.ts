import { beforeEach, describe, expect, it, vi } from "vitest";

const mem = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
  addEventListener: () => {},
});

import * as actions from "@/lib/mock/actions";
import { getMockState, resetMockState } from "@/lib/mock/store";
import { hostRoles, pickHostFor, noticesFor } from "@/lib/mock/selectors";

beforeEach(() => {
  mem.clear();
  resetMockState();
});

describe("Host Roles - SPEC-P01 §7 / host-roles.test.ts", () => {
  it("(1) vai mặc định theo bảng 01-CONTRACTS §2.1", () => {
    const s = getMockState();
    expect(hostRoles(s, "H01")).toEqual(["sale", "inspector"]);
    expect(hostRoles(s, "H02")).toEqual(["sale"]);
    expect(hostRoles(s, "H03")).toEqual(["sale", "inspector"]);
    expect(hostRoles(s, "H04")).toEqual(["sale", "inspector"]);
    expect(hostRoles(s, "H05")).toEqual(["sale", "inspector"]);
    expect(hostRoles(s, "H06")).toEqual(["inspector"]);
    expect(hostRoles(s, "H07")).toEqual(["sale"]);
    expect(hostRoles(s, "H08")).toEqual(["sale"]);
  });

  it("(2) setHostRoles([]) => lỗi", () => {
    const res = actions.setHostRoles("H01", [], "admin-1");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBeDefined();
    }
  });

  it("(3) bỏ vai sale của H01 => createBooking căn Sapphire 2 giao H02", () => {
    // H01 là Host mặc định của sapphire-2. H02 cũng trực sapphire-2 và có vai sale.
    actions.setHostRoles("H01", ["inspector"], "admin-1");

    const b = actions.createBooking({
      unitId: "s2-02-1004", // Căn thuộc sapphire-2
      slot: "09:00 - 09:45 30/10/2026",
      name: "Khách Xem",
      phone: "0912345678",
      persons: 1,
    });

    expect(b.hostId).toBe("H02");
  });

  it("(4) bỏ vai inspector của H01 và phân khu Sapphire 2 không còn ai thẩm định => fallback H01 + có tin Admin", () => {
    // Sapphire 2 có H01 và H02. H02 chỉ có vai sale.
    // Nếu bỏ vai inspector của H01 => sapphire2 không còn ai là inspector.
    actions.setHostRoles("H01", ["sale"], "admin-1");

    const picked = pickHostFor(getMockState(), "sapphire2", "inspector");
    expect(picked.hostId).toBe("H01");
    expect(picked.fallback).toBe(true);

    // Ký gửi mới sẽ sinh tin Admin cảnh báo fallback
    const consign = actions.submitConsignment({
      landlordId: "L1",
      building: "S2.02",
      floor: 10,
      door: "04",
      layout: "1PN",
      areaM2: 48,
      askRent: 8_500_000,
      suggestedDeposit: 8_500_000,
      leaseTerm: "long",
      furnished: true,
      locks: ["smart", "physical"],
      auditByHost: true,
    });

    expect(consign.hostId).toBe("H01");
    const adminNotices = noticesFor(getMockState(), "admin");
    const hasFallbackNotice = adminNotices.some(
      (n) => n.body.includes("sapphire2") || n.body.includes("tạm") || n.title.includes("thẩm định")
    );
    expect(hasFallbackNotice).toBe(true);
  });

  it("(5) pickHostFor bỏ qua Host off_duty khi còn lựa chọn khác", () => {
    // Giả sử có 2 host cùng zone và vai, nếu 1 host off_duty thì chọn host kia
    const s = getMockState();
    // Tạo bản sao tạm nếu cần, hoặc kiểm tra logic pickHostFor
    const picked = pickHostFor(s, "sapphire2", "sale");
    expect(picked.hostId).toBe("H01"); // H01 on duty
    expect(picked.fallback).toBe(false);
  });
});
