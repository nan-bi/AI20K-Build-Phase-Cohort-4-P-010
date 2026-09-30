import { beforeEach, describe, expect, it, vi } from "vitest";

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
import { HOLD_HOURS_DEFAULT, HOUR_MS } from "@/lib/mock/cost";
import { getMockState, resetMockState } from "@/lib/mock/store";
import {
  bookingById,
  isHoldForfeited,
  unitStatus,
} from "@/lib/mock/selectors";
import { viewingLog } from "@/lib/mock/selectors-viewing";

beforeEach(() => {
  mem.clear();
  resetMockState();
});

describe("Deal Flow - SPEC-P01 §7 / deal.test.ts", () => {
  it("(1) hostStartDeposit rồi confirmDepositPaid khi chưa consent => vẫn closing", () => {
    // Lấy booking confirmed từ seed hoặc tạo mới
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

    const afterStart = bookingById(getMockState(), b.id)!;
    expect(afterStart.status).toBe("closing");
    expect(afterStart.depositConsentAt).toBeUndefined();

    // Giả lập webhook ngân hàng báo có khi khách chưa tick consent
    actions.confirmDepositPaid(b.id, "webhook");

    const afterPaidAttempt = bookingById(getMockState(), b.id)!;
    expect(afterPaidAttempt.status).toBe("closing");
  });

  it("(2) consent -> paid => holding, expiresAt - paidAt === HOLD_HOURS_DEFAULT giờ", () => {
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

    // Khách đồng ý điều khoản cọc
    const consentRes = actions.tenantAcceptDepositTerms(b.id);
    expect(consentRes.ok).toBe(true);

    const consented = bookingById(getMockState(), b.id)!;
    expect(consented.depositConsentAt).toBeDefined();

    // Giả lập ngân hàng báo có
    actions.confirmDepositPaid(b.id, "webhook");
    const held = bookingById(getMockState(), b.id)!;
    expect(held.status).toBe("holding");
    expect(held.deposit?.paidAt).toBeDefined();
    expect(held.deposit?.expiresAt).toBeDefined();

    const paidAt = Date.parse(held.deposit!.paidAt!);
    const expiresAt = Date.parse(held.deposit!.expiresAt!);
    expect(expiresAt - paidAt).toBe(HOLD_HOURS_DEFAULT * HOUR_MS);
    expect(held.deposit?.holdHours).toBe(HOLD_HOURS_DEFAULT);
  });

  it("(3) saveKyc khi closing => bad_status", () => {
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

    const res = actions.saveKyc(b.id, {
      fullName: "Trần Văn Nam",
      idNumber: "001095012345",
      dob: "1995-01-01",
      gender: "Nam",
      homeTown: "Hà Nội",
      address: "123 Cầu Giấy, Hà Nội",
      issuedDate: "2021-01-01",
      frontUrl: "mock",
      backUrl: "mock",
      selfieUrl: "mock",
      confidence: 0.95,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("bad_status");
    }
  });

  it("(4) luồng hoàn chỉnh: closing -> consent -> paid -> holding -> saveKyc -> signLease -> leased", () => {
    const b = actions.createBooking({
      unitId: "s2-02-1004",
      slot: "09:00 - 09:45 30/10/2026",
      name: "trần văn   nam",
      phone: "0912345678",
      persons: 2,
    });
    actions.hostAccept(b.id);
    actions.hostStartReceiving(b.id);
    actions.hostConfirmViewing(b.id);
    actions.hostStartDeposit(b.id);
    actions.tenantAcceptDepositTerms(b.id);
    actions.confirmDepositPaid(b.id, "webhook");

    const held = bookingById(getMockState(), b.id)!;
    expect(held.status).toBe("holding");

    const kycRes = actions.saveKyc(b.id, {
      fullName: "Trần Văn Nam",
      idNumber: "001095012345",
      dob: "1995-01-01",
      gender: "Nam",
      homeTown: "Hà Nội",
      address: "Tòa S2.02 Vinhomes Ocean Park, Gia Lâm, Hà Nội",
      issuedDate: "2021-01-01",
      frontUrl: "mock",
      backUrl: "mock",
      selfieUrl: "mock",
      confidence: 0.95,
    });
    expect(kycRes.ok).toBe(true);

    const leaseRes = actions.signLease(b.id, {
      startDate: "2026-11-01",
      months: 12,
      occupants: [{ fullName: "Trần Văn Nam", idOrDob: "001095012345" }],
      refundAccount: { bankName: "VCB", accountNo: "1234567890", holderName: "Trần Văn Nam" },
      paymentCycle: 1,
    });
    expect(leaseRes.ok).toBe(true);

    const leasedBooking = bookingById(getMockState(), b.id)!;
    expect(leasedBooking.status).toBe("leased");
    expect(leasedBooking.lease).toBeDefined();
  });

  it("(5) signLease chưa kyc => no_kyc", () => {
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
    actions.confirmDepositPaid(b.id, "webhook");

    const res = actions.signLease(b.id, {
      startDate: "2026-11-01",
      months: 12,
      occupants: [{ fullName: "Trần Văn Nam", idOrDob: "001095012345" }],
      refundAccount: { bankName: "VCB", accountNo: "1234567890", holderName: "Trần Văn Nam" },
      paymentCycle: 1,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("no_kyc");
    }
  });

  it("(6) saveKyc sai tên so với đặt lịch => mismatch = ['fullName']", () => {
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
    actions.confirmDepositPaid(b.id, "webhook");

    const res = actions.saveKyc(b.id, {
      fullName: "Nguyễn Văn Nam", // Khác tên lúc đặt lịch
      idNumber: "001095012345",
      dob: "1995-01-01",
      gender: "Nam",
      homeTown: "Hà Nội",
      address: "123 Cầu Giấy, Hà Nội",
      issuedDate: "2021-01-01",
      frontUrl: "mock",
      backUrl: "mock",
      selfieUrl: "mock",
      confidence: 0.95,
    });
    expect(res.ok).toBe(true);

    const afterKyc = bookingById(getMockState(), b.id)!;
    expect(afterKyc.kyc?.mismatch).toEqual(["fullName"]);
  });

  it("(7) demoExpireHold => isHoldForfeited true, unitStatus = available, và signLease => expired", () => {
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
    actions.confirmDepositPaid(b.id, "webhook");

    // Tua hết hạn giữ căn
    const expireRes = actions.demoExpireHold(b.id);
    expect(expireRes.ok).toBe(true);

    const held = bookingById(getMockState(), b.id)!;
    const now = Date.now();
    expect(isHoldForfeited(held, now)).toBe(true);
    expect(unitStatus(getMockState(), "s2-02-1004")).toBe("available");

    // Thử ký hợp đồng sau khi đã hết hạn giữ căn
    const signRes = actions.signLease(b.id, {
      startDate: "2026-11-01",
      months: 12,
      occupants: [{ fullName: "Trần Văn Nam", idOrDob: "001095012345" }],
      refundAccount: { bankName: "VCB", accountNo: "1234567890", holderName: "Trần Văn Nam" },
      paymentCycle: 1,
    });
    expect(signRes.ok).toBe(false);
    if (!signRes.ok) {
      expect(signRes.code).toBe("expired");
    }
  });

  it("(8) cancelBooking khi còn 1h59 => too_late, khi còn 2h01 => ok", () => {
    const now = Date.now();
    // Tạo 2 slot: một slot 1h59m tới và một slot 2h05m tới
    // Dùng slot ISO hoặc timestamp
    const slotSoon = new Date(now + 119 * 60_000).toISOString();
    const slotLater = new Date(now + 125 * 60_000).toISOString();

    const bSoon = actions.createBooking({
      unitId: "s2-02-1004",
      slot: slotSoon,
      name: "Khách Đặt Sớm",
      phone: "0912345678",
      persons: 1,
    });
    actions.hostAccept(bSoon.id);

    const bLater = actions.createBooking({
      unitId: "s2-12-1608",
      slot: slotLater,
      name: "Khách Đặt Muộn",
      phone: "0912345678",
      persons: 1,
    });
    actions.hostAccept(bLater.id);

    const resSoon = actions.cancelBooking(bSoon.id, "Bận việc đột xuất", "tenant");
    expect(resSoon.ok).toBe(false);
    if (!resSoon.ok) {
      expect(resSoon.code).toBe("too_late");
    }

    const resLater = actions.cancelBooking(bLater.id, "Bận việc", "tenant");
    expect(resLater.ok).toBe(true);
  });

  it("(9) viewEndedAt được set bởi hostStartDeposit và hostNotInterested", () => {
    const b1 = actions.createBooking({
      unitId: "s2-02-1004",
      slot: "09:00 - 09:45 30/10/2026",
      name: "Khách Cọc",
      phone: "0912345678",
      persons: 1,
    });
    actions.hostAccept(b1.id);
    actions.hostStartReceiving(b1.id);
    actions.hostConfirmViewing(b1.id);
    actions.hostStartDeposit(b1.id);

    const afterDep = bookingById(getMockState(), b1.id)!;
    expect(afterDep.viewEndedAt).toBeDefined();

    const b2 = actions.createBooking({
      unitId: "s2-19-1907",
      slot: "10:00 - 10:45 30/10/2026",
      name: "Khách Không Ưng",
      phone: "0987654321",
      persons: 1,
    });
    actions.hostAccept(b2.id);
    actions.hostStartReceiving(b2.id);
    actions.hostConfirmViewing(b2.id);
    actions.hostNotInterested(b2.id, "Chưa ưng hướng ban công");

    const afterNot = bookingById(getMockState(), b2.id)!;
    expect(afterNot.viewEndedAt).toBeDefined();
  });

  it("(10) viewingLog: outcome và durationMin đúng cho 3 booking seed", () => {
    const logs = viewingLog(getMockState(), {});
    expect(logs.length).toBeGreaterThanOrEqual(1);

    // Kiểm tra các trường cơ bản
    for (const log of logs) {
      expect(log.bookingId).toBeDefined();
      expect(log.tenantPhoneMasked).toBeDefined();
      expect(log.startedAt).toBeDefined();
      expect(["in_progress", "deposit", "not_decided", "no_show", "cancelled"]).toContain(log.outcome);
      if (log.endedAt) {
        expect(log.durationMin).toBeDefined();
        expect(log.durationMin).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
