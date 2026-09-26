"use client";

import { RATES } from "./cost";
import { fmtTime, dayLabel, normalizePhone, vnd } from "./format";
import { hostBookings, isOpenBooking, similarUnits, slotTaken, unitStatus } from "./selectors";
import { emptyChat } from "./seed";
import { getMockState, resetMockState, setMockState } from "./store";
import type {
  Booking,
  ChatMessage,
  Consignment,
  CriteriaState,
  FeeConfig,
  IdCardData,
  MockState,
  Notice,
  OtpChallenge,
} from "./types";
import { hostById, hostForUnit, unitById, unitAddress, type Unit } from "./units";

// ─── tiện ích ─────────────────────────────────────────────────────────────────────────────────

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function makeRef(existing: Booking[]): string {
  for (;;) {
    let s = "";
    for (let i = 0; i < 5; i++) s += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
    const ref = `VS-${s}`;
    if (!existing.some((b) => b.ref === ref)) return ref;
  }
}

const iso = (ms: number) => new Date(ms).toISOString();
const digits = (n: number) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, "0");

type NoticeInput = Omit<Notice, "id" | "at"> & { at?: string };
const notice = (n: NoticeInput): Notice => ({ id: uid("nt"), at: iso(Date.now()), ...n });

const zaloToTenant = (phone: string, n: Omit<NoticeInput, "audience" | "channel" | "toKey">): Notice =>
  notice({ audience: "tenant", channel: "zalo", toKey: normalizePhone(phone), ...n });
const zaloToLandlord = (landlordId: string, n: Omit<NoticeInput, "audience" | "channel" | "toKey">): Notice =>
  notice({ audience: "landlord", channel: "zalo", toKey: landlordId, ...n });
const pushToHost = (hostId: string, n: Omit<NoticeInput, "audience" | "channel" | "toKey">): Notice =>
  notice({ audience: "host", channel: "push", toKey: hostId, ...n });
const toAdmin = (n: Omit<NoticeInput, "audience" | "channel" | "toKey">): Notice =>
  notice({ audience: "admin", channel: "system", ...n });

const slotText = (slot: string, now = Date.now()) => `${fmtTime(slot)} ${dayLabel(slot, now).toLowerCase()}`;

function patchBooking(state: MockState, id: string, patch: Partial<Booking>): MockState {
  return { ...state, bookings: state.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) };
}

function withNotices(state: MockState, ...items: Notice[]): MockState {
  return { ...state, notices: [...items, ...state.notices].slice(0, 300) };
}

function requireBooking(id: string): Booking {
  const b = getMockState().bookings.find((x) => x.id === id);
  if (!b) throw new Error(`Không tìm thấy lịch hẹn ${id}`);
  return b;
}

// ─── OTP (Zalo) ───────────────────────────────────────────────────────────────────────────────

/** Sinh mã 4 số và "gửi" qua Zalo — tin nhắn xuất hiện trong luồng Zalo mô phỏng. */
export function requestOtp(phone: string, purpose: OtpChallenge["purpose"]): string {
  const code = digits(4);
  const p = normalizePhone(phone);
  const otp: OtpChallenge = { phone: p, code, expiresAt: Date.now() + 5 * 60_000, purpose };
  const label = { booking: "đặt lịch xem phòng", kyc: "xác minh CCCD", agreement: "ký thỏa thuận đặt cọc", lease: "ký hợp đồng thuê" }[purpose];
  setMockState((s) =>
    withNotices(
      { ...s, otp },
      zaloToTenant(p, {
        title: "Mã xác thực VinStay AI",
        body: `${code} là mã xác thực ${label} của bạn. Mã có hiệu lực 5 phút. Không chia sẻ mã này cho bất kỳ ai, kể cả nhân viên VinStay.`,
        tone: "info",
      }),
    ),
  );
  return code;
}

export function verifyOtp(code: string): boolean {
  const { otp } = getMockState();
  if (!otp || otp.expiresAt < Date.now() || otp.code !== code.trim()) return false;
  setMockState((s) => ({ ...s, otp: null }));
  return true;
}

// ─── Khách thuê: đặt lịch ────────────────────────────────────────────────────────────────────

export interface BookingInput {
  unitId: string;
  slot: string;
  name: string;
  phone: string;
  persons: number;
  note?: string;
}

export function createBooking(input: BookingInput): Booking {
  const state = getMockState();
  const unit = unitById(input.unitId)!;
  const host = hostForUnit(unit);
  const now = Date.now();
  const phone = normalizePhone(input.phone);
  const booking: Booking = {
    id: uid("bk"),
    ref: makeRef(state.bookings),
    unitId: unit.id,
    hostId: host.id,
    tenant: { name: input.name.trim(), phone, persons: input.persons, note: input.note?.trim() || undefined },
    slot: input.slot,
    status: "pending",
    createdAt: iso(now),
  };
  setMockState((s) =>
    withNotices(
      { ...s, bookings: [booking, ...s.bookings], tenantProfile: { name: booking.tenant.name, phone } },
      zaloToTenant(phone, {
        bookingId: booking.id,
        unitId: unit.id,
        tone: "success",
        title: "Đã nhận yêu cầu xem phòng",
        body: `Cảm ơn ${booking.tenant.name}! VinStay AI đã nhận yêu cầu xem căn ${unitAddress(unit)} lúc ${slotText(input.slot, now)}. Mã lịch hẹn của bạn: ${booking.ref}. Field Host sẽ xác nhận trong vòng 3 phút, chi tiết người đón và vị trí sảnh sẽ được gửi lại ngay tại đây.`,
      }),
      pushToHost(host.id, {
        bookingId: booking.id,
        unitId: unit.id,
        tone: "alert",
        title: "Ticket mới — cần nhận trong 3 phút",
        body: `${booking.tenant.name} · ${unitAddress(unit)} · hẹn ${slotText(input.slot, now)}.`,
      }),
      toAdmin({
        bookingId: booking.id,
        unitId: unit.id,
        title: "Lịch xem mới (đã xác thực OTP)",
        body: `${booking.ref} · ${unit.code} · giao cho Host ${host.name}.`,
      }),
    ),
  );
  return booking;
}

export function cancelBooking(id: string, reason: string, by: "tenant" | "host" = "tenant") {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { status: "cancelled", closedReason: reason }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        title: "Đã huỷ lịch xem phòng",
        body: `Lịch ${b.ref} xem căn ${unitAddress(unit)} đã được huỷ. Bạn có thể đặt lại khung giờ khác bất cứ lúc nào.`,
      }),
      pushToHost(b.hostId, {
        bookingId: id,
        unitId: unit.id,
        tone: "warning",
        title: by === "tenant" ? "Khách huỷ lịch" : "Lịch đã huỷ",
        body: `${b.tenant.name} huỷ lịch ${slotText(b.slot)} — ${reason}. Ca trực được giải phóng.`,
      }),
    ),
  );
}

export function rescheduleBooking(id: string, slot: string) {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  if (slotTaken(getMockState(), b.hostId, slot, id)) throw new Error("Khung giờ này đã có lịch khác của Host.");
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { slot, status: "pending", confirmedAt: undefined }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        title: "Đã đổi giờ xem phòng",
        body: `Lịch ${b.ref} chuyển sang ${slotText(slot)}. Field Host sẽ xác nhận lại trong vài phút.`,
      }),
      pushToHost(b.hostId, {
        bookingId: id,
        unitId: unit.id,
        tone: "warning",
        title: "Khách đổi giờ hẹn",
        body: `${b.tenant.name} đổi sang ${slotText(slot)} · ${unitAddress(unit)}.`,
      }),
    ),
  );
}

export function tenantCheckIn(id: string) {
  const b = requireBooking(id);
  if (!["confirmed"].includes(b.status)) return;
  const unit = unitById(b.unitId)!;
  setMockState((s) =>
    withNotices(
      markReminderAction(patchBooking(s, id, { status: "lobby", lobbyAt: iso(Date.now()) }), id, "arrived"),
      pushToHost(b.hostId, {
        bookingId: id,
        unitId: unit.id,
        tone: "alert",
        title: "Khách đã có mặt tại sảnh",
        body: `${b.tenant.name} bấm “Tôi đã có mặt tại sảnh” — xuống đón ở sảnh ${unit.building}.`,
      }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        tone: "success",
        title: "Host đang xuống sảnh",
        body: `Host ${hostById(b.hostId)?.name} đã nhận thông báo và sẽ xuống sảnh đón bạn trong khoảng 60 giây. Host mặc đồng phục VinStay và đeo thẻ cư dân thang máy.`,
      }),
    ),
  );
}

export function tenantRunningLate(id: string) {
  const b = requireBooking(id);
  if (b.status !== "confirmed") return;
  const unit = unitById(b.unitId)!;
  setMockState((s) =>
    withNotices(
      markReminderAction(patchBooking(s, id, { lateRequested: true }), id, "late"),
      pushToHost(b.hostId, {
        bookingId: id,
        unitId: unit.id,
        tone: "warning",
        title: "Khách xin trễ 10 phút",
        body: `${b.tenant.name} đang trên đường tới sảnh ${unit.building}.`,
      }),
    ),
  );
}

function markReminderAction(state: MockState, bookingId: string, actionId: "arrived" | "late"): MockState {
  const doneAt = iso(Date.now());
  return {
    ...state,
    notices: state.notices.map((n) =>
      n.bookingId === bookingId && n.actions?.some((a) => a.id === actionId)
        ? { ...n, actions: n.actions.map((a) => (a.id === actionId ? { ...a, doneAt } : a)) }
        : n,
    ),
  };
}

export function rateHost(id: string, stars: number) {
  setMockState((s) => patchBooking(s, id, { rating: stars }));
}

// ─── Field Host: quy trình xem phòng ────────────────────────────────────────────────────────

export function hostAccept(id: string) {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  const host = hostById(b.hostId)!;
  const now = Date.now();
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { status: "confirmed", confirmedAt: iso(now) }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        tone: "success",
        title: "Host đã xác nhận lịch xem",
        body: `Lịch ${b.ref} đã được xác nhận: căn ${unitAddress(unit)}, ${slotText(b.slot, now)}. Field Host tiếp đón: ${host.name} · ${host.phone}. Host sẽ chờ bạn ở sảnh toà ${unit.building}. Trước giờ hẹn 10 phút, mình sẽ nhắn kèm nút “Tôi đã có mặt tại sảnh”.`,
      }),
      toAdmin({ bookingId: id, unitId: unit.id, tone: "success", title: "Host đã nhận ticket", body: `${host.name} nhận ${b.ref} sau ${Math.max(1, Math.round((now - new Date(b.createdAt).getTime()) / 1000))} giây.` }),
    ),
  );
}

export function hostReject(id: string, reason: string) {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { status: "rejected", closedReason: reason }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        tone: "warning",
        title: "Cần đổi giờ xem phòng",
        body: `Rất tiếc, khung giờ ${slotText(b.slot)} cho căn ${unitAddress(unit)} chưa sắp xếp được Host (${reason}). Bạn chọn giúp mình khung giờ khác trong đường dẫn lịch hẹn ${b.ref} nhé.`,
      }),
      toAdmin({ bookingId: id, unitId: unit.id, tone: "warning", title: "Host từ chối ticket", body: `${b.ref} · ${reason}. Chuyển Open Pool.` }),
    ),
  );
}

/** Gửi nhắc hẹn kép T-10m: push cho Host + Zalo có nút 1-chạm cho khách. */
export function sendReminder(id: string) {
  const b = requireBooking(id);
  if (b.reminderSentAt) return;
  const unit = unitById(b.unitId)!;
  const now = Date.now();
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { reminderSentAt: iso(now) }),
      pushToHost(b.hostId, {
        bookingId: id,
        unitId: unit.id,
        tone: "alert",
        title: "Còn 10 phút — xuống sảnh đón khách",
        body: `${b.tenant.name} hẹn ${fmtTime(b.slot)} · sảnh toà ${unit.building}.`,
      }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        tone: "info",
        title: "Nhắc hẹn: còn 10 phút",
        body: `Còn 10 phút nữa là tới giờ xem căn ${unitAddress(unit)}. Host ${hostById(b.hostId)?.name} đang chờ ở sảnh toà ${unit.building}. Khi tới nơi, bấm nút bên dưới để Host xuống đón — không cần quét mã QR nào ở sảnh.`,
        actions: [
          { id: "arrived", label: "Tôi đã có mặt tại sảnh" },
          { id: "late", label: "Đang trên đường — xin trễ 10 phút" },
        ],
      }),
    ),
  );
}

export function hostStartReceiving(id: string) {
  const b = requireBooking(id);
  if (!["confirmed", "lobby"].includes(b.status)) return;
  const unit = unitById(b.unitId)!;
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { status: "receiving", receivingAt: iso(Date.now()) }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        title: "Host bắt đầu tiếp đón",
        body: `Host ${hostById(b.hostId)?.name} đang đón bạn ở sảnh và sẽ quẹt thẻ cư dân để lên căn ${unitAddress(unit)}.`,
      }),
    ),
  );
}

/** Host tới cửa và bấm [Xác nhận xem phòng] → nhận mã cửa; báo chủ nhà + admin. */
export function hostConfirmViewing(id: string): string | undefined {
  const b = requireBooking(id);
  if (b.status !== "receiving") return b.doorCode;
  const unit = unitById(b.unitId)!;
  const host = hostById(b.hostId)!;
  const now = Date.now();
  const code = unit.lock === "smart" ? digits(6) : undefined;
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, {
        status: "viewing",
        viewingAt: iso(now),
        doorCode: code,
        doorCodeExpiresAt: code ? iso(now + 10 * 60_000) : undefined,
      }),
      zaloToLandlord(unit.landlordId, {
        bookingId: id,
        unitId: unit.id,
        tone: "info",
        title: "Căn hộ vừa được mở khoá đón khách",
        body: `Căn ${unit.code} được mở khoá lúc ${fmtTime(now)} bởi Field Host ${host.name}, dẫn khách ${b.tenant.name}. Bạn không cần làm gì — chúng tôi sẽ báo kết quả buổi xem.`,
      }),
      toAdmin({ bookingId: id, unitId: unit.id, title: "Ghi nhận lượt mở cửa", body: `${host.name} mở ${unit.code} lúc ${fmtTime(now)} (${unit.lock === "smart" ? "mã số" : "chìa cơ"}).` }),
    ),
  );
  return code;
}

/** Nút [Hỗ trợ khẩn cấp]: khoá điện tử lỗi → gọi bảo mật tới chủ nhà; chìa cơ thất lạc → Area Lead mang chìa dự phòng (≤5 phút). */
export function hostEmergency(id: string, kind: "smart_lock" | "physical_key") {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  const host = hostById(b.hostId)!;
  const text =
    kind === "smart_lock"
      ? `Khoá điện tử căn ${unit.code} không mở được. Đang kết nối cuộc gọi bảo mật giữa Host ${host.name} và chủ nhà để lấy mã khẩn cấp.`
      : `Chìa cơ căn ${unit.code} không dùng được. Area Lead phân khu mang chìa dự phòng tới trong ≤ 5 phút.`;
  setMockState((s) =>
    withNotices(
      s,
      toAdmin({ bookingId: id, unitId: unit.id, tone: "alert", title: "Host cần hỗ trợ khẩn cấp", body: text }),
      ...(kind === "smart_lock"
        ? [zaloToLandlord(unit.landlordId, { bookingId: id, unitId: unit.id, tone: "warning" as const, title: "Host cần mã cửa khẩn cấp", body: `Field Host ${host.name} đang đứng trước cửa căn ${unit.code} nhưng khoá điện tử không mở được. Bạn sẽ nhận một cuộc gọi bảo mật từ hệ thống trong ít phút.` })]
        : []),
    ),
  );
}

/** Admin điều phối thủ công một ticket sang Host khác (khi quá SLA hoặc Host từ chối). */
export function adminReassign(id: string, hostId: string) {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  const to = hostById(hostId)!;
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { hostId }),
      pushToHost(hostId, { bookingId: id, unitId: unit.id, tone: "alert", title: "Admin giao ticket cho bạn", body: `${b.tenant.name} · ${unitAddress(unit)} · hẹn ${slotText(b.slot)}. Vui lòng nhận trong 3 phút.` }),
      toAdmin({ bookingId: id, unitId: unit.id, tone: "info", title: "Đã điều phối thủ công", body: `${b.ref} chuyển cho Host ${to.name}.` }),
    ),
  );
}

export function hostNotInterested(id: string, reason: string) {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  const similar = similarUnits(getMockState(), unit, 2);
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { status: "completed", closedReason: reason }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        title: "Cảm ơn bạn đã xem phòng",
        body: `Cảm ơn ${b.tenant.name} đã dành thời gian xem căn ${unitAddress(unit)}.${similar.length ? ` VinStay AI gợi ý thêm ${similar.map((u) => unitAddress(u)).join(" và ")} có layout và mức giá gần với căn bạn vừa xem.` : ""}`,
      }),
      zaloToLandlord(unit.landlordId, {
        bookingId: id,
        unitId: unit.id,
        title: "Kết quả buổi xem phòng",
        body: `Buổi xem căn ${unit.code} lúc ${fmtTime(b.slot)} đã hoàn tất. Khách chưa quyết định (${reason}). Căn tiếp tục mở đón khách khác.`,
      }),
    ),
  );
}

export function hostMarkNoShow(id: string) {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { status: "no_show", closedReason: "Khách không có mặt sau 15 phút, ca trực được giải phóng" }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        tone: "warning",
        title: "Lịch xem đã tự huỷ",
        body: `Bạn chưa có mặt sau 15 phút nên lịch ${b.ref} đã được huỷ để Host phục vụ khách khác. Bạn có thể đặt lại bất cứ lúc nào.`,
      }),
      toAdmin({ bookingId: id, unitId: unit.id, tone: "warning", title: "No-show", body: `${b.ref} · ${b.tenant.name} (gắn cờ uy tín SĐT).` }),
    ),
  );
}

// ─── Chốt cọc 2.000.000đ (VietQR) ────────────────────────────────────────────────────────────

/** Host bấm [Khách chốt] → sinh VietQR động COC [Mã căn] [SĐT]. */
export function hostStartDeposit(id: string) {
  const b = requireBooking(id);
  if (b.status !== "viewing") return;
  const unit = unitById(b.unitId)!;
  setMockState((s) =>
    patchBooking(s, id, {
      status: "closing",
      deposit: {
        amount: RATES.holdingDeposit,
        content: `COC ${unit.code} ${b.tenant.phone}`,
        qrRef: `VQ-${digits(4)}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
        createdAt: iso(Date.now()),
      },
    }),
  );
}

/**
 * Webhook ngân hàng báo có (hoặc Host đối soát UNC): khoá căn `holding` 24h, tự huỷ các lịch xem còn lại của căn
 * và Zalo xin lỗi kèm 2 căn tương đương (AI Conflict Resolver — PRD §3.5).
 */
export function confirmDepositPaid(id: string, method: "webhook" | "host_receipt" = "webhook") {
  const b = requireBooking(id);
  const dep = b.deposit;
  if (!dep) return;
  const unit = unitById(b.unitId)!;
  const now = Date.now();

  if (method === "host_receipt") {
    const until = iso(now + 30 * 60_000);
    setMockState((s) =>
      withNotices(
        {
          ...patchBooking(s, id, { deposit: { ...dep, method, tempHoldUntil: until } }),
          unitState: { ...s.unitState, [unit.id]: { status: "holding", holdingUntil: until } },
        },
        toAdmin({ bookingId: id, unitId: unit.id, tone: "warning", title: "Cần đối soát UNC thủ công", body: `Host tải UNC cọc ${b.ref}; căn ${unit.code} giữ tạm 30 phút chờ webhook.` }),
      ),
    );
    return;
  }

  const paidAt = iso(now);
  const expiresAt = iso(now + 24 * 3_600_000);
  const state = getMockState();
  const victims = state.bookings.filter((x) => x.id !== id && x.unitId === unit.id && ["pending", "confirmed", "lobby"].includes(x.status));
  const alternatives = similarUnits(state, unit, 2);

  setMockState((s) => {
    let next = patchBooking(s, id, { status: "holding", deposit: { ...dep, paidAt, expiresAt, method, tempHoldUntil: undefined } });
    next = { ...next, unitState: { ...next.unitState, [unit.id]: { status: "holding", holdingUntil: expiresAt } } };
    const extra: Notice[] = [
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        tone: "success",
        title: "Đã nhận cọc giữ chỗ 24 giờ",
        body: `Thanh toán thành công ${vnd(dep.amount)}đ! Căn ${unitAddress(unit)} đã được khoá giữ chỗ cho bạn tới ${fmtTime(expiresAt)} ${dayLabel(expiresAt, now).toLowerCase()}. Khoản cọc này chuyển 100% thành Tiền cọc bảo đảm khi ký hợp đồng thuê, không trừ vào tiền thuê tháng đầu. Bước tiếp theo: xác minh CCCD và ký thỏa thuận cọc.`,
      }),
      zaloToLandlord(unit.landlordId, {
        bookingId: id,
        unitId: unit.id,
        tone: "success",
        title: "Nhận cọc giữ chỗ 2.000.000đ",
        body: `Chúc mừng! Căn ${unit.code} vừa nhận cọc giữ chỗ 24h qua VietQR từ khách ${b.tenant.name}. Các lịch xem còn lại của căn đã được huỷ tự động.`,
      }),
      toAdmin({ bookingId: id, unitId: unit.id, tone: "success", title: "Cọc 2.000.000đ đã gạch nợ", body: `${unit.code} chuyển holding 24h. Hủy tự động ${victims.length} lịch xem trùng căn.` }),
    ];
    for (const v of victims) {
      next = patchBooking(next, v.id, { status: "cancelled", closedReason: "auto_cancelled_due_to_deposit" });
      extra.push(
        zaloToTenant(v.tenant.phone, {
          bookingId: v.id,
          unitId: unit.id,
          tone: "warning",
          title: "Căn bạn đặt lịch vừa có người cọc",
          body: `VinStay AI xin thông báo: căn ${unitAddress(unit)} bạn vừa đặt lịch đã được một khách khác hoàn tất cọc giữ chỗ 24h. Để không làm mất thời gian của bạn, mình đã tìm được ${alternatives.length} căn tương đương trong cùng khu: ${alternatives.map((u) => `${unitAddress(u)} (${vnd(u.rent)}đ)`).join(", ")}. Bấm vào lịch hẹn để đổi sang căn khác miễn phí, không cần xác thực lại OTP.`,
        }),
      );
    }
    return withNotices(next, ...extra);
  });
}

// ─── eKYC CCCD → thỏa thuận cọc → hợp đồng thuê ────────────────────────────────────────────

export function saveKyc(id: string, data: Omit<IdCardData, "verifiedAt" | "consentAt">) {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  const now = iso(Date.now());
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { kyc: { ...data, consentAt: now, verifiedAt: now } }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        tone: "success",
        title: "Đã xác minh CCCD",
        body: "VinStay AI đã xác minh CCCD của bạn một lần duy nhất và mã hoá AES-256 theo Nghị định 13/2023/NĐ-CP. Ảnh gốc không được chia sẻ với môi giới hay chủ nhà.",
      }),
    ),
  );
}

export function signAgreement(id: string) {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  const docId = `TT-${new Date().getFullYear()}-${digits(4)}`;
  setMockState((s) =>
    withNotices(
      patchBooking(s, id, { status: "signed", agreement: { signedAt: iso(Date.now()), docId } }),
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        tone: "success",
        title: "Đã ký Thỏa thuận đặt cọc",
        body: `Thỏa thuận ${docId} đã được ký số bằng OTP. Căn ${unitAddress(unit)} được giữ chỗ tới hết hạn cọc; bạn có thể ký hợp đồng thuê chính thức cùng Field Host. File PDF có chữ ký số nằm trong lịch hẹn ${b.ref}.`,
      }),
      zaloToLandlord(unit.landlordId, {
        bookingId: id,
        unitId: unit.id,
        title: "Khách đã ký thỏa thuận đặt cọc",
        body: `Khách ${b.tenant.name} đã ký Thỏa thuận đặt cọc cho căn ${unit.code}. Bước tiếp theo là ký hợp đồng thuê chính thức.`,
      }),
    ),
  );
}

export function signLease(id: string, opts: { startDate: string; months: number }) {
  const b = requireBooking(id);
  const unit = unitById(b.unitId)!;
  const docId = `HD-${new Date().getFullYear()}-${digits(4)}`;
  const now = iso(Date.now());
  setMockState((s) =>
    withNotices(
      {
        ...patchBooking(s, id, { status: "leased", lease: { signedAt: now, startDate: opts.startDate, months: opts.months, rent: unit.rent, docId } }),
        unitState: { ...s.unitState, [unit.id]: { status: "rented" } },
      },
      zaloToTenant(b.tenant.phone, {
        bookingId: id,
        unitId: unit.id,
        tone: "success",
        title: "Hợp đồng thuê đã ký số",
        body: `Hợp đồng ${docId} (${opts.months} tháng, từ ${new Date(opts.startDate).toLocaleDateString("vi-VN")}) đã có hiệu lực. Khoản cọc 2.000.000đ được chuyển 100% thành Tiền cọc bảo đảm tài sản. Field Host sẽ hẹn bạn lập Hộ chiếu bàn giao số 10 hạng mục khi nhận nhà.`,
      }),
      zaloToLandlord(unit.landlordId, {
        bookingId: id,
        unitId: unit.id,
        tone: "success",
        title: "Căn hộ đã có người thuê",
        body: `Hợp đồng thuê ${opts.months} tháng căn ${unit.code} (${vnd(unit.rent)}đ/tháng) đã được ký số. Bạn không cần đi lại — Field Host sẽ lo bàn giao và lập Hộ chiếu số.`,
      }),
      toAdmin({ bookingId: id, unitId: unit.id, tone: "success", title: "Hợp đồng thuê đã ký", body: `${unit.code} → rented. Ghi nhận hoa hồng cho ${hostById(b.hostId)?.name}.` }),
    ),
  );
}

// ─── Chủ nhà & Admin ─────────────────────────────────────────────────────────────────────────

export type ConsignInput = Omit<Consignment, "id" | "status" | "createdAt">;

export function submitConsignment(input: ConsignInput, asDraft = false): Consignment {
  const cs: Consignment = { ...input, id: uid("cs"), status: asDraft ? "draft" : "pending", createdAt: iso(Date.now()) };
  setMockState((s) =>
    withNotices(
      { ...s, consignments: [cs, ...s.consignments] },
      ...(asDraft
        ? []
        : [toAdmin({ tone: "info" as const, title: "Yêu cầu ký gửi mới", body: `${cs.building} · Tầng ${cs.floor} · Căn ${cs.door} (${cs.layout}) chờ duyệt.` })]),
    ),
  );
  return cs;
}

/** Ký uỷ quyền độc quyền cho căn đã đăng ký (draft → pending). */
export function signConsignment(id: string) {
  setMockState((s) => {
    const cs = s.consignments.find((c) => c.id === id);
    if (!cs) return s;
    return withNotices(
      { ...s, consignments: s.consignments.map((c) => (c.id === id ? { ...c, status: "pending" as const } : c)) },
      toAdmin({ tone: "info", title: "Yêu cầu ký gửi mới", body: `${cs.building} · Tầng ${cs.floor} · Căn ${cs.door} đã ký ủy quyền, chờ duyệt.` }),
    );
  });
}

export function approveConsignment(id: string) {
  setMockState((s) => {
    const cs = s.consignments.find((c) => c.id === id);
    if (!cs) return s;
    return withNotices(
      { ...s, consignments: s.consignments.map((c) => (c.id === id ? { ...c, status: "approved" as const } : c)) },
      zaloToLandlord(cs.landlordId, {
        tone: "success",
        title: "Yêu cầu ký gửi đã được duyệt",
        body: `Căn ${cs.building} · Tầng ${cs.floor} · Căn ${cs.door} đã được duyệt. Field Host sẽ liên hệ chụp ảnh thẩm định 10 hạng mục trong 48 giờ.`,
      }),
    );
  });
}

export function rejectConsignment(id: string, note: string) {
  setMockState((s) => {
    const cs = s.consignments.find((c) => c.id === id);
    if (!cs) return s;
    return withNotices(
      { ...s, consignments: s.consignments.map((c) => (c.id === id ? { ...c, status: "rejected" as const, note } : c)) },
      zaloToLandlord(cs.landlordId, {
        tone: "warning",
        title: "Yêu cầu ký gửi chưa được duyệt",
        body: `Căn ${cs.building} · Tầng ${cs.floor} · Căn ${cs.door} chưa được duyệt: ${note}.`,
      }),
    );
  });
}

export type ExitResult = { ok: true; effectiveAt: string; hasViewingsToday: boolean } | { ok: false; reason: string };

/** Yêu cầu thoát ủy quyền: báo trước 15 ngày và căn đang trống (PRD AC 4.2.1). */
export function requestMandateExit(unit: Unit): ExitResult {
  const state = getMockState();
  const status = unitStatus(state, unit);
  if (status === "holding")
    return { ok: false, reason: "Căn đang giữ cọc 24h. Bạn có thể gửi lại sau khi hết hạn giữ chỗ hoặc khi hợp đồng thuê chính thức được ký." };
  if (status === "rented")
    return { ok: false, reason: "Căn đang có hợp đồng thuê hiệu lực. Chỉ thoát ủy quyền được khi căn ở trạng thái trống." };
  const now = Date.now();
  const effectiveAt = iso(now + 15 * 86_400_000);
  const todays = hostBookings(state, hostForUnit(unit).id).filter((b) => b.unitId === unit.id && isOpenBooking(b));
  setMockState((s) =>
    withNotices(
      { ...s, mandates: { ...s.mandates, [unit.id]: { ...s.mandates[unit.id], status: "exiting", exitRequestedAt: iso(now), exitEffectiveAt: effectiveAt } } },
      zaloToLandlord(unit.landlordId, {
        unitId: unit.id,
        tone: "warning",
        title: "Đã ghi nhận yêu cầu ngừng ủy quyền",
        body: `Căn ${unit.code} sẽ dừng ủy quyền sau 15 ngày. Trong thời gian này căn vẫn hiển thị để đón nốt khách${todays.length ? `; ${todays.length} lịch xem đã hẹn sẽ được Host hoàn tất trước` : ""}.`,
      }),
      toAdmin({ unitId: unit.id, tone: "warning", title: "Chủ nhà yêu cầu thoát ủy quyền", body: `${unit.code} bắt đầu đếm ngược 15 ngày.` }),
    ),
  );
  return { ok: true, effectiveAt, hasViewingsToday: todays.length > 0 };
}

export function cancelMandateExit(unit: Unit) {
  setMockState((s) => ({
    ...s,
    mandates: { ...s.mandates, [unit.id]: { ...s.mandates[unit.id], status: "active", exitRequestedAt: undefined, exitEffectiveAt: undefined } },
  }));
}

export function updateFee(field: keyof FeeConfig, value: number, by: string) {
  setMockState((s) => {
    const from = s.fees[field];
    if (from === value) return s;
    return {
      ...s,
      fees: { ...s.fees, [field]: value },
      feeAudit: [{ id: uid("fa"), at: iso(Date.now()), by, field, from, to: value }, ...s.feeAudit],
    };
  });
}

// ─── Chat & yêu thích ─────────────────────────────────────────────────────────────────────────

export function chatAppend(message: Omit<ChatMessage, "id" | "at">): string {
  const id = uid("m");
  setMockState((s) => ({ ...s, chat: { ...s.chat, messages: [...s.chat.messages, { ...message, id, at: iso(Date.now()) }] } }));
  return id;
}

export function chatSetSearch(criteria: CriteriaState) {
  setMockState((s) => ({ ...s, chat: { ...s.chat, criteria, searched: true } }));
}

export function chatSetCriteria(criteria: CriteriaState) {
  setMockState((s) => ({ ...s, chat: { ...s.chat, criteria } }));
}

export function chatReset() {
  setMockState((s) => ({ ...s, chat: emptyChat() }));
}

export function countGuestMessage() {
  setMockState((s) => ({ ...s, guestSent: s.guestSent + 1 }));
}

export function toggleFavorite(unitId: string) {
  setMockState((s) => ({
    ...s,
    favorites: s.favorites.includes(unitId) ? s.favorites.filter((f) => f !== unitId) : [...s.favorites, unitId],
  }));
}

export function setTenantProfile(profile: { name: string; phone: string }) {
  setMockState((s) => ({ ...s, tenantProfile: profile }));
}

export { resetMockState as resetDemo };
