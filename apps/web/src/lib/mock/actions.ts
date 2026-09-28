"use client";

import { RATES } from "./cost";
import { fmtTime, dayLabel, normalizePhone, vnd } from "./format";
import { hostBookings, isOpenBooking, similarUnits, slotTaken, unitStatus } from "./selectors";
import { emptyChat } from "./seed";
import { getMockState, setMockState } from "./store";
import type {
  Booking,
  ChatMessage,
  Consignment,
  CriteriaState,
  DeclaredField,
  FeeConfig,
  IdCardData,
  InspectionDraft,
  InspectionReport,
  MockState,
  Notice,
  OtpChallenge,
} from "./types";
import { hostById, hostForUnit, unitById, unitAddress, type Unit, PASSPORT_ITEMS, zoneOfBuilding } from "./units";
import { inspectionSummary } from "./selectors-inspection";
import { contractByKey } from "./contracts";

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

export const INSPECT_SLA_MS = 48 * 3_600_000;

export type ConsignError =
  | "not_found"
  | "bad_status"
  | "wrong_host"
  | "invalid_report"
  | "invalid_note"
  | "unknown_building";

export type ConsignResult =
  | { ok: true }
  | { ok: false; code: ConsignError; reason: string };

export type ConsignInput = Omit<Consignment, "id" | "status" | "createdAt">;

export function submitConsignment(input: ConsignInput, asDraft = false): Consignment {
  const zone = zoneOfBuilding(input.building);
  if (!asDraft && !zone) {
    throw new Error("Tòa nhà không thuộc phân khu hỗ trợ.");
  }

  const nowMs = Date.now();
  const csId = uid("cs");
  const hostId = zone?.hostId;
  const signedAt = asDraft ? undefined : iso(nowMs);
  const inspectDueAt = asDraft ? undefined : iso(nowMs + INSPECT_SLA_MS);

  const cs: Consignment = {
    ...input,
    id: csId,
    status: asDraft ? "draft" : "awaiting_host",
    createdAt: iso(nowMs),
    signedAt,
    hostId,
    inspectDueAt,
  };

  const extraNotices: Notice[] = [];
  if (!asDraft && hostId) {
    const hostName = hostById(hostId)?.name ?? hostId;
    const can = `${cs.building} · Tầng ${cs.floor} · Căn ${cs.door}`;
    extraNotices.push(
      zaloToLandlord(cs.landlordId, {
        tone: "info",
        title: "Đã gửi yêu cầu thẩm định",
        body: `${can} đã chuyển Field Host ${hostName}; kiểm tra thực tế trong 48 giờ, chi phí 0đ.`,
      }),
      pushToHost(hostId, {
        tone: "info",
        title: "Ticket thẩm định ký gửi mới",
        body: `${can} (${cs.layout}, ${cs.areaM2} m²), hạn 48h.`,
      }),
      toAdmin({
        tone: "info",
        title: "Yêu cầu ký gửi mới",
        body: `${can} giao ${hostName}.`,
      }),
    );
  }

  setMockState((s) =>
    withNotices(
      { ...s, consignments: [cs, ...s.consignments] },
      ...extraNotices,
    ),
  );

  return cs;
}

/** Ký uỷ quyền độc quyền cho căn đã đăng ký (draft → awaiting_host). */
export function signConsignment(id: string): ConsignResult {
  const state = getMockState();
  const cs = state.consignments.find((c) => c.id === id);
  if (!cs) {
    return { ok: false, code: "not_found", reason: "Không tìm thấy hồ sơ ký gửi." };
  }
  if (cs.status !== "draft") {
    return { ok: false, code: "bad_status", reason: "Hồ sơ không ở trạng thái nháp để ký ủy quyền." };
  }
  const zone = zoneOfBuilding(cs.building);
  if (!zone) {
    return { ok: false, code: "unknown_building", reason: "Tòa nhà không thuộc phân khu hỗ trợ." };
  }

  const nowMs = Date.now();
  const signedAt = iso(nowMs);
  const inspectDueAt = iso(nowMs + INSPECT_SLA_MS);
  const hostId = zone.hostId;
  const hostName = hostById(hostId)?.name ?? hostId;
  const can = `${cs.building} · Tầng ${cs.floor} · Căn ${cs.door}`;

  setMockState((s) =>
    withNotices(
      {
        ...s,
        consignments: s.consignments.map((c) =>
          c.id === id
            ? { ...c, status: "awaiting_host", signedAt, hostId, inspectDueAt }
            : c,
        ),
      },
      zaloToLandlord(cs.landlordId, {
        tone: "info",
        title: "Đã gửi yêu cầu thẩm định",
        body: `${can} đã chuyển Field Host ${hostName}; kiểm tra thực tế trong 48 giờ, chi phí 0đ.`,
      }),
      pushToHost(hostId, {
        tone: "info",
        title: "Ticket thẩm định ký gửi mới",
        body: `${can} (${cs.layout}, ${cs.areaM2} m²), hạn 48h.`,
      }),
      toAdmin({
        tone: "info",
        title: "Yêu cầu ký gửi mới",
        body: `${can} giao ${hostName}.`,
      }),
    ),
  );

  return { ok: true };
}

export function hostAcceptInspection(id: string, hostId: string): ConsignResult {
  const state = getMockState();
  const cs = state.consignments.find((c) => c.id === id);
  if (!cs) {
    return { ok: false, code: "not_found", reason: "Không tìm thấy hồ sơ ký gửi." };
  }
  if (cs.status !== "awaiting_host") {
    return { ok: false, code: "bad_status", reason: "Hồ sơ không ở trạng thái chờ Field Host nhận." };
  }
  if (cs.hostId !== hostId) {
    return { ok: false, code: "wrong_host", reason: "Bạn không phải Field Host phụ trách căn này." };
  }

  const nowMs = Date.now();
  const hostAcceptedAt = iso(nowMs);
  const hostName = hostById(hostId)?.name ?? hostId;
  const can = `${cs.building} · Tầng ${cs.floor} · Căn ${cs.door}`;

  setMockState((s) =>
    withNotices(
      {
        ...s,
        consignments: s.consignments.map((c) =>
          c.id === id
            ? { ...c, status: "inspecting", hostAcceptedAt }
            : c,
        ),
      },
      zaloToLandlord(cs.landlordId, {
        tone: "info",
        title: "Field Host đã nhận thẩm định",
        body: `${hostName} sẽ kiểm tra ${can}.`,
      }),
      toAdmin({
        tone: "info",
        title: "Host đã nhận thẩm định",
        body: `${hostName} đã nhận thẩm định căn ${can}.`,
      }),
    ),
  );

  return { ok: true };
}

export function submitInspection(id: string, hostId: string, draft: InspectionDraft): ConsignResult {
  const state = getMockState();
  const cs = state.consignments.find((c) => c.id === id);
  if (!cs) {
    return { ok: false, code: "not_found", reason: "Không tìm thấy hồ sơ ký gửi." };
  }
  if (cs.status !== "inspecting") {
    return { ok: false, code: "bad_status", reason: "Hồ sơ không ở trạng thái đang thẩm định thực tế." };
  }
  if (cs.hostId !== hostId) {
    return { ok: false, code: "wrong_host", reason: "Bạn không phải Field Host phụ trách căn này." };
  }

  // 1. declared thiếu/trùng field hoặc ok=false mà actual rỗng
  const REQUIRED_DECLARED: DeclaredField[] = ["identity", "layout", "areaM2", "furnishing", "lock"];
  if (draft.declared.length !== REQUIRED_DECLARED.length) {
    return { ok: false, code: "invalid_report", reason: "Thông tin đối chiếu kê khai phải đủ 5 mục." };
  }
  const seenFields = new Set<DeclaredField>();
  for (const d of draft.declared) {
    if (!REQUIRED_DECLARED.includes(d.field) || seenFields.has(d.field)) {
      return { ok: false, code: "invalid_report", reason: "Thông tin đối chiếu bị trùng lặp hoặc không hợp lệ." };
    }
    seenFields.add(d.field);
    if (!d.ok && (!d.actual || !d.actual.trim())) {
      return { ok: false, code: "invalid_report", reason: "Vui lòng nhập giá trị thực tế cho thông tin sai lệch." };
    }
  }

  // 2. items không khớp tập + thứ tự Consignment.items
  if (
    draft.items.length !== cs.items.length ||
    !draft.items.every((it, idx) => it.key === cs.items[idx])
  ) {
    return { ok: false, code: "invalid_report", reason: "Danh sách đồ dùng không khớp với thông tin đã kê khai." };
  }

  // 3. equipment.length !== 10 hoặc sai thứ tự PASSPORT_ITEMS, condition không phải bội 10 trong [0,100], photoAt rỗng
  if (
    draft.equipment.length !== 10 ||
    !draft.equipment.every((eq, idx) => eq.item === PASSPORT_ITEMS[idx])
  ) {
    return { ok: false, code: "invalid_report", reason: "Báo cáo phải đủ 10 hạng mục theo chuẩn Hộ chiếu số." };
  }
  for (const eq of draft.equipment) {
    if (
      typeof eq.condition !== "number" ||
      eq.condition < 0 ||
      eq.condition > 100 ||
      eq.condition % 10 !== 0
    ) {
      return { ok: false, code: "invalid_report", reason: "Độ mới mỗi hạng mục phải là bội số của 10 (0% - 100%)." };
    }
    if (!eq.photoAt || !eq.photoAt.trim()) {
      return { ok: false, code: "invalid_report", reason: "Tất cả 10 hạng mục bắt buộc phải chụp ảnh xác thực." };
    }
  }

  // 4. recommendation === "reject" mà note rỗng
  if (draft.recommendation === "reject" && (!draft.note || !draft.note.trim())) {
    return { ok: false, code: "invalid_report", reason: "Vui lòng nhập lý do ghi chú khi đề xuất không duyệt." };
  }

  const nowMs = Date.now();
  const submittedAt = iso(nowMs);
  const report: InspectionReport = {
    ...draft,
    hostId,
    submittedAt,
  };

  const summary = inspectionSummary(report);
  const can = `${cs.building} · Tầng ${cs.floor} · Căn ${cs.door}`;

  setMockState((s) =>
    withNotices(
      {
        ...s,
        consignments: s.consignments.map((c) =>
          c.id === id
            ? { ...c, status: "reviewing", report }
            : c,
        ),
      },
      zaloToLandlord(cs.landlordId, {
        tone: "info",
        title: "Đã thẩm định xong, chờ duyệt",
        body: `Căn ${can} đã được thẩm định xong, độ mới TB ${summary.avgCondition}%. Đang chờ Admin chốt duyệt ký gửi.`,
      }),
      toAdmin({
        tone: "warning",
        title: "Báo cáo thẩm định chờ duyệt",
        body: `${can}, TB ${summary.avgCondition}%, ${summary.mismatches.length} sai lệch, đề xuất ${draft.recommendation === "approve" ? "Duyệt" : "Không duyệt"}.`,
      }),
    ),
  );

  return { ok: true };
}

export function approveConsignment(id: string, by: string): ConsignResult {
  const state = getMockState();
  const cs = state.consignments.find((c) => c.id === id);
  if (!cs) {
    return { ok: false, code: "not_found", reason: "Không tìm thấy hồ sơ ký gửi." };
  }
  if (cs.status !== "reviewing") {
    return { ok: false, code: "bad_status", reason: "Chỉ duyệt được hồ sơ đã có báo cáo thẩm định." };
  }

  const nowMs = Date.now();
  const decidedAt = iso(nowMs);
  const can = `${cs.building} · Tầng ${cs.floor} · Căn ${cs.door}`;

  const notices: Notice[] = [
    zaloToLandlord(cs.landlordId, {
      tone: "success",
      title: "Căn đã được nhận ký gửi",
      body: `Căn ${can} đã được Admin ${by} duyệt nhận ký gửi chính thức.`,
    }),
  ];

  if (cs.hostId) {
    notices.push(
      pushToHost(cs.hostId, {
        tone: "success",
        title: "Admin đã duyệt căn bạn thẩm định",
        body: `Căn ${can} đã được Admin ${by} phê duyệt tiếp nhận ký gửi.`,
      }),
    );
  }

  setMockState((s) =>
    withNotices(
      {
        ...s,
        consignments: s.consignments.map((c) =>
          c.id === id
            ? { ...c, status: "approved", decidedAt, decidedBy: by }
            : c,
        ),
      },
      ...notices,
    ),
  );

  return { ok: true };
}

export function rejectConsignment(id: string, note: string, by: string): ConsignResult {
  if (!note || note.trim().length < 5) {
    return { ok: false, code: "invalid_note", reason: "Lý do từ chối phải có ít nhất 5 ký tự." };
  }

  const state = getMockState();
  const cs = state.consignments.find((c) => c.id === id);
  if (!cs) {
    return { ok: false, code: "not_found", reason: "Không tìm thấy hồ sơ ký gửi." };
  }

  const allowedStatuses = new Set(["awaiting_host", "inspecting", "reviewing"]);
  if (!allowedStatuses.has(cs.status)) {
    return { ok: false, code: "bad_status", reason: "Không thể từ chối hồ sơ ở trạng thái hiện tại." };
  }

  const nowMs = Date.now();
  const decidedAt = iso(nowMs);
  const cleanNote = note.trim();
  const can = `${cs.building} · Tầng ${cs.floor} · Căn ${cs.door}`;

  const notices: Notice[] = [
    zaloToLandlord(cs.landlordId, {
      tone: "warning",
      title: "Yêu cầu ký gửi không được duyệt",
      body: `Hồ sơ căn ${can} không được duyệt. Lý do: ${cleanNote}.`,
    }),
  ];

  if (cs.hostId && cs.status !== "awaiting_host") {
    notices.push(
      pushToHost(cs.hostId, {
        tone: "info",
        title: "Hồ sơ đã bị từ chối",
        body: `Hồ sơ căn ${can} đã bị từ chối: ${cleanNote}.`,
      }),
    );
  }

  setMockState((s) =>
    withNotices(
      {
        ...s,
        consignments: s.consignments.map((c) =>
          c.id === id
            ? { ...c, status: "rejected", note: cleanNote, decidedAt, decidedBy: by }
            : c,
        ),
      },
      ...notices,
    ),
  );

  return { ok: true };
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

// ─── Hợp đồng & Quản trị (Admin Contracts) ──────────────────────────────────────────────────

export type ContractError = "not_found" | "bad_status" | "too_early" | "blocked";
export type ContractResult = { ok: true } | { ok: false; code: ContractError; reason: string };

/**
 * Hoàn tất quy trình thoát uỷ quyền độc quyền khi đã hết thời hạn 15 ngày báo trước.
 * Offboard căn hộ khỏi mạng lưới, gửi thông báo cho Chủ nhà, Host phân khu và Admin.
 */
export function completeMandateExit(unitId: string, by: string): ContractResult {
  const state = getMockState();
  const unit = unitById(unitId);
  const m = state.mandates[unitId];

  // 1. Kiểm tra tồn tại
  if (!unit || !m) {
    return { ok: false, code: "not_found", reason: "Không tìm thấy uỷ quyền của căn hộ." };
  }

  // 2. Trạng thái phải là exiting
  if (m.status !== "exiting") {
    return { ok: false, code: "bad_status", reason: "Căn không ở trạng thái đang thoát uỷ quyền." };
  }

  // 3. Phải qua mốc exitEffectiveAt
  const effectiveMs = m.exitEffectiveAt ? Date.parse(m.exitEffectiveAt) : 0;
  const now = Date.now();
  if (now < effectiveMs) {
    const daysLeft = Math.max(1, Math.ceil((effectiveMs - now) / (24 * 3600 * 1000)));
    return { ok: false, code: "too_early", reason: `Chưa hết 15 ngày báo trước — còn ${daysLeft} ngày.` };
  }

  // 4. Ưu tiên khách cọc (nếu căn đang holding hoặc rented thì chặn offboard)
  const uStatus = unitStatus(state, unit);
  if (uStatus === "holding" || uStatus === "rented") {
    return {
      ok: false,
      code: "blocked",
      reason: "Căn đã có khách cọc trong thời gian đếm ngược — quyền ưu tiên thuộc khách cọc.",
    };
  }

  // 5. Cập nhật trạng thái ended và bắn thông báo
  const host = hostForUnit(unit);
  setMockState((s) =>
    withNotices(
      {
        ...s,
        mandates: {
          ...s.mandates,
          [unit.id]: {
            ...m,
            status: "ended",
            endedAt: iso(now),
            endedBy: by,
          },
        },
      },
      zaloToLandlord(unit.landlordId, {
        unitId: unit.id,
        tone: "info",
        title: "Đã hoàn tất thoát uỷ quyền",
        body: `Căn ${unit.code} ngừng hiển thị trên VinStay AI, mã cửa đã gỡ khỏi mạng lưới Host, nhận lại chìa cơ tại văn phòng phân khu.`,
      }),
      pushToHost(host.id, {
        unitId: unit.id,
        tone: "info",
        title: "Căn hộ đã hoàn tất offboard",
        body: `Căn ${unit.code} đã offboard — không dẫn khách, mã cửa đã gỡ.`,
      }),
      toAdmin({
        unitId: unit.id,
        tone: "info",
        title: "Hoàn tất thoát uỷ quyền",
        body: `${unit.code} offboard bởi ${by}.`,
      }),
    ),
  );

  return { ok: true };
}

/**
 * Admin gửi thông báo nhắc gia hạn HĐ thuê khi thời hạn thuê còn ≤ 30 ngày.
 * Gửi đồng thời Zalo cho Chủ nhà, Khách thuê và lưu nhật ký Admin.
 */
export function remindLeaseRenewal(bookingId: string, by: string): ContractResult {
  const state = getMockState();
  const b = state.bookings.find((bk) => bk.id === bookingId);
  if (!b || !b.lease) {
    return { ok: false, code: "not_found", reason: "Không tìm thấy hợp đồng thuê." };
  }

  const now = Date.now();
  const row = contractByKey(state, `lease.${bookingId}`, now);
  if (!row || row.status !== "expiring" || b.lease.renewalRemindedAt) {
    return { ok: false, code: "bad_status", reason: "HĐ chưa vào 30 ngày cuối hoặc đã được nhắc." };
  }

  const endFormatted = row.endAt ? new Date(row.endAt).toLocaleDateString("vi-VN") : "";
  const lease = b.lease;

  setMockState((s) =>
    withNotices(
      patchBooking(s, bookingId, {
        lease: {
          ...lease,
          renewalRemindedAt: iso(now),
        },
      }),
      zaloToLandlord(row.landlordId ?? "", {
        unitId: b.unitId,
        bookingId: b.id,
        tone: "warning",
        title: "HĐ thuê sắp hết hạn",
        body: `HĐ ${lease.docId} hết hạn ngày ${endFormatted}. Vui lòng xác nhận gia hạn hay mở đón khách mới sớm.`,
      }),
      zaloToTenant(b.tenant.phone, {
        unitId: b.unitId,
        bookingId: b.id,
        tone: "warning",
        title: "HĐ thuê sắp hết hạn",
        body: `HĐ ${lease.docId} hết hạn ngày ${endFormatted}. Vui lòng xác nhận gia hạn hay trả phòng (nhắc chuẩn bị Hộ chiếu bàn giao và chốt số công tơ điện nước khi trả).`,
      }),
      toAdmin({
        unitId: b.unitId,
        bookingId: b.id,
        tone: "info",
        title: "Đã gửi nhắc gia hạn",
        body: `Đã nhắc gia hạn ${lease.docId} (${by}).`,
      }),
    ),
  );

  return { ok: true };
}
