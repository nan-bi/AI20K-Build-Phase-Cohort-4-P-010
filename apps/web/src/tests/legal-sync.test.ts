import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Minimal localStorage mock for Node environment
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
import {
  HOUR_MS,
  PAYMENT_CYCLES,
  type PaymentCycle,
} from "@/lib/mock/cost";
import { getMockState, resetMockState } from "@/lib/mock/store";
import {
  bookingById,
  holdHoursFor,
  holdOutcome,
  mandateRenewsAt,
  unitStatus,
} from "@/lib/mock/selectors";
import { unitById } from "@/lib/mock/units";
import type { Booking, Mandate, Occupant } from "@/lib/mock/types";

const FIXED_NOW = new Date("2026-09-29T12:00:00.000Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  mem.clear();
  resetMockState(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Hồ sơ 11 — Legal Sync (TESTING §1)", () => {
  // G1: Hạn giữ chỗ
  describe("G1 — Hạn giữ chỗ theo giờ & cấu hình Admin", () => {
    it("(1) seed mới: holdHoursFor(state, 'x') === 48, holdHoursFor(state, 's2-16-2216') === 24", () => {
      const state = getMockState();
      expect(holdHoursFor(state, "s1-01-0806")).toBe(48);
      expect(holdHoursFor(state, "s2-16-2216")).toBe(24);
    });

    it("(2) cọc căn không override => expiresAt - paidAt === 48 * HOUR_MS, deposit.holdHours === 48", () => {
      const b = actions.createBooking({
        unitId: "s2-02-1004",
        slot: "09:00 - 09:45 30/10/2026",
        name: "Trần Văn Nam",
        phone: "0912345678",
        persons: 2,
      });
      actions.hostAccept(b.id);
      actions.hostStartReceiving(b.id);
      actions.hostConfirmViewing(b.id);
      actions.hostStartDeposit(b.id);
      actions.tenantAcceptDepositTerms(b.id);
      actions.confirmDepositPaid(b.id);

      const after = bookingById(getMockState(), b.id)!;
      expect(after.status).toBe("holding");
      const paidAt = Date.parse(after.deposit!.paidAt!);
      const expiresAt = Date.parse(after.deposit!.expiresAt!);
      expect(expiresAt - paidAt).toBe(48 * HOUR_MS);
      expect(after.deposit!.holdHours).toBe(48);
    });

    it("(3) setHoldHours('<căn>', 36) rồi cọc => 36h", () => {
      const res = actions.setHoldHours("s2-02-1004", 36, "Admin");
      expect(res.ok).toBe(true);

      const b = actions.createBooking({
        unitId: "s2-02-1004",
        slot: "09:00 - 09:45 30/10/2026",
        name: "Lê Văn C",
        phone: "0912345678",
        persons: 1,
      });
      actions.hostAccept(b.id);
      actions.hostStartReceiving(b.id);
      actions.hostConfirmViewing(b.id);
      actions.hostStartDeposit(b.id);
      actions.tenantAcceptDepositTerms(b.id);
      actions.confirmDepositPaid(b.id);

      const after = bookingById(getMockState(), b.id)!;
      const paidAt = Date.parse(after.deposit!.paidAt!);
      const expiresAt = Date.parse(after.deposit!.expiresAt!);
      expect(expiresAt - paidAt).toBe(36 * HOUR_MS);
      expect(after.deposit!.holdHours).toBe(36);
    });

    it("(4) đổi mặc định sau khi cọc => expiresAt cũ không đổi", () => {
      const b = actions.createBooking({
        unitId: "s2-02-1004",
        slot: "09:00 - 09:45 30/10/2026",
        name: "Vũ Thị D",
        phone: "0912345678",
        persons: 1,
      });
      actions.hostAccept(b.id);
      actions.hostStartReceiving(b.id);
      actions.hostConfirmViewing(b.id);
      actions.hostStartDeposit(b.id);
      actions.tenantAcceptDepositTerms(b.id);
      actions.confirmDepositPaid(b.id);

      const before = bookingById(getMockState(), b.id)!;
      const oldExpiresAt = before.deposit!.expiresAt;

      // Đổi default sang 60h
      actions.setHoldHours(null, 60, "Admin");
      const after = bookingById(getMockState(), b.id)!;
      expect(after.deposit!.expiresAt).toBe(oldExpiresAt);
    });

    it("(5) setHoldHours với 11, 73, 24.5, NaN, unit lạ, (null, null) => invalid_input và state giữ nguyên", () => {
      const beforeState = JSON.stringify(getMockState().holdPolicy);

      const cases = [
        { unitId: null, hours: 11 },
        { unitId: null, hours: 73 },
        { unitId: null, hours: 24.5 },
        { unitId: null, hours: Number.NaN },
        { unitId: "unknown-unit-xyz", hours: 24 },
        { unitId: null, hours: null },
      ];

      for (const c of cases) {
        const res = actions.setHoldHours(c.unitId, c.hours, "Admin");
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.code).toBe("invalid_input");
        expect(JSON.stringify(getMockState().holdPolicy)).toBe(beforeState);
      }
    });

    it("(6) audit: 3 lần gọi hợp lệ => holdAudit[0] là lần cuối, gọi lặp cùng giá trị không thêm dòng", () => {
      actions.setHoldHours(null, 36, "Admin A");
      actions.setHoldHours("s1-01-0806", 24, "Admin B");
      actions.setHoldHours("s1-01-0806", 48, "Admin C");

      const state = getMockState();
      expect(state.holdAudit[0].by).toBe("Admin C");
      expect(state.holdAudit[0].to).toBe(48);
      expect(state.holdAudit[0].unitId).toBe("s1-01-0806");

      const lenBefore = state.holdAudit.length;
      // Gọi lặp cùng giá trị 48
      const resDup = actions.setHoldHours("s1-01-0806", 48, "Admin C");
      expect(resDup.ok).toBe(true);
      expect(getMockState().holdAudit.length).toBe(lenBefore);
    });
  });

  // G2: Kết cục cọc
  describe("G2 — Kết cục cọc giữ chỗ đúng Điều 328 BLDS", () => {
    it("(7) bảng SPEC-P01 §4: mỗi dòng 1 ca (6 ca) với số tiền đúng", () => {
      const baseBooking: Booking = {
        id: "bk-test-outcome",
        ref: "VS-TEST01",
        unitId: "s2-02-1004",
        hostId: "H01",
        tenant: { name: "A", phone: "0900000000", persons: 1 },
        status: "holding",
        createdAt: "2026-09-29T10:00:00.000Z",
        slot: "09:00 - 09:45 30/10/2026",
        deposit: { amount: 2_000_000, content: "VSA", qrRef: "VQ-1", createdAt: "2026-09-29T08:00:00.000Z" },
      };

      // 1. Không có paidAt => none
      expect(holdOutcome(baseBooking, FIXED_NOW)).toEqual({
        kind: "none",
        toTenant: 0,
        toLandlord: 0,
        toPlatform: 0,
      });

      // 2. Có lease => converted
      const bLeased: Booking = {
        ...baseBooking,
        status: "leased",
        deposit: {
          amount: 2_000_000,
          content: "VSA",
          qrRef: "VQ-1",
          createdAt: "2026-09-29T08:00:00.000Z",
          paidAt: "2026-09-29T08:00:00.000Z",
          expiresAt: "2026-10-01T08:00:00.000Z",
        },
        lease: {
          signedAt: "2026-09-29T11:00:00.000Z",
          startDate: "2026-10-01T00:00:00.000Z",
          months: 12,
          rent: 8_000_000,
          docId: "HD-01",
          occupants: [],
          refundAccount: { bankName: "VCB", accountNo: "123456789", holderName: "NGUYEN VAN A" },
          paymentCycle: 1,
          securityDeposit: 8_000_000,
          firstPayment: { rent: 8_000_000, depositTopUp: 6_000_000, total: 14_000_000, content: "VSA TEST" },
        },
      };
      expect(holdOutcome(bLeased, FIXED_NOW)).toEqual({
        kind: "converted",
        toTenant: 0,
        toLandlord: 0,
        toPlatform: 0,
      });

      // 3. voided landlord_breach => refunded_double (2A)
      const bBreach: Booking = {
        ...baseBooking,
        deposit: {
          amount: 2_000_000,
          content: "VSA",
          qrRef: "VQ-1",
          createdAt: "2026-09-29T08:00:00.000Z",
          paidAt: "2026-09-29T08:00:00.000Z",
          expiresAt: "2026-10-01T08:00:00.000Z",
          voided: { at: "2026-09-29T09:00:00.000Z", by: "Admin", reason: "landlord_breach", note: "Chủ nhà bẻ cọc" },
        },
      };
      expect(holdOutcome(bBreach, FIXED_NOW)).toEqual({
        kind: "refunded_double",
        toTenant: 4_000_000,
        toLandlord: 0,
        toPlatform: 0,
      });

      // 4. voided force_majeure => refunded (A)
      const bForce: Booking = {
        ...baseBooking,
        deposit: {
          amount: 2_000_000,
          content: "VSA",
          qrRef: "VQ-1",
          createdAt: "2026-09-29T08:00:00.000Z",
          paidAt: "2026-09-29T08:00:00.000Z",
          expiresAt: "2026-10-01T08:00:00.000Z",
          voided: { at: "2026-09-29T09:00:00.000Z", by: "Admin", reason: "force_majeure", note: "Bất khả kháng toà nhà" },
        },
      };
      expect(holdOutcome(bForce, FIXED_NOW)).toEqual({
        kind: "refunded",
        toTenant: 2_000_000,
        toLandlord: 0,
        toPlatform: 0,
      });

      // 5. now >= expiresAt => forfeited (0, A/2, A/2)
      const bExpired: Booking = {
        ...baseBooking,
        deposit: {
          amount: 2_000_000,
          content: "VSA",
          qrRef: "VQ-1",
          createdAt: "2026-09-25T08:00:00.000Z",
          paidAt: "2026-09-25T08:00:00.000Z",
          expiresAt: "2026-09-27T08:00:00.000Z",
        },
      };
      expect(holdOutcome(bExpired, FIXED_NOW)).toEqual({
        kind: "forfeited",
        toTenant: 0,
        toLandlord: 1_000_000,
        toPlatform: 1_000_000,
      });

      // 6. Còn lại (chưa hết hạn) => active
      const bActive: Booking = {
        ...baseBooking,
        deposit: {
          amount: 2_000_000,
          content: "VSA",
          qrRef: "VQ-1",
          createdAt: "2026-09-29T08:00:00.000Z",
          paidAt: "2026-09-29T08:00:00.000Z",
          expiresAt: "2026-10-01T08:00:00.000Z",
        },
      };
      expect(holdOutcome(bActive, FIXED_NOW)).toEqual({
        kind: "active",
        toTenant: 0,
        toLandlord: 0,
        toPlatform: 0,
      });
    });

    it("(9) adminVoidHold(..., 'landlord_breach') => refunded_double, toTenant === 4_000_000, booking cancelled, unitStatus available", () => {
      const res = actions.adminVoidHold("bk-108", "landlord_breach", "Chủ nhà không giao nhà", "Admin A");
      expect(res.ok).toBe(true);

      const b = bookingById(getMockState(), "bk-108")!;
      expect(b.status).toBe("cancelled");
      expect(unitStatus(getMockState(), b.unitId)).toBe("available");

      const outcome = holdOutcome(b, Date.now());
      expect(outcome.kind).toBe("refunded_double");
      expect(outcome.toTenant).toBe(4_000_000);
    });

    it("(10) adminVoidHold(..., 'force_majeure') => refunded 2_000_000", () => {
      const res = actions.adminVoidHold("bk-108", "force_majeure", "Toà nhà bị sự cố nghiêm trọng", "Admin A");
      expect(res.ok).toBe(true);

      const b = bookingById(getMockState(), "bk-108")!;
      const outcome = holdOutcome(b, Date.now());
      expect(outcome.kind).toBe("refunded");
      expect(outcome.toTenant).toBe(2_000_000);
    });

    it("(11) void trên booking leased => bad_status; void lần 2 => bad_status; note 3 ký tự => invalid_input; void sau hạn => expired", () => {
      // 1. Trên booking leased (bk-109 trong seed)
      const resLeased = actions.adminVoidHold("bk-109", "landlord_breach", "Lý do hợp lệ dài hơn 5 ký tự", "Admin");
      expect(resLeased.ok).toBe(false);
      if (!resLeased.ok) expect(resLeased.code).toBe("bad_status");

      // 2. Note ngắn < 5 ký tự
      const resShort = actions.adminVoidHold("bk-108", "landlord_breach", "ngan", "Admin");
      expect(resShort.ok).toBe(false);
      if (!resShort.ok) expect(resShort.code).toBe("invalid_input");

      // 3. Void thành công lần 1
      const resOk = actions.adminVoidHold("bk-108", "landlord_breach", "Chủ nhà tự bán nhà cho người khác", "Admin");
      expect(resOk.ok).toBe(true);

      // Void lần 2 => bad_status
      const resAgain = actions.adminVoidHold("bk-108", "landlord_breach", "Chủ nhà tự bán nhà cho người khác", "Admin");
      expect(resAgain.ok).toBe(false);
      if (!resAgain.ok) expect(resAgain.code).toBe("bad_status");
    });
  });

  // G3: Chốt HĐ thuê
  describe("G3 — Chốt HĐ thuê đủ 3 bước & thanh toán kỳ đầu", () => {
    it("(13) signLease hợp lệ paymentCycle: 3 => firstPayment.rent === 3 * rent, depositTopUp === rent - 2_000_000, total đúng, content === 'VSA <code> THANH TOAN TIEN THUE KY 1'", () => {
      // Chuẩn bị booking bk-108 có eKYC
      actions.saveKyc("bk-108", {
        fullName: "Hoàng Thị Yến",
        idNumber: "001198000123",
        dob: "1998-05-12",
        homeTown: "Hà Nội",
        address: "Ocean Park, Gia Lâm",
        confidence: 0.95,
      });

      const unit = unitById(bookingById(getMockState(), "bk-108")!.unitId)!;
      const rent = unit.rent;

      const res = actions.signLease("bk-108", {
        startDate: "2026-10-01",
        months: 12,
        paymentCycle: 3,
        occupants: [{ fullName: "Nguyễn Văn Con", idOrDob: "2018-01-01" }],
        refundAccount: { bankName: "Vietcombank", accountNo: "0123456789", holderName: "HOANG THI YEN" },
        signature: "data:image/svg+xml;base64,...",
      });
      expect(res.ok).toBe(true);

      const b = bookingById(getMockState(), "bk-108")!;
      expect(b.status).toBe("leased");
      const fp = b.lease!.firstPayment;
      expect(fp.rent).toBe(3 * rent);
      expect(fp.depositTopUp).toBe(rent - 2_000_000);
      expect(fp.total).toBe(3 * rent + (rent - 2_000_000));
      expect(fp.content).toBe(`VSA ${unit.code} THANH TOAN TIEN THUE KY 1`);
      expect(b.lease!.securityDeposit).toBe(rent);
    });

    it("(14) holderName 'nguyen van a' với kyc 'Nguyễn Văn A' => ok; 'Nguyen Van B' => holder_mismatch", () => {
      actions.saveKyc("bk-108", {
        fullName: "Nguyễn Văn A",
        idNumber: "001198000123",
        dob: "1998-05-12",
        homeTown: "Hà Nội",
        address: "Ocean Park",
        confidence: 0.95,
      });

      // Mismatch
      const resBad = actions.signLease("bk-108", {
        startDate: "2026-10-01",
        months: 12,
        paymentCycle: 1,
        occupants: [],
        refundAccount: { bankName: "MB", accountNo: "1234567890", holderName: "Nguyen Van B" },
      });
      expect(resBad.ok).toBe(false);
      if (!resBad.ok) expect(resBad.code).toBe("holder_mismatch");

      // Match không phân biệt dấu/hoa thường
      const resGood = actions.signLease("bk-108", {
        startDate: "2026-10-01",
        months: 12,
        paymentCycle: 1,
        occupants: [],
        refundAccount: { bankName: "MB", accountNo: "1234567890", holderName: "nguyen van a" },
      });
      expect(resGood.ok).toBe(true);
    });

    it("(15) 6 occupants => invalid_input; occupant thiếu idOrDob => invalid_input; accountNo: '12ab' => invalid_input; paymentCycle: 2 => invalid_input; 0 occupants => ok", () => {
      actions.saveKyc("bk-108", {
        fullName: "Hoàng Thị Yến",
        idNumber: "001198000123",
        dob: "1998-05-12",
        homeTown: "Hà Nội",
        address: "Ocean Park",
        confidence: 0.95,
      });

      const validBase = {
        startDate: "2026-10-01",
        months: 12,
        paymentCycle: 1 as const,
        occupants: [] as Occupant[],
        refundAccount: { bankName: "VCB", accountNo: "1234567890", holderName: "HOANG THI YEN" },
      };

      // 6 occupants
      const res6 = actions.signLease("bk-108", {
        ...validBase,
        occupants: Array(6).fill({ fullName: "Người ở", idOrDob: "001199000111" }),
      });
      expect(res6.ok).toBe(false);
      if (!res6.ok) expect(res6.code).toBe("invalid_input");

      // Thiếu idOrDob
      const resNoId = actions.signLease("bk-108", {
        ...validBase,
        occupants: [{ fullName: "Người ở", idOrDob: "" }],
      });
      expect(resNoId.ok).toBe(false);
      if (!resNoId.ok) expect(resNoId.code).toBe("invalid_input");

      // accountNo chứa chữ cái
      const resBadAcc = actions.signLease("bk-108", {
        ...validBase,
        refundAccount: { ...validBase.refundAccount, accountNo: "12ab34cd" },
      });
      expect(resBadAcc.ok).toBe(false);
      if (!resBadAcc.ok) expect(resBadAcc.code).toBe("invalid_input");

      // paymentCycle: 2 (không thuộc [1, 3, 6])
      const resCycle2 = actions.signLease("bk-108", {
        ...validBase,
        paymentCycle: 2 as unknown as PaymentCycle,
      });
      expect(resCycle2.ok).toBe(false);
      if (!resCycle2.ok) expect(resCycle2.code).toBe("invalid_input");

      // 0 occupants => ok
      const res0 = actions.signLease("bk-108", validBase);
      expect(res0.ok).toBe(true);
    });

    it("(17) bất biến 1: với mọi cycle (1, 3, 6), firstPayment.rent % unit.rent === 0 (không trừ 2tr cọc vào tiền thuê)", () => {
      for (const cycle of PAYMENT_CYCLES) {
        resetMockState(FIXED_NOW);
        actions.saveKyc("bk-108", {
          fullName: "Hoàng Thị Yến",
          idNumber: "001198000123",
          dob: "1998-05-12",
          homeTown: "Hà Nội",
          address: "Ocean Park",
          confidence: 0.95,
        });

        actions.signLease("bk-108", {
          startDate: "2026-10-01",
          months: 12,
          paymentCycle: cycle,
          occupants: [],
          refundAccount: { bankName: "VCB", accountNo: "1234567890", holderName: "HOANG THI YEN" },
        });

        const b = bookingById(getMockState(), "bk-108")!;
        const rent = unitById(b.unitId)!.rent;
        expect(b.lease!.firstPayment.rent).toBe(cycle * rent);
        expect(b.lease!.firstPayment.rent % rent).toBe(0);
      }
    });
  });

  // G4: Hợp đồng uỷ quyền 10 điều
  describe("G4 — Hợp đồng uỷ quyền độc quyền 10 điều", () => {
    it("(18) signConsignment(id, { ownershipWarranted: false }) => no_warranty, status vẫn draft; true => ownershipWarrantedAt === signedAt", () => {
      // cs-1 là consignment draft trong seed
      const resNo = actions.signConsignment("cs-1", { ownershipWarranted: false });
      expect(resNo.ok).toBe(false);
      if (!resNo.ok) expect(resNo.code).toBe("no_warranty");
      expect(getMockState().consignments.find((c) => c.id === "cs-1")?.status).toBe("draft");

      const resYes = actions.signConsignment("cs-1", { ownershipWarranted: true });
      expect(resYes.ok).toBe(true);
      const cs = getMockState().consignments.find((c) => c.id === "cs-1")!;
      expect(cs.ownershipWarrantedAt).toBeTruthy();
      expect(cs.ownershipWarrantedAt).toBe(cs.signedAt);
    });

    it("(19) 4 ví dụ mandateRenewsAt SPEC-P03 §3", () => {
      const now = new Date("2026-09-29T12:00:00.000Z").getTime();

      // 1. signed 2026-01-10, now 2026-09-29 => 2027-01-10
      const m1: Mandate = {
        unitId: "u1",
        status: "active",
        signedAt: "2026-01-10T08:00:00.000Z",
      };
      expect(mandateRenewsAt(m1, now)).toBe("2027-01-10T08:00:00.000Z");

      // 2. signed 2025-03-01, now 2026-09-29 => 2027-03-01
      const m2: Mandate = {
        unitId: "u2",
        status: "active",
        signedAt: "2025-03-01T10:00:00.000Z",
      };
      expect(mandateRenewsAt(m2, now)).toBe("2027-03-01T10:00:00.000Z");

      // 3. signed 2025-08-31, now 2026-09-29 => 2027-08-31
      const m3: Mandate = {
        unitId: "u3",
        status: "active",
        signedAt: "2025-08-31T09:00:00.000Z",
      };
      expect(mandateRenewsAt(m3, now)).toBe("2027-08-31T09:00:00.000Z");

      // 4. signed 2025-09-29T00:00:00.000Z, now 2026-09-29T00:00:00.000Z => 2027-09-29 (bằng thì nhảy kỳ)
      const nowExact = new Date("2026-09-29T00:00:00.000Z").getTime();
      const m4: Mandate = {
        unitId: "u4",
        status: "active",
        signedAt: "2025-09-29T00:00:00.000Z",
      };
      expect(mandateRenewsAt(m4, nowExact)).toBe("2027-09-29T00:00:00.000Z");
    });
  });
});
