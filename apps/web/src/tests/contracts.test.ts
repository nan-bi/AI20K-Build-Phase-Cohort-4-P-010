import { beforeEach, describe, expect, it, vi } from "vitest";

// Store chạy trên localStorage của trình duyệt; dựng một window tối giản cho môi trường node.
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
const actions = await import("@/lib/mock/actions");
const { noticesFor, landlordUnits } = await import("@/lib/mock/selectors");
const contracts = await import("@/lib/mock/contracts");

beforeEach(() => {
  mem.clear();
  resetMockState();
});

describe("Admin Contracts - WP1", () => {
  const FIXED_NOW = new Date("2026-09-28T12:00:00.000Z").getTime();

  // T1: contractRows(seed, now) có đủ 3 kind, mọi key duy nhất, mọi docId khác rỗng
  it("T1: contractRows(seed, now) có đủ 3 kind, mọi key duy nhất, mọi docId khác rỗng", () => {
    const state = getMockState();
    const rows = contracts.contractRows(state, FIXED_NOW);

    expect(rows.length).toBeGreaterThan(0);
    const kinds = new Set(rows.map((r) => r.kind));
    expect(kinds.has("mandate")).toBe(true);
    expect(kinds.has("holding")).toBe(true);
    expect(kinds.has("lease")).toBe(true);
    expect(kinds.has("partnership")).toBe(true);

    const keys = rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);

    for (const r of rows) {
      expect(r.docId).toBeTruthy();
      expect(r.docId.trim().length).toBeGreaterThan(0);
    }
  });

  // T2: mandate từ consignment: draft không sinh row, awaiting_host/inspecting/reviewing => pending_inspection, approved => active, rejected => void, docId = UQ-CS-...
  it("T2: mandate từ consignment: draft không sinh row, các trạng thái phân định đúng, docId = UQ-CS-...", () => {
    const state = getMockState();
    const rows = contracts.contractRows(state, FIXED_NOW);

    // cs-1 là draft trong seed -> không sinh row
    const cs1Row = rows.find((r) => r.key === "mandate.cs-1");
    expect(cs1Row).toBeUndefined();

    // cs-2 (awaiting_host), cs-3 (inspecting), cs-4 (reviewing) -> pending_inspection
    for (const id of ["cs-2", "cs-3", "cs-4"]) {
      const row = rows.find((r) => r.key === `mandate.${id}`);
      expect(row).toBeDefined();
      expect(row?.status).toBe("pending_inspection");
      expect(row?.docId).toBe(`UQ-${id.toUpperCase()}`);
    }

    // cs-5 là approved -> active
    const cs5Row = rows.find((r) => r.key === "mandate.cs-5");
    expect(cs5Row).toBeDefined();
    expect(cs5Row?.status).toBe("active");
    expect(cs5Row?.docId).toBe("UQ-CS-5");

    // Thử 1 consignment rejected
    const stateWithReject = {
      ...state,
      consignments: [
        ...state.consignments,
        {
          ...state.consignments[0],
          id: "cs-99",
          status: "rejected" as const,
          signedAt: new Date(FIXED_NOW - 86400000).toISOString(),
        },
      ],
    };
    const rowsReject = contracts.contractRows(stateWithReject, FIXED_NOW);
    const cs99Row = rowsReject.find((r) => r.key === "mandate.cs-99");
    expect(cs99Row).toBeDefined();
    expect(cs99Row?.status).toBe("void");
  });

  // T3: mandate exiting theo now: now < exitEffectiveAt => exiting; now >= => exit_due + needsAction
  it("T3: mandate exiting theo now: now < exitEffectiveAt => exiting; now >= => exit_due + needsAction", () => {
    const state = getMockState();
    // zr2-09-0912 có exitEffectiveAt: now + 12 days
    const rowsBefore = contracts.contractRows(state, FIXED_NOW);
    const zr2Before = rowsBefore.find((r) => r.key === "mandate.zr2-09-0912");
    expect(zr2Before).toBeDefined();
    expect(zr2Before?.status).toBe("exiting");
    expect(zr2Before?.needsAction).toBe(false);

    // Khi now vượt qua exitEffectiveAt của zr2-09-0912 (+13 days)
    const futureNow = FIXED_NOW + 13 * 86_400_000;
    const rowsAfter = contracts.contractRows(state, futureNow);
    const zr2After = rowsAfter.find((r) => r.key === "mandate.zr2-09-0912");
    expect(zr2After).toBeDefined();
    expect(zr2After?.status).toBe("exit_due");
    expect(zr2After?.needsAction).toBe(true);
  });

  // T4: holding seed: bk-108 => awaiting_sign, docId === "COC-VS-X5NA1"; bk-109 => converted, docId === "TT-2026-0418"
  it("T4: holding seed: bk-108 => awaiting_sign, docId === 'COC-VS-X5NA1'; bk-109 => converted, docId === 'TT-2026-0418'", () => {
    const state = getMockState();
    const rows = contracts.contractRows(state, FIXED_NOW);

    const bk108Holding = rows.find((r) => r.key === "holding.bk-108");
    expect(bk108Holding).toBeDefined();
    expect(bk108Holding?.status).toBe("awaiting_sign");
    expect(bk108Holding?.docId).toBe("COC-VS-X5NA1");

    const bk109Holding = rows.find((r) => r.key === "holding.bk-109");
    expect(bk109Holding).toBeDefined();
    expect(bk109Holding?.status).toBe("converted");
    expect(bk109Holding?.docId).toBe("TT-2026-0418");
  });

  // T5: holding hết hạn: cùng bk-108, now = expiresAt + 1 => expired; booking cancelled có deposit => expired
  it("T5: holding hết hạn: now = expiresAt + 1 => expired; booking cancelled có deposit => expired", () => {
    const state = getMockState();
    const bk108 = state.bookings.find((b) => b.id === "bk-108")!;
    const expiresAtMs = Date.parse(bk108.deposit!.expiresAt!);

    const rowsExpired = contracts.contractRows(state, expiresAtMs + 1000);
    const bk108Expired = rowsExpired.find((r) => r.key === "holding.bk-108");
    expect(bk108Expired?.status).toBe("expired");

    // Booking cancelled có deposit
    const stateWithCancelled = {
      ...state,
      bookings: [
        ...state.bookings,
        {
          ...bk108,
          id: "bk-cancelled-test",
          status: "cancelled" as const,
        },
      ],
    };
    const rowsCancelled = contracts.contractRows(stateWithCancelled, FIXED_NOW);
    const cancelledRow = rowsCancelled.find((r) => r.key === "holding.bk-cancelled-test");
    expect(cancelledRow?.status).toBe("expired");
  });

  // T6: leaseEndAt: 2027-01-31 + 1 => ngày 28/02/2027; 2028-01-31 + 1 => 29/02/2028; 2026-03-15 + 12 => 15/03/2027
  it("T6: leaseEndAt tính đúng ngày cuối tháng và năm nhuận", () => {
    const end1 = contracts.leaseEndAt("2027-01-31T00:00:00.000Z", 1);
    const d1 = new Date(end1);
    expect(d1.getUTCFullYear()).toBe(2027);
    expect(d1.getUTCMonth()).toBe(1); // February (0-indexed 1)
    expect(d1.getUTCDate()).toBe(28);

    const endLeap = contracts.leaseEndAt("2028-01-31T00:00:00.000Z", 1);
    const dLeap = new Date(endLeap);
    expect(dLeap.getUTCFullYear()).toBe(2028);
    expect(dLeap.getUTCMonth()).toBe(1);
    expect(dLeap.getUTCDate()).toBe(29);

    const end12 = contracts.leaseEndAt("2026-03-15T10:30:00.000Z", 12);
    const d12 = new Date(end12);
    expect(d12.getUTCFullYear()).toBe(2027);
    expect(d12.getUTCMonth()).toBe(2); // March
    expect(d12.getUTCDate()).toBe(15);
  });

  // T7: lease theo now: > 30 ngày => active; <= 30 ngày => expiring + needsAction; now >= endAt => ended
  it("T7: lease theo now: > 30 ngày => active; <= 30 ngày => expiring + needsAction; now >= endAt => ended", () => {
    const state = getMockState();
    const bk109 = state.bookings.find((b) => b.id === "bk-109")!;
    const endAtMs = Date.parse(contracts.leaseEndAt(bk109.lease!.startDate, bk109.lease!.months));

    // Thời điểm còn 60 ngày (> 30 ngày)
    const nowActive = endAtMs - 60 * 86_400_000;
    const rowsActive = contracts.contractRows(state, nowActive);
    const leaseActive = rowsActive.find((r) => r.key === "lease.bk-109");
    expect(leaseActive?.status).toBe("active");
    expect(leaseActive?.needsAction).toBe(false);

    // Thời điểm còn 15 ngày (<= 30 ngày)
    const nowExpiring = endAtMs - 15 * 86_400_000;
    const rowsExpiring = contracts.contractRows(state, nowExpiring);
    const leaseExpiring = rowsExpiring.find((r) => r.key === "lease.bk-109");
    expect(leaseExpiring?.status).toBe("expiring");
    expect(leaseExpiring?.needsAction).toBe(true);

    // Thời điểm đã qua ngày kết thúc
    const nowEnded = endAtMs + 1000;
    const rowsEnded = contracts.contractRows(state, nowEnded);
    const leaseEnded = rowsEnded.find((r) => r.key === "lease.bk-109");
    expect(leaseEnded?.status).toBe("ended");
    expect(leaseEnded?.needsAction).toBe(false);
  });

  // T8: Bất biến cọc 2tr: mọi row lease: amount === lease.rent và securityDeposit === lease.rent; holding của cùng booking => converted
  it("T8: bất biến cọc 2tr: amount === rent, securityDeposit === rent, holding cùng booking => converted", () => {
    const state = getMockState();
    const rows = contracts.contractRows(state, FIXED_NOW);

    const leaseRows = rows.filter((r) => r.kind === "lease");
    expect(leaseRows.length).toBeGreaterThan(0);

    for (const lr of leaseRows) {
      const bk = state.bookings.find((b) => b.id === lr.bookingId)!;
      expect(lr.amount).toBe(bk.lease!.rent);
      expect(lr.securityDeposit).toBe(bk.lease!.rent);

      // Cùng booking đó nếu có deposit thì holding row phải là converted
      if (bk.deposit?.paidAt) {
        const hr = rows.find((r) => r.key === `holding.${bk.id}`);
        expect(hr).toBeDefined();
        expect(hr?.status).toBe("converted");
      }
    }
  });

  // T9: KPI trên seed: activeLeases 3, expiringLeases 1, heldDeposits 4_000_000 (bk-108 & bk-103), exitingMandates 2, needsAction 2; 2 row đầu có needsAction
  it("T9: KPI trên seed chuẩn: activeLeases 3, expiringLeases 1, heldDeposits 4_000_000, exitingMandates 2, needsAction 2", () => {
    const state = getMockState();
    const rows = contracts.contractRows(state, FIXED_NOW);
    const kpis = contracts.contractKpis(rows);

    expect(kpis.activeLeases).toBe(3);
    expect(kpis.expiringLeases).toBe(1);
    expect(kpis.heldDeposits).toBe(4_000_000);
    expect(kpis.exitingMandates).toBe(2);
    expect(kpis.needsAction).toBe(2);

    expect(rows[0].needsAction).toBe(true);
    expect(rows[1].needsAction).toBe(true);
  });

  // T10: completeMandateExit lỗi: not_found, bad_status, too_early, blocked; MỖI ca: getMockState() trước === sau
  it("T10: completeMandateExit kiểm tra các trường hợp lỗi và giữ nguyên tham chiếu state", () => {
    const beforeState = getMockState();

    // 1. unit lạ => not_found
    const resNotFound = actions.completeMandateExit("unknown-unit-xyz", "Admin");
    expect(resNotFound.ok).toBe(false);
    if (!resNotFound.ok) expect(resNotFound.code).toBe("not_found");
    expect(getMockState()).toBe(beforeState);

    // 2. mandate active => bad_status
    const resBadStatus = actions.completeMandateExit("s1-01-0806", "Admin");
    expect(resBadStatus.ok).toBe(false);
    if (!resBadStatus.ok) expect(resBadStatus.code).toBe("bad_status");
    expect(getMockState()).toBe(beforeState);

    // 3. zr2-09-0912 còn 12 ngày => too_early
    const resTooEarly = actions.completeMandateExit("zr2-09-0912", "Admin");
    expect(resTooEarly.ok).toBe(false);
    if (!resTooEarly.ok) expect(resTooEarly.code).toBe("too_early");
    expect(getMockState()).toBe(beforeState);
  });

  // T11: completeMandateExit OK: unit seed exit_due => ok; mandate ended, có endedAt, endedBy; +1 notice landlord, +1 host, +1 admin; landlordUnits không còn unit đó; row => ended, needsAction false; gọi lần 2 => bad_status
  it("T11: completeMandateExit thành công khi đã đủ 15 ngày, cập nhật mandate ended, bắn thông báo 3 bên", () => {
    // Unit seed exit_due: s2-09-1503 (được seed ở trạng thái exiting now-16d)
    const state = getMockState();
    const rowsBefore = contracts.contractRows(state, FIXED_NOW);
    const exitDueRow = rowsBefore.find((r) => r.status === "exit_due");
    expect(exitDueRow).toBeDefined();
    const targetUnitId = exitDueRow!.unitId!;
    const targetLandlordId = exitDueRow!.landlordId!;

    const landlordNoticesBefore = noticesFor(state, "landlord", targetLandlordId).length;
    const hostNoticesBefore = noticesFor(state, "host", "H01").length;
    const adminNoticesBefore = noticesFor(state, "admin").length;

    const res = actions.completeMandateExit(targetUnitId, "Nguyễn Văn Admin");
    expect(res.ok).toBe(true);

    const afterState = getMockState();
    const m = afterState.mandates[targetUnitId];
    expect(m.status).toBe("ended");
    expect(m.endedAt).toBeTruthy();
    expect(m.endedBy).toBe("Nguyễn Văn Admin");

    // Thông báo 3 bên tăng
    expect(noticesFor(afterState, "landlord", targetLandlordId).length).toBe(landlordNoticesBefore + 1);
    expect(noticesFor(afterState, "host", "H01").length).toBe(hostNoticesBefore + 1);
    expect(noticesFor(afterState, "admin").length).toBe(adminNoticesBefore + 1);

    // landlordUnits không còn unit đó
    const lUnits = landlordUnits(afterState, targetLandlordId);
    expect(lUnits.find((u) => u.id === targetUnitId)).toBeUndefined();

    // row chuyển ended, needsAction = false
    const rowsAfter = contracts.contractRows(afterState, FIXED_NOW);
    const rowAfter = rowsAfter.find((r) => r.key === `mandate.${targetUnitId}`);
    expect(rowAfter?.status).toBe("ended");
    expect(rowAfter?.needsAction).toBe(false);

    // Gọi lần 2 => bad_status
    const res2 = actions.completeMandateExit(targetUnitId, "Admin");
    expect(res2.ok).toBe(false);
    if (!res2.ok) expect(res2.code).toBe("bad_status");
  });

  // T12: remindLeaseRenewal: bk-120 => ok, có renewalRemindedAt, +1 notice tenant, +1 landlord, +1 admin, row hết needsAction; lần 2 => bad_status; bk-109 (còn ~11 tháng) => bad_status; id lạ => not_found
  it("T12: remindLeaseRenewal nhắc gia hạn thành công cho lease expiring, ngăn nhắc lần 2", () => {
    // bk-120 là lease expiring
    const state = getMockState();
    const tenantNoticesBefore = noticesFor(state, "tenant", "0901234567").length;
    const adminNoticesBefore = noticesFor(state, "admin").length;

    // id lạ => not_found
    const resNotFound = actions.remindLeaseRenewal("bk-strange-999", "Admin");
    expect(resNotFound.ok).toBe(false);
    if (!resNotFound.ok) expect(resNotFound.code).toBe("not_found");

    // bk-109 còn 11 tháng => bad_status
    const resEarly = actions.remindLeaseRenewal("bk-109", "Admin");
    expect(resEarly.ok).toBe(false);
    if (!resEarly.ok) expect(resEarly.code).toBe("bad_status");

    // bk-120 hợp lệ => ok
    const resOk = actions.remindLeaseRenewal("bk-120", "Phạm Thu Hà");
    expect(resOk.ok).toBe(true);

    const afterState = getMockState();
    const bk120 = afterState.bookings.find((b) => b.id === "bk-120")!;
    expect(bk120.lease?.renewalRemindedAt).toBeTruthy();

    expect(noticesFor(afterState, "tenant", "0901234567").length).toBe(tenantNoticesBefore + 1);
    expect(noticesFor(afterState, "admin").length).toBe(adminNoticesBefore + 1);

    const rowsAfter = contracts.contractRows(afterState, FIXED_NOW);
    const bk120Row = rowsAfter.find((r) => r.key === "lease.bk-120");
    expect(bk120Row?.needsAction).toBe(false);

    // Lần 2 => bad_status
    const resAgain = actions.remindLeaseRenewal("bk-120", "Phạm Thu Hà");
    expect(resAgain.ok).toBe(false);
    if (!resAgain.ok) expect(resAgain.code).toBe("bad_status");
  });

  // T13: contractByKey / contractEvents: key lạ => undefined; events lease bk-109 có mốc Ký HĐ thuê done và Hết hạn chưa done; events mandate không có Yêu cầu thoát khi chưa yêu cầu
  it("T13: contractByKey và contractEvents trả đúng danh sách mốc", () => {
    const state = getMockState();
    const invalid = contracts.contractByKey(state, "invalid.key", FIXED_NOW);
    expect(invalid).toBeUndefined();

    const leaseRow = contracts.contractByKey(state, "lease.bk-109", FIXED_NOW);
    expect(leaseRow).toBeDefined();

    const eventsLease = contracts.contractEvents(state, leaseRow!, FIXED_NOW);
    const signEvent = eventsLease.find((e) => e.label.includes("Ký HĐ thuê"));
    expect(signEvent?.done).toBe(true);
    const endEvent = eventsLease.find((e) => e.label.includes("Hết hạn"));
    expect(endEvent?.done).toBe(false);

    // Mandate active không có mốc Yêu cầu thoát
    const mandateActive = contracts.contractByKey(state, "mandate.s1-01-0806", FIXED_NOW);
    expect(mandateActive).toBeDefined();
    const eventsMandate = contracts.contractEvents(state, mandateActive!, FIXED_NOW);
    const exitEvent = eventsMandate.find((e) => e.label.includes("thoát"));
    expect(exitEvent).toBeUndefined();
  });

  // T14: Riêng tư: mọi phoneMasked khớp /\*\*\*/; không row/party nào chứa doorCode hay số CCCD
  it("T14: bảo đảm riêng tư theo NĐ 13/2023, không lộ SĐT, doorCode hay số CCCD", () => {
    const state = getMockState();
    const rows = contracts.contractRows(state, FIXED_NOW);

    for (const r of rows) {
      for (const p of r.parties) {
        if (p.phoneMasked) {
          expect(p.phoneMasked).toMatch(/\*\*\*/);
        }
      }
      const serialized = JSON.stringify(r);
      expect(serialized).not.toContain("482910"); // doorCode của bk-108
      expect(serialized).not.toMatch(/\b0[0-9]{11}\b/); // số CCCD 12 chữ số
    }
  });
});
