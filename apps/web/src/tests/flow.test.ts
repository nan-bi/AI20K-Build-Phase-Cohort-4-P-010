import { beforeEach, describe, expect, it, vi } from "vitest";

// Store chạy trên localStorage của trình duyệt; dựng một window tối giản cho môi trường node.
const mem = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) },
  addEventListener: () => {},
});

const actions = await import("@/lib/mock/actions");
const { getMockState, resetMockState } = await import("@/lib/mock/store");
const { unitStatus, noticesFor, bookingById } = await import("@/lib/mock/selectors");
const { unitById } = await import("@/lib/mock/units");
const { upcomingSlots } = await import("@/lib/mock/slots");

const slot = (i: number) => upcomingSlots(Date.now(), 30)[i];

beforeEach(() => {
  mem.clear();
  resetMockState();
});

function book(unitId: string, name: string, phone: string, i: number) {
  return actions.createBooking({ unitId, slot: slot(i), name, phone, persons: 1 });
}

describe("OTP Zalo", () => {
  it("chỉ chấp nhận đúng mã đã gửi và dùng một lần", () => {
    const code = actions.requestOtp("0988123456", "booking");
    expect(actions.verifyOtp("0000" === code ? "1111" : "0000")).toBe(false);
    expect(actions.verifyOtp(code)).toBe(true);
    expect(actions.verifyOtp(code)).toBe(false);
  });
  it("gửi mã như một tin Zalo tới đúng SĐT", () => {
    const code = actions.requestOtp("+84 988 123 456", "booking");
    const msg = noticesFor(getMockState(), "tenant", "0988123456")[0];
    expect(msg.body).toContain(code);
  });
});

describe("đặt lịch → Host → Zalo", () => {
  it("tạo ticket pending, báo Host và Admin, cảm ơn khách qua Zalo", () => {
    const b = book("s2-02-1004", "Nguyễn Thu Hà", "0988123456", 12);
    const s = getMockState();
    expect(b.status).toBe("pending");
    expect(b.ref).toMatch(/^VS-[2-9A-HJ-NP-Z]{5}$/);
    expect(noticesFor(s, "host", "H01").some((n) => n.bookingId === b.id)).toBe(true);
    expect(noticesFor(s, "admin").some((n) => n.bookingId === b.id)).toBe(true);
    expect(noticesFor(s, "tenant", "0988123456").some((n) => n.title.includes("Đã nhận yêu cầu"))).toBe(true);
  });
  it("Host nhận ca → confirmed và gửi Zalo có tên + SĐT Host", () => {
    const b = book("s2-02-1004", "Nguyễn Thu Hà", "0988123456", 12);
    actions.hostAccept(b.id);
    expect(bookingById(getMockState(), b.id)!.status).toBe("confirmed");
    const zalo = noticesFor(getMockState(), "tenant", "0988123456").find((n) => n.title.includes("Host đã xác nhận"))!;
    expect(zalo.body).toContain("Lê Quốc Bảo");
  });
  it("nhắc hẹn T-10 có nút 1-chạm; khách bấm → lobby và Host được push", () => {
    const b = book("s2-02-1004", "Nguyễn Thu Hà", "0988123456", 12);
    actions.hostAccept(b.id);
    actions.sendReminder(b.id);
    const notice = noticesFor(getMockState(), "tenant", "0988123456").find((n) => n.actions)!;
    expect(notice.actions?.map((a) => a.id)).toEqual(["arrived", "late"]);
    actions.tenantCheckIn(b.id);
    expect(bookingById(getMockState(), b.id)!.status).toBe("lobby");
    expect(noticesFor(getMockState(), "host", "H01")[0].title).toContain("có mặt tại sảnh");
  });
});

describe("mở cửa, cọc, ký số", () => {
  function toViewing() {
    const b = book("s2-02-1004", "Nguyễn Thu Hà", "0988123456", 12);
    actions.hostAccept(b.id);
    actions.hostStartReceiving(b.id);
    const code = actions.hostConfirmViewing(b.id);
    return { b, code };
  }

  it("Xác nhận xem phòng cấp mã cửa 6 số và báo chủ nhà + Admin", () => {
    const { b, code } = toViewing();
    expect(code).toMatch(/^\d{6}$/);
    const s = getMockState();
    const landlord = unitById("s2-02-1004")!.landlordId;
    expect(noticesFor(s, "landlord", landlord).some((n) => n.bookingId === b.id && n.title.includes("mở khoá"))).toBe(true);
    expect(noticesFor(s, "admin").some((n) => n.bookingId === b.id)).toBe(true);
  });
  it("căn dùng chìa cơ không sinh mã số", () => {
    const b = book("zr2-09-0912", "Lê Văn A", "0977000111", 13);
    actions.hostAccept(b.id);
    actions.hostStartReceiving(b.id);
    expect(actions.hostConfirmViewing(b.id)).toBeUndefined();
  });
  it("cọc thành công → holding 24h và tự huỷ lịch xem trùng căn kèm Zalo xin lỗi + căn tương đương", () => {
    const { b } = toViewing();
    const other = book("s2-02-1004", "Trần Thị B", "0966555444", 15);
    actions.hostAccept(other.id);
    actions.hostStartDeposit(b.id);
    actions.confirmDepositPaid(b.id, "webhook");
    const s = getMockState();
    expect(unitStatus(s, unitById("s2-02-1004")!)).toBe("holding");
    expect(bookingById(s, b.id)!.status).toBe("holding");
    expect(bookingById(s, other.id)!.status).toBe("cancelled");
    expect(bookingById(s, other.id)!.closedReason).toBe("auto_cancelled_due_to_deposit");
    const sorry = noticesFor(s, "tenant", "0966555444").find((n) => n.title.includes("có người cọc"))!;
    expect(sorry.body).toContain("tương đương");
    expect(bookingById(s, b.id)!.deposit!.amount).toBe(2_000_000);
  });
  it("UNC thủ công chỉ giữ tạm 30 phút, chưa đổi trạng thái lịch", () => {
    const { b } = toViewing();
    actions.hostStartDeposit(b.id);
    actions.confirmDepositPaid(b.id, "host_receipt");
    const s = getMockState();
    expect(bookingById(s, b.id)!.status).toBe("closing");
    const until = new Date(s.unitState["s2-02-1004"].holdingUntil!).getTime() - Date.now();
    expect(until).toBeGreaterThan(29 * 60_000);
    expect(until).toBeLessThanOrEqual(30 * 60_000);
  });
  it("đi hết chuỗi eKYC → ký cọc → ký hợp đồng thì căn chuyển rented", () => {
    const { b } = toViewing();
    actions.hostStartDeposit(b.id);
    actions.confirmDepositPaid(b.id);
    actions.saveKyc(b.id, { fullName: "NGUYỄN THU HÀ", idNumber: "001912345678", dob: "12/04/2001", issuedDate: "18/08/2021", address: "Gia Lâm, Hà Nội", confidence: { fullName: 0.99, idNumber: 0.98, issuedDate: 0.94, address: 0.78 }, manuallyEdited: true, faceMatch: 0.96 });
    actions.signAgreement(b.id);
    expect(bookingById(getMockState(), b.id)!.status).toBe("signed");
    actions.signLease(b.id, { startDate: new Date().toISOString(), months: 12 });
    const s = getMockState();
    expect(bookingById(s, b.id)!.status).toBe("leased");
    expect(unitStatus(s, unitById("s2-02-1004")!)).toBe("rented");
  });
});

describe("thoát ủy quyền 15 ngày", () => {
  it("từ chối khi căn đang giữ cọc hoặc đã cho thuê", () => {
    const holding = actions.requestMandateExit(unitById("s2-16-2216")!);
    expect(holding.ok).toBe(false);
    const rented = actions.requestMandateExit(unitById("s1-03-1512")!);
    expect(rented.ok).toBe(false);
  });
  it("chấp nhận khi căn trống và đặt hiệu lực đúng 15 ngày sau", () => {
    const r = actions.requestMandateExit(unitById("s2-12-1608")!);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const days = (new Date(r.effectiveAt).getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(14.99);
      expect(days).toBeLessThanOrEqual(15);
    }
    expect(getMockState().mandates["s2-12-1608"].status).toBe("exiting");
  });
});

describe("Admin", () => {
  it("cập nhật biến phí có lưu vết ai sửa, giá trị cũ và mới", () => {
    actions.updateFee("dealCommission", 500_000, "Phạm Thu Hà");
    const s = getMockState();
    expect(s.fees.dealCommission).toBe(500_000);
    expect(s.feeAudit[0]).toMatchObject({ field: "dealCommission", from: 400_000, to: 500_000, by: "Phạm Thu Hà" });
  });
  it("điều phối thủ công chuyển ticket sang Host khác và push cho Host đó", () => {
    const b = book("s2-02-1004", "Nguyễn Thu Hà", "0988123456", 12);
    actions.adminReassign(b.id, "H02");
    expect(bookingById(getMockState(), b.id)!.hostId).toBe("H02");
    expect(noticesFor(getMockState(), "host", "H02")[0].title).toContain("Admin giao ticket");
  });
  it("duyệt ký gửi báo chủ nhà qua Zalo", () => {
    actions.approveConsignment("cs-2");
    const s = getMockState();
    expect(s.consignments.find((c) => c.id === "cs-2")!.status).toBe("approved");
    expect(noticesFor(s, "landlord", "L1")[0].title).toContain("đã được duyệt");
  });
  it("duyệt ký gửi kèm cấu hình chính sách thuê đưa căn hộ vào rổ hàng UNITS", () => {
    actions.approveConsignment("cs-2", {
      rent: 8_500_000,
      bqlFeeIncluded: true,
      holdingDepositAmount: 2_500_000,
      securityDepositMonths: 1,
      minMonths: 12,
      paymentTermMonths: 1,
      petFriendly: true,
      hostId: "H01",
    });
    const s = getMockState();
    const cs = s.consignments.find((c) => c.id === "cs-2")!;
    expect(cs.status).toBe("approved");
    expect(cs.policy?.holdingDepositAmount).toBe(2_500_000);
    expect(cs.policy?.bqlFeeIncluded).toBe(true);
    expect(cs.policy?.rent).toBe(8_500_000);
  });
});
