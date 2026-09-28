import { beforeEach, describe, expect, it, vi } from "vitest";

// Store chạy trên localStorage của trình duyệt; dựng window tối giản cho node
const mem = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
  addEventListener: () => {},
});

const { getMockState, resetMockState } = await import("@/lib/mock/store");
const { HOSTS, LANDLORDS } = await import("@/lib/mock/units");
const contracts = await import("@/lib/mock/contracts");
const { contractsUsingTemplate } = await import("@/lib/mock/contract-templates");

const FIXED_NOW = new Date("2026-09-28T12:00:00.000Z").getTime();

beforeEach(() => {
  mem.clear();
  resetMockState();
});

describe("Contract Parties & Partnership - P1-P10 (WP2)", () => {
  // P1: partnership rows
  it("P1: partnership rows = đúng HOSTS.length (8), docId DT-H0x, status active, needsAction false, parties = [host, platform] có id", () => {
    const state = getMockState();
    const rows = contracts.contractRows(state, FIXED_NOW);
    const partnershipRows = rows.filter((r) => r.kind === "partnership");

    expect(partnershipRows).toHaveLength(HOSTS.length);
    expect(partnershipRows.length).toBe(8);

    for (const r of partnershipRows) {
      expect(r.docId.startsWith("DT-")).toBe(true);
      expect(r.status).toBe("active");
      expect(r.needsAction).toBe(false);
      expect(r.hostId).toBeDefined();
      expect(r.parties).toHaveLength(2);
      expect(r.parties[0].role).toBe("host");
      expect(r.parties[0].id).toBe(r.hostId);
      expect(r.parties[1].role).toBe("platform");
      expect(r.parties[1].name).toBe("VinStay AI");
    }
  });

  // P2: KPI không đổi
  it("P2: KPI không đổi (contractKpis trên seed cùng số với hồ sơ 07: 3 · 1 · 2.000.000 · 2 · needsAction 2)", () => {
    const state = getMockState();
    const kpis = contracts.contractKpis(state, FIXED_NOW);
    expect(kpis.activeLeases).toBe(3);
    expect(kpis.expiringLeases).toBe(1);
    expect(kpis.heldDeposits).toBe(2_000_000);
    expect(kpis.exitingMandates).toBe(2);
    expect(kpis.needsAction).toBe(2);
  });

  // P3: party id & hostId
  it("P3: mọi party landlord/tenant/host có id; row holding/lease có hostId", () => {
    const state = getMockState();
    const rows = contracts.contractRows(state, FIXED_NOW);

    for (const r of rows) {
      for (const p of r.parties) {
        if (p.role === "landlord" || p.role === "tenant" || p.role === "host") {
          expect(p.id, `Party ${p.role} in row ${r.key} must have id`).toBeDefined();
          expect(typeof p.id).toBe("string");
          expect(p.id!.length).toBeGreaterThan(0);
        }
      }
      if (r.kind === "holding" || r.kind === "lease") {
        expect(r.hostId, `Row ${r.key} (${r.kind}) must have hostId`).toBeDefined();
      }
    }
  });

  // P4: tenantPartyId
  it("P4: tenantPartyId tất định, chuẩn hoá SĐT và không chứa số điện thoại", () => {
    const id1 = contracts.tenantPartyId("0945 121 212");
    const id2 = contracts.tenantPartyId("+84945121212");
    const id3 = contracts.tenantPartyId("0945121212");

    expect(id1).toBe(id2);
    expect(id1).toBe(id3);
    expect(id1.startsWith("T")).toBe(true);
    expect(id1).not.toContain("0945121212");
    expect(id1).not.toContain("0945");
  });

  // P5: contractParties
  it("P5: contractParties landlord = LANDLORDS.length, host = 8, tenant = số SĐT khác nhau; thứ tự landlord -> tenant -> host", () => {
    const state = getMockState();
    const parties = contracts.contractParties(state, FIXED_NOW);

    const landlords = parties.filter((p) => p.role === "landlord");
    const hosts = parties.filter((p) => p.role === "host");
    const tenants = parties.filter((p) => p.role === "tenant");

    expect(landlords).toHaveLength(LANDLORDS.length);
    expect(hosts).toHaveLength(HOSTS.length);
    expect(tenants.length).toBeGreaterThan(0);

    // Kiểm tra thứ tự: toàn bộ landlord trước, rồi đến tenant, rồi đến host
    const firstTenantIdx = parties.findIndex((p) => p.role === "tenant");
    const firstHostIdx = parties.findIndex((p) => p.role === "host");

    expect(firstTenantIdx).toBe(landlords.length);
    expect(firstHostIdx).toBe(landlords.length + tenants.length);

    // Tenant xếp theo tên tiếng Việt
    for (let i = 0; i < tenants.length - 1; i++) {
      expect(tenants[i].name.localeCompare(tenants[i + 1].name, "vi")).toBeLessThanOrEqual(0);
    }
  });

  // P6: contractsOfParty landlord
  it("P6: contractsOfParty landlord trả mọi row có party landlord đúng id; total khớp độ dài", () => {
    const state = getMockState();
    const parties = contracts.contractParties(state, FIXED_NOW);
    const hungLandlord = parties.find((p) => p.role === "landlord" && p.name.includes("Hùng"));
    expect(hungLandlord).toBeDefined();

    const related = contracts.contractsOfParty(state, hungLandlord!.key, FIXED_NOW);
    expect(related.length).toBe(hungLandlord!.total);
    for (const { row, relation } of related) {
      expect(relation).toBe("signatory");
      const hasParty = row.parties.some((p) => p.role === "landlord" && p.id === hungLandlord!.id);
      expect(hasParty).toBe(true);
    }
  });

  // P7: contractsOfParty host
  it("P7: contractsOfParty host H01 có đúng 1 signatory (partnership.H01) + holding/lease là handler", () => {
    const state = getMockState();
    const related = contracts.contractsOfParty(state, "host.H01", FIXED_NOW);
    expect(related.length).toBeGreaterThanOrEqual(1);

    const signatories = related.filter((item) => item.relation === "signatory");
    expect(signatories).toHaveLength(1);
    expect(signatories[0].row.key).toBe("partnership.H01");

    const handlers = related.filter((item) => item.relation === "handler");
    for (const item of handlers) {
      expect(["holding", "lease"]).toContain(item.row.kind);
      expect(item.row.hostId).toBe("H01");
    }
  });

  // P8: key lạ
  it("P8: key lạ partyByKey => undefined, contractsOfParty => []", () => {
    const state = getMockState();
    expect(contracts.partyByKey(state, "nonexistent.key", FIXED_NOW)).toBeUndefined();
    expect(contracts.contractsOfParty(state, "nonexistent.key", FIXED_NOW)).toEqual([]);
  });

  // P9: contractsUsingTemplate
  it("P9: contractsUsingTemplate CORE-04 => đúng các row lease (3 trên seed); FH-01 => 8 row partnership; ADM-01 => []", () => {
    const state = getMockState();
    const rows = contracts.contractRows(state, FIXED_NOW);

    const leaseRows = contractsUsingTemplate(rows, "CORE-04");
    expect(leaseRows).toHaveLength(3);
    for (const r of leaseRows) {
      expect(r.kind).toBe("lease");
    }

    const hostRows = contractsUsingTemplate(rows, "FH-01");
    expect(hostRows).toHaveLength(8);
    for (const r of hostRows) {
      expect(r.kind).toBe("partnership");
    }

    const admRows = contractsUsingTemplate(rows, "ADM-01");
    expect(admRows).toHaveLength(0);
  });

  // P10: riêng tư
  it("P10: không key party nào chứa 9+ chữ số liên tiếp; mọi phoneMasked chứa ***", () => {
    const state = getMockState();
    const parties = contracts.contractParties(state, FIXED_NOW);

    for (const p of parties) {
      expect(p.key).not.toMatch(/\d{9,}/);
      if (p.phoneMasked) {
        expect(p.phoneMasked).toContain("***");
      }
    }
  });
});
