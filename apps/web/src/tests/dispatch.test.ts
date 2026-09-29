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

import {
  createBooking,
  hostClaimBooking,
  hostReject,
} from "@/lib/mock/actions";
import {
  freeAt,
  isOpenTicket,
  openTicketsFor,
  saleCandidates,
  slotsForDay,
  slotTaken,
  dispatchSale,
} from "@/lib/mock/selectors";
import { accountPhone, ownsBooking } from "@/lib/mock/selectors-tenant";
import { getMockState, resetMockState, setMockState } from "@/lib/mock/store";
import { unitById } from "@/lib/mock/units";
import type { Booking } from "@/lib/mock/types";

beforeEach(() => {
  mem.clear();
  resetMockState();
});

describe("Dispatch & Booking Gate - SPEC-P02 §7 & SPEC-P03 §7", () => {
  const slotFuture = "2026-10-15T09:00:00.000Z";

  // Ca 1: Sapphire 2, H02 rảnh ⇒ assigned/top, hostId H02
  it("Ca 1: Sapphire 2, H02 rảnh ⇒ assigned/top, hostId H02", () => {
    const state = getMockState();
    const unitS2 = unitById("s2-12-1608")!;
    const res = dispatchSale(state, unitS2, slotFuture);
    expect(res.tier).toBe("top");
    expect(res.state).toBe("assigned");
    expect(res.hostId).toBe("H02");
    expect(res.offeredTo).toEqual(["H02"]);
  });

  // Ca 2: H02 bận giờ đó ⇒ open/zone_pool, offeredTo ["H01"]
  it("Ca 2: H02 bận giờ đó ⇒ open/zone_pool, offeredTo ['H01']", () => {
    setMockState((prev) => ({
      ...prev,
      bookings: [
        ...prev.bookings,
        {
          id: "bk-busy-h02",
          ref: "VS-BUSY2",
          unitId: "s2-12-1608",
          hostId: "H02",
          slot: slotFuture,
          status: "confirmed",
          tenant: { name: "Busy Test", phone: "0999888777" },
          createdAt: new Date().toISOString(),
        } as Booking,
      ],
    }));

    const state = getMockState();
    const unitS2 = unitById("s2-12-1608")!;
    const res = dispatchSale(state, unitS2, slotFuture);
    expect(res.tier).toBe("zone_pool");
    expect(res.state).toBe("open");
    expect(res.offeredTo).toEqual(["H01"]);
    expect(res.hostId).toBe("H01");
  });

  // Ca 3: H01 + H02 bận, zone khác có Sale rảnh ⇒ open/wide_pool, escalated
  it("Ca 3: H01 + H02 bận, zone khác có Sale rảnh ⇒ open/wide_pool, escalated", () => {
    setMockState((prev) => ({
      ...prev,
      bookings: [
        ...prev.bookings,
        {
          id: "bk-busy-h02",
          ref: "VS-BUSY2",
          unitId: "s2-12-1608",
          hostId: "H02",
          slot: slotFuture,
          status: "confirmed",
          tenant: { name: "Busy Test 2", phone: "0999888777" },
          createdAt: new Date().toISOString(),
        } as Booking,
        {
          id: "bk-busy-h01",
          ref: "VS-BUSY1",
          unitId: "s2-12-1608",
          hostId: "H01",
          slot: slotFuture,
          status: "confirmed",
          tenant: { name: "Busy Test 1", phone: "0999888776" },
          createdAt: new Date().toISOString(),
        } as Booking,
      ],
    }));

    const state = getMockState();
    const unitS2 = unitById("s2-12-1608")!;
    const res = dispatchSale(state, unitS2, slotFuture);
    expect(res.tier).toBe("wide_pool");
    expect(res.state).toBe("open");
    expect(res.escalated).toBe(true);
    expect(res.offeredTo.length).toBeGreaterThan(0);
    expect(res.offeredTo).not.toContain("H01");
    expect(res.offeredTo).not.toContain("H02");
  });

  // Ca 4: hostClaimBooking lần 1 ok ⇒ confirmed, hostId đúng; lần 2 Host khác ⇒ taken
  it("Ca 4: hostClaimBooking lần 1 ok ⇒ confirmed, hostId đúng; lần 2 Host khác ⇒ taken", () => {
    // Tạo booking với ticket open
    const b = createBooking({
      unitId: "s2-12-1608",
      slot: slotFuture,
      name: "Khách Mới",
      phone: "0988776655",
      persons: 1,
    });

    // Ép booking sang ticket open nếu chưa
    setMockState((prev) => ({
      ...prev,
      bookings: prev.bookings.map((item) =>
        item.id === b.id
          ? {
              ...item,
              dispatch: {
                state: "open",
                tier: "zone_pool",
                offeredTo: ["H01", "H02"],
                openedAt: new Date().toISOString(),
              },
            }
          : item
      ),
    }));

    const claim1 = hostClaimBooking(b.id, "H01");
    expect(claim1.ok).toBe(true);

    const updated = getMockState().bookings.find((item) => item.id === b.id)!;
    expect(updated.status).toBe("confirmed");
    expect(updated.hostId).toBe("H01");
    expect(updated.dispatch?.state).toBe("assigned");
    expect(updated.dispatch?.claimedAt).toBeDefined();

    // Lần 2 Host khác claim
    const claim2 = hostClaimBooking(b.id, "H02");
    expect(claim2.ok).toBe(false);
    if (!claim2.ok) {
      expect(claim2.code).toBe("taken");
    }
  });

  // Ca 5: Host ngoài offeredTo ⇒ not_offered
  it("Ca 5: Host ngoài offeredTo ⇒ not_offered", () => {
    const b = createBooking({
      unitId: "s2-12-1608",
      slot: slotFuture,
      name: "Khách Mới 2",
      phone: "0988776654",
      persons: 1,
    });

    setMockState((prev) => ({
      ...prev,
      bookings: prev.bookings.map((item) =>
        item.id === b.id
          ? {
              ...item,
              dispatch: {
                state: "open",
                tier: "zone_pool",
                offeredTo: ["H01"],
                openedAt: new Date().toISOString(),
              },
            }
          : item
      ),
    }));

    const claimBad = hostClaimBooking(b.id, "H03");
    expect(claimBad.ok).toBe(false);
    if (!claimBad.ok) {
      expect(claimBad.code).toBe("not_offered");
    }
  });

  // Ca 6: hostReject khi còn người rảnh ⇒ vẫn pending + open; khi không ai ⇒ rejected
  it("Ca 6: hostReject khi còn người rảnh ⇒ vẫn pending + open; khi không ai ⇒ rejected", () => {
    const b = createBooking({
      unitId: "s2-12-1608",
      slot: slotFuture,
      name: "Khách Reject",
      phone: "0988776653",
      persons: 1,
    });

    // Host đầu tiên từ chối, còn Host khác trong zone rảnh
    hostReject(b.id, "Bận việc đột xuất");
    let afterReject = getMockState().bookings.find((item) => item.id === b.id)!;
    expect(afterReject.status).toBe("pending");
    expect(afterReject.dispatch?.state).toBe("open");

    // Nếu mọi người đều bận / từ chối
    const state = getMockState();
    const allSaleIds = saleCandidates(state, null).map((h) => h.id);
    setMockState((prev) => ({
      ...prev,
      bookings: prev.bookings.map((item) =>
        item.id === b.id
          ? {
              ...item,
              dispatch: {
                state: "open",
                tier: "wide_pool",
                offeredTo: [afterReject.hostId],
                openedAt: new Date().toISOString(),
              },
            }
          : item
      ),
    }));

    // Cho tất cả Host khác bận
    setMockState((prev) => ({
      ...prev,
      bookings: [
        ...prev.bookings,
        ...allSaleIds.map((hid, idx) => ({
          id: `busy-all-${idx}`,
          ref: `BUSY-${idx}`,
          unitId: "s2-12-1608",
          hostId: hid,
          slot: slotFuture,
          status: "confirmed" as const,
          tenant: { name: `Busy ${idx}`, phone: `0911000${idx}`, persons: 1 },
          createdAt: new Date().toISOString(),
        })),
      ],
    }));

    hostReject(b.id, "Không có ai");
    afterReject = getMockState().bookings.find((item) => item.id === b.id)!;
    expect(afterReject.status).toBe("rejected");
  });

  // Ca 7: slotsForDay không bao giờ trả reason khác "past" dù mọi Host bận
  it("Ca 7: slotsForDay không bao giờ trả reason khác 'past' dù mọi Host bận", () => {
    const state = getMockState();
    const targetDay = new Date(Date.now() + 2 * 86_400_000);
    const slots = slotsForDay(state, targetDay, Date.now());

    for (const s of slots) {
      if (!s.available) {
        expect(s.reason).toBe("past");
      } else {
        expect(s.reason).toBeUndefined();
      }
    }
  });

  // Ca 8: Ticket mở không làm slotTaken của Host placeholder thành true
  it("Ca 8: Ticket mở không làm slotTaken của Host placeholder thành true", () => {
    const openBk: Booking = {
      id: "bk-open-placeholder",
      ref: "VS-OPEN1",
      unitId: "s2-12-1608",
      hostId: "H01",
      slot: slotFuture,
      status: "pending",
      tenant: { name: "Open Placeholder", phone: "0988776652", persons: 1 },
      createdAt: new Date().toISOString(),
      dispatch: {
        state: "open",
        tier: "zone_pool",
        offeredTo: ["H01", "H02"],
        openedAt: new Date().toISOString(),
      },
    };

    expect(isOpenTicket(openBk)).toBe(true);

    setMockState((prev) => ({
      ...prev,
      bookings: [...prev.bookings, openBk],
    }));

    expect(openTicketsFor(getMockState(), "H01").some((b) => b.id === "bk-open-placeholder")).toBe(true);

    const stateAfter = getMockState();
    expect(slotTaken(stateAfter, "H01", slotFuture)).toBe(false);
    expect(freeAt(stateAfter, "H01", slotFuture)).toBe(true);
  });

  // Ca 9: ownsBooking đúng với SĐT tài khoản
  it("Ca 9: ownsBooking đúng với SĐT tài khoản", () => {
    const state = getMockState();
    const myPhone = accountPhone(state);
    const myBooking: Booking = {
      id: "bk-my",
      ref: "VS-MY01",
      unitId: "s2-12-1608",
      hostId: "H01",
      slot: slotFuture,
      status: "confirmed",
      tenant: { name: "Tôi", phone: myPhone, persons: 1 },
      createdAt: new Date().toISOString(),
    };
    const otherBooking: Booking = {
      id: "bk-other",
      ref: "VS-OT01",
      unitId: "s2-12-1608",
      hostId: "H01",
      slot: slotFuture,
      status: "confirmed",
      tenant: { name: "Người khác", phone: "0999999999", persons: 1 },
      createdAt: new Date().toISOString(),
    };

    expect(ownsBooking(state, myBooking)).toBe(true);
    expect(ownsBooking(state, otherBooking)).toBe(false);
  });
});
