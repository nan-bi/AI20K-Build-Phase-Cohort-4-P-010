import { DEFAULT_HOUSEHOLD } from "./cost";
import { upcomingSlots } from "./slots";
import type { Booking, ChatState, Consignment, FeeAudit, FeeConfig, Mandate, MockState, Notice } from "./types";
import { PASSPORT_ITEMS, UNITS } from "./units";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const TENANT_DEMO = { name: "Trần Minh Anh", phone: "0912345678" };

export const DEFAULT_FEES: FeeConfig = {
  baseViewingFee: 50_000,
  dealCommission: 400_000,
  ratingMultiplier: 1.2,
  campaignBonus: 200_000,
};

export const emptyChat = (): ChatState => ({
  messages: [],
  criteria: { layouts: [], zones: [], buildings: [], items: [], household: { ...DEFAULT_HOUSEHOLD } },
  searched: false,
});

export const EMPTY_STATE: MockState = {
  ready: false,
  seededOn: "",
  bookings: [],
  notices: [],
  unitState: {},
  mandates: {},
  consignments: [],
  fees: DEFAULT_FEES,
  feeAudit: [],
  favorites: [],
  otp: null,
  guestSent: 0,
  chat: emptyChat(),
};

export const todayKey = (now: number) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const iso = (ms: number) => new Date(ms).toISOString();

export function seedState(now: number): MockState {
  const slots = upcomingSlots(now, 14);
  const at = (i: number) => slots[i] ?? iso(now + (i + 1) * DAY);

  const t = (name: string, phone: string, persons = 1, note?: string) => ({ name, phone, persons, note });

  const bookings: Booking[] = [
    // Ticket mới đang chờ Host duyệt (SLA 3 phút)
    {
      id: "bk-101", ref: "VS-7K2QA", unitId: "s2-12-1608", hostId: "H01",
      tenant: t("Phạm Thu Trang", "0987654321", 2, "Đi cùng bạn, muốn xem ban công."),
      slot: at(0), status: "pending", createdAt: iso(now - 50_000),
    },
    {
      id: "bk-102", ref: "VS-M4XN8", unitId: "s2-02-1004", hostId: "H01",
      tenant: t("Lê Hoài Nam", "0903111222"),
      slot: at(2), status: "pending", createdAt: iso(now - 20_000),
    },
    // Đã nhận, chờ tới giờ
    {
      id: "bk-103", ref: "VS-4F7K2", unitId: "s2-12-1608", hostId: "H01",
      tenant: t(TENANT_DEMO.name, TENANT_DEMO.phone, 1, "Sinh viên VinUni, dọn vào đầu tháng."),
      slot: at(3), status: "confirmed", createdAt: iso(now - 3 * HOUR), confirmedAt: iso(now - 3 * HOUR + 70_000),
    },
    {
      id: "bk-104", ref: "VS-9WBE3", unitId: "s1-01-0806", hostId: "H01",
      tenant: t("Nguyễn Đức Long", "0903555010"),
      slot: at(5), status: "confirmed", createdAt: iso(now - 5 * HOUR), confirmedAt: iso(now - 5 * HOUR + 95_000),
    },
    {
      id: "bk-105", ref: "VS-H3D6P", unitId: "s2-12-1608", hostId: "H01",
      tenant: t("Vũ Khánh Linh", "0977888123", 2),
      slot: at(8), status: "confirmed", createdAt: iso(now - 6 * HOUR), confirmedAt: iso(now - 6 * HOUR + 60_000),
    },
    {
      id: "bk-106", ref: "VS-C8RT5", unitId: "s2-12-1608", hostId: "H01",
      tenant: t("Đỗ Mai Phương", "0938222777"),
      slot: at(9), status: "confirmed", createdAt: iso(now - 8 * HOUR), confirmedAt: iso(now - 8 * HOUR + 80_000),
    },
    // Khách đã bấm "Tôi đã có mặt tại sảnh"
    {
      id: "bk-107", ref: "VS-Q2LZ9", unitId: "s1-10-1917", hostId: "H01",
      tenant: t("Bùi Anh Tuấn", "0966333444"),
      slot: iso(now - 4 * MIN), status: "lobby", createdAt: iso(now - 20 * HOUR), confirmedAt: iso(now - 20 * HOUR + 100_000),
      reminderSentAt: iso(now - 14 * MIN), lobbyAt: iso(now - 2 * MIN),
    },
    // Đã cọc giữ chỗ 24h, chờ eKYC và ký
    {
      id: "bk-108", ref: "VS-X5NA1", unitId: "s2-16-2216", hostId: "H01",
      tenant: t("Hoàng Thị Yến", "0945121212", 2),
      slot: iso(now - 5 * HOUR), status: "holding", createdAt: iso(now - 30 * HOUR), confirmedAt: iso(now - 30 * HOUR + 65_000),
      lobbyAt: iso(now - 5 * HOUR - 6 * MIN), receivingAt: iso(now - 5 * HOUR + 2 * MIN), viewingAt: iso(now - 5 * HOUR + 7 * MIN),
      doorCode: "482910",
      deposit: {
        amount: 2_000_000, content: "COC VHOP-S2.16-2216 0945121212", qrRef: "VQ-8842-10AF",
        createdAt: iso(now - 4 * HOUR - 30 * MIN), paidAt: iso(now - 4 * HOUR - 24 * MIN),
        expiresAt: iso(now - 4 * HOUR - 24 * MIN + DAY), method: "webhook",
      },
    },
    // Đã ký hợp đồng thuê (căn rented)
    {
      id: "bk-109", ref: "VS-J7PD4", unitId: "s1-03-1512", hostId: "H01",
      tenant: t("Trần Quang Vinh", "0919000777"),
      slot: iso(now - 9 * DAY), status: "leased", createdAt: iso(now - 10 * DAY), confirmedAt: iso(now - 10 * DAY + 60_000),
      lobbyAt: iso(now - 9 * DAY - 5 * MIN), receivingAt: iso(now - 9 * DAY), viewingAt: iso(now - 9 * DAY + 6 * MIN),
      deposit: {
        amount: 2_000_000, content: "COC VHOP-S1.03-1512 0919000777", qrRef: "VQ-7710-33BC",
        createdAt: iso(now - 9 * DAY + 20 * MIN), paidAt: iso(now - 9 * DAY + 22 * MIN),
        expiresAt: iso(now - 8 * DAY + 22 * MIN), method: "webhook",
      },
      agreement: { signedAt: iso(now - 9 * DAY + 45 * MIN), docId: "TT-2026-0418" },
      lease: { signedAt: iso(now - 8 * DAY - 2 * HOUR), startDate: iso(now - 6 * DAY), months: 12, rent: 6_000_000, docId: "HD-2026-0091" },
      rating: 5,
    },
    // Xem xong, khách chưa quyết
    {
      id: "bk-110", ref: "VS-B6KV2", unitId: "s2-19-1907", hostId: "H01",
      tenant: t("Ngô Thanh Hà", "0908444555"),
      slot: iso(now - 1 * DAY - 3 * HOUR), status: "completed", createdAt: iso(now - 2 * DAY), confirmedAt: iso(now - 2 * DAY + 90_000),
      viewingAt: iso(now - 1 * DAY - 3 * HOUR + 8 * MIN), closedReason: "Khách cần bàn với gia đình", rating: 5,
    },
    // No-show
    {
      id: "bk-111", ref: "VS-T9GH7", unitId: "s2-02-2109", hostId: "H01",
      tenant: t("Lưu Đức Kiên", "0972333999"),
      slot: iso(now - 1 * DAY - 6 * HOUR), status: "no_show", createdAt: iso(now - 2 * DAY), confirmedAt: iso(now - 2 * DAY + 80_000),
      closedReason: "Khách không có mặt sau 15 phút, ca trực được giải phóng",
    },
    // Khu vực khác (Host khác) — cho Admin
    {
      id: "bk-112", ref: "VS-E2MC6", unitId: "r1-02-2104", hostId: "H03",
      tenant: t("Đặng Hải Yến", "0961777222"),
      slot: at(1), status: "confirmed", createdAt: iso(now - 4 * HOUR), confirmedAt: iso(now - 4 * HOUR + 130_000),
    },
    {
      id: "bk-113", ref: "VS-U8HS3", unitId: "m3-22-2210", hostId: "H04",
      tenant: t("Phan Quốc Bảo", "0946100200"),
      slot: at(0), status: "pending", createdAt: iso(now - 4 * MIN - 10_000),
    },
    {
      id: "bk-114", ref: "VS-L1YQ8", unitId: "m3-22-2210", hostId: "H04",
      tenant: t("Trịnh Ngọc Mai", "0967545454"),
      slot: at(2), status: "confirmed", createdAt: iso(now - 7 * HOUR), confirmedAt: iso(now - 7 * HOUR + 50_000),
    },
    {
      id: "bk-115", ref: "VS-A4ZR5", unitId: "p4-11-1106", hostId: "H05",
      tenant: t("Lâm Bảo Châu", "0934909090"),
      slot: at(3), status: "confirmed", createdAt: iso(now - 9 * HOUR), confirmedAt: iso(now - 9 * HOUR + 240_000),
    },
    {
      id: "bk-116", ref: "VS-V3NF4", unitId: "zr1-12-0718", hostId: "H03",
      tenant: t("Kiều Minh Quân", "0913707070"),
      slot: iso(now - 12 * DAY), status: "leased", createdAt: iso(now - 13 * DAY), confirmedAt: iso(now - 13 * DAY + 60_000),
      viewingAt: iso(now - 12 * DAY + 5 * MIN),
      deposit: {
        amount: 2_000_000, content: "COC VHOP-ZR1-1218 0913707070", qrRef: "VQ-6403-91DE",
        createdAt: iso(now - 12 * DAY + 20 * MIN), paidAt: iso(now - 12 * DAY + 21 * MIN),
        expiresAt: iso(now - 11 * DAY + 21 * MIN), method: "webhook",
      },
      agreement: { signedAt: iso(now - 12 * DAY + 40 * MIN), docId: "TT-2026-0377" },
      lease: { signedAt: iso(now - 11 * DAY - 4 * HOUR), startDate: iso(now - 10 * DAY), months: 12, rent: 5_500_000, docId: "HD-2026-0074" },
      rating: 5,
    },
    // Hồ sơ 07 WP1: HĐ thuê sắp hết hạn trong ≤ 30 ngày (expiring lease) cho Admin quản lý
    // Chọn căn s1-09-1412 (Sapphire 1, host H01, rent 6.000.000đ) không bị trùng booking nào
    {
      id: "bk-120",
      ref: "VS-9K2LM",
      unitId: "s1-09-1412",
      hostId: "H01",
      tenant: t("Đặng Hoàng Nam", "0901234567"),
      slot: iso(now - 346 * DAY),
      status: "leased",
      createdAt: iso(now - 348 * DAY),
      confirmedAt: iso(now - 348 * DAY + 60_000),
      deposit: {
        amount: 2_000_000,
        content: "COC VHOP-S1.09-1412 0901234567",
        qrRef: "VQ-9921-88AA",
        createdAt: iso(now - 347 * DAY),
        paidAt: iso(now - 347 * DAY + 15 * MIN),
        expiresAt: iso(now - 346 * DAY + 15 * MIN),
        method: "webhook",
      },
      agreement: { signedAt: iso(now - 346 * DAY - 2 * HOUR), docId: "TT-2025-0907" },
      lease: {
        signedAt: iso(now - 346 * DAY),
        startDate: iso(now - 345 * DAY),
        months: 12,
        rent: 6_000_000,
        docId: "HD-2025-0412",
      },
      rating: 5,
    },
  ];

  const zn = (n: Partial<Notice> & Pick<Notice, "audience" | "title" | "body" | "at">): Notice => ({
    id: `nt-seed-${Math.abs(hash(n.title + n.at))}`,
    channel: "zalo",
    ...n,
  });

  const notices: Notice[] = [
    zn({ audience: "landlord", toKey: "L1", at: iso(now - 4 * HOUR - 24 * MIN), unitId: "s2-16-2216", bookingId: "bk-108", tone: "success",
      title: "Nhận cọc giữ chỗ 2.000.000đ",
      body: "Chúc mừng! Căn hộ VHOP-S2.16-2216 vừa nhận cọc giữ chỗ 24h qua VietQR từ khách Hoàng Thị Yến." }),
    zn({ audience: "landlord", toKey: "L1", at: iso(now - 5 * HOUR + 7 * MIN), unitId: "s2-16-2216", bookingId: "bk-108", tone: "info",
      title: "Căn hộ vừa được mở khoá đón khách",
      body: "Căn VHOP-S2.16-2216 được mở khoá lúc " + hm(now - 5 * HOUR + 7 * MIN) + " bởi Field Host Lê Quốc Bảo." }),
    zn({ audience: "landlord", toKey: "L1", at: iso(now - 2 * DAY), unitId: "zr2-09-0912", tone: "warning",
      title: "Đã ghi nhận yêu cầu ngừng ủy quyền",
      body: "Căn VHOP-ZR2-0912 sẽ dừng ủy quyền sau 15 ngày. Trong thời gian này căn vẫn hiển thị để đón nốt khách." }),
    zn({ audience: "landlord", toKey: "L1", at: iso(now - 9 * DAY + 22 * MIN), unitId: "s1-03-1512", bookingId: "bk-109", tone: "success",
      title: "Căn hộ đã có người thuê",
      body: "Hợp đồng thuê 12 tháng căn VHOP-S1.03-1512 đã được ký số. Tiền cọc bảo đảm được giữ theo hợp đồng." }),
    zn({ audience: "host", toKey: "H01", channel: "push", at: iso(now - 50_000), bookingId: "bk-101", unitId: "s2-12-1608", tone: "alert",
      title: "Ticket mới — cần nhận trong 3 phút",
      body: "Phạm Thu Trang · S2.12 Tầng 16 Căn 08 · hẹn " + hm(new Date(slots[0]).getTime()) + "." }),
    zn({ audience: "admin", channel: "system", at: iso(now - 4 * MIN - 10_000), bookingId: "bk-113", unitId: "m3-22-2210", tone: "alert",
      title: "Ticket quá SLA 3 phút",
      body: "Ticket VS-U8HS3 (Masteri Waterfront · M3 Tầng 22) chưa có Host nhận. Đã chuyển Open Pool 500m." }),
    zn({ audience: "admin", channel: "system", at: iso(now - 4 * HOUR - 24 * MIN), bookingId: "bk-108", unitId: "s2-16-2216", tone: "success",
      title: "Cọc 2.000.000đ đã gạch nợ",
      body: "Căn VHOP-S2.16-2216 chuyển sang holding 24h. Các lịch xem còn lại của căn được huỷ tự động." }),
    zn({ audience: "admin", channel: "system", at: iso(now - 2 * DAY), unitId: "zr2-09-0912", tone: "warning",
      title: "Chủ nhà yêu cầu thoát ủy quyền",
      body: "Căn VHOP-ZR2-0912 (Nguyễn Văn Hùng) bắt đầu đếm ngược 15 ngày." }),
    zn({ audience: "host", toKey: "H01", channel: "push", at: iso(now - 6 * HOUR), tone: "info",
      title: "Ticket thẩm định ký gửi mới",
      body: "S1.09 · Tầng 12 · Căn 11 (Studio, 31 m²), hạn 48h." }),
    zn({ audience: "admin", channel: "system", at: iso(now - 6 * HOUR), tone: "info",
      title: "Yêu cầu ký gửi mới",
      body: "S1.09 · Tầng 12 · Căn 11 giao Lê Quốc Bảo." }),
    zn({ audience: "admin", channel: "system", at: iso(now - 4 * HOUR), tone: "warning",
      title: "Báo cáo thẩm định chờ duyệt",
      body: "S2.09 · Tầng 23 · Căn 14, TB 78%, 1 sai lệch, đề xuất Duyệt." }),
    zn({ audience: "host", toKey: "H01", channel: "push", at: iso(now - 3 * DAY), tone: "success",
      title: "Admin đã duyệt căn bạn thẩm định",
      body: "Căn S2.12 · Tầng 16 · Căn 08 đã được phê duyệt ký gửi thành công." }),
  ];

  const mandates: Record<string, Mandate> = {};
  for (const u of UNITS) {
    mandates[u.id] = { unitId: u.id, status: "active", signedAt: iso(now - (20 + (hash(u.id) % 60)) * DAY) };
  }
  mandates["zr2-09-0912"] = {
    unitId: "zr2-09-0912",
    status: "exiting",
    signedAt: iso(now - 70 * DAY),
    exitRequestedAt: iso(now - 3 * DAY),
    exitEffectiveAt: iso(now + 12 * DAY),
  };
  // Hồ sơ 07 WP1: Mandate exit_due (đã quá hạn 15 ngày báo trước) phục vụ kiểm thử action offboard
  // Chọn unit s2-09-1503 vì không vướng booking seed nào và chưa có trong unitState
  mandates["s2-09-1503"] = {
    unitId: "s2-09-1503",
    status: "exiting",
    signedAt: iso(now - 90 * DAY),
    exitRequestedAt: iso(now - 16 * DAY),
    exitEffectiveAt: iso(now - 1 * DAY),
  };

  const consignments: Consignment[] = [
    {
      id: "cs-1",
      landlordId: "L1",
      building: "S2.19",
      floor: 9,
      door: "05",
      layout: "2PN",
      areaM2: 59,
      askRent: 9_500_000,
      furnishing: "full",
      lock: "smart",
      auditByHost: true,
      items: ["ac", "fridge", "kitchen", "bed", "sofa"],
      status: "draft",
      createdAt: iso(now - 1 * DAY),
    },
    {
      id: "cs-2",
      landlordId: "L1",
      building: "S1.09",
      floor: 12,
      door: "11",
      layout: "Studio",
      areaM2: 31,
      askRent: 6_200_000,
      furnishing: "full",
      lock: "physical",
      auditByHost: true,
      items: ["ac", "fridge", "kitchen", "bed"],
      status: "awaiting_host",
      createdAt: iso(now - 7 * HOUR),
      signedAt: iso(now - 6 * HOUR),
      hostId: "H01",
      inspectDueAt: iso(now - 6 * HOUR + 48 * HOUR),
    },
    {
      id: "cs-3",
      landlordId: "L4",
      building: "M3",
      floor: 8,
      door: "02",
      layout: "1PN",
      areaM2: 44,
      askRent: 8_200_000,
      furnishing: "full",
      lock: "smart",
      auditByHost: false,
      items: ["ac", "fridge", "kitchen", "bed", "sofa", "tv"],
      status: "inspecting",
      createdAt: iso(now - 1 * DAY - 2 * HOUR),
      signedAt: iso(now - 1 * DAY),
      hostId: "H04",
      inspectDueAt: iso(now - 1 * DAY + 48 * HOUR),
      hostAcceptedAt: iso(now - 20 * HOUR),
    },
    {
      id: "cs-4",
      landlordId: "L5",
      building: "S2.09",
      floor: 23,
      door: "14",
      layout: "3PN",
      areaM2: 77,
      askRent: 11_800_000,
      furnishing: "basic",
      lock: "smart",
      auditByHost: true,
      items: ["ac", "fridge", "kitchen"],
      status: "reviewing",
      createdAt: iso(now - 2 * DAY),
      signedAt: iso(now - 2 * DAY + 2 * HOUR),
      hostId: "H01",
      inspectDueAt: iso(now - 2 * DAY + 2 * HOUR + 48 * HOUR),
      hostAcceptedAt: iso(now - 1 * DAY - 12 * HOUR),
      report: {
        hostId: "H01",
        submittedAt: iso(now - 4 * HOUR),
        declared: [
          { field: "identity", ok: true },
          { field: "layout", ok: true },
          { field: "areaM2", ok: false, actual: "75 m²" },
          { field: "furnishing", ok: true },
          { field: "lock", ok: true },
        ],
        items: [
          { key: "ac", present: true },
          { key: "fridge", present: true },
          { key: "kitchen", present: true },
        ],
        equipment: [
          { item: PASSPORT_ITEMS[0], condition: 50, photoAt: iso(now - 4 * HOUR - 10 * MIN), note: "Sơn tường hơi ố nhẹ" },
          { item: PASSPORT_ITEMS[1], condition: 50, photoAt: iso(now - 4 * HOUR - 9 * MIN), note: "Sàn gỗ xước nhẹ" },
          { item: PASSPORT_ITEMS[2], condition: 80, photoAt: iso(now - 4 * HOUR - 8 * MIN) },
          { item: PASSPORT_ITEMS[3], condition: 80, photoAt: iso(now - 4 * HOUR - 7 * MIN) },
          { item: PASSPORT_ITEMS[4], condition: 90, photoAt: iso(now - 4 * HOUR - 6 * MIN) },
          { item: PASSPORT_ITEMS[5], condition: 80, photoAt: iso(now - 4 * HOUR - 5 * MIN) },
          { item: PASSPORT_ITEMS[6], condition: 80, photoAt: iso(now - 4 * HOUR - 4 * MIN) },
          { item: PASSPORT_ITEMS[7], condition: 90, photoAt: iso(now - 4 * HOUR - 3 * MIN) },
          { item: PASSPORT_ITEMS[8], condition: 90, photoAt: iso(now - 4 * HOUR - 2 * MIN) },
          { item: PASSPORT_ITEMS[9], condition: 90, photoAt: iso(now - 4 * HOUR - 1 * MIN) },
        ],
        recommendation: "approve",
        note: "Căn hộ nội thất cơ bản còn tốt, sàn và tường dặm vá nhẹ trước khi đón khách.",
      },
    },
    {
      id: "cs-5",
      landlordId: "L1",
      building: "S2.12",
      floor: 16,
      door: "08",
      layout: "2PN",
      areaM2: 64,
      askRent: 9_000_000,
      furnishing: "full",
      lock: "smart",
      auditByHost: true,
      items: ["ac", "fridge", "kitchen", "bed", "sofa"],
      status: "approved",
      createdAt: iso(now - 5 * DAY),
      signedAt: iso(now - 5 * DAY + 1 * HOUR),
      hostId: "H01",
      inspectDueAt: iso(now - 5 * DAY + 1 * HOUR + 48 * HOUR),
      hostAcceptedAt: iso(now - 4 * DAY),
      decidedAt: iso(now - 3 * DAY),
      decidedBy: "Phạm Thu Hà",
      report: {
        hostId: "H01",
        submittedAt: iso(now - 4 * DAY + 3 * HOUR),
        declared: [
          { field: "identity", ok: true },
          { field: "layout", ok: true },
          { field: "areaM2", ok: true },
          { field: "furnishing", ok: true },
          { field: "lock", ok: true },
        ],
        items: [
          { key: "ac", present: true },
          { key: "fridge", present: true },
          { key: "kitchen", present: true },
          { key: "bed", present: true },
          { key: "sofa", present: true },
        ],
        equipment: [
          { item: PASSPORT_ITEMS[0], condition: 90, photoAt: iso(now - 4 * DAY + 2 * HOUR) },
          { item: PASSPORT_ITEMS[1], condition: 90, photoAt: iso(now - 4 * DAY + 2 * HOUR) },
          { item: PASSPORT_ITEMS[2], condition: 80, photoAt: iso(now - 4 * DAY + 2 * HOUR) },
          { item: PASSPORT_ITEMS[3], condition: 90, photoAt: iso(now - 4 * DAY + 2 * HOUR) },
          { item: PASSPORT_ITEMS[4], condition: 90, photoAt: iso(now - 4 * DAY + 2 * HOUR) },
          { item: PASSPORT_ITEMS[5], condition: 90, photoAt: iso(now - 4 * DAY + 2 * HOUR) },
          { item: PASSPORT_ITEMS[6], condition: 80, photoAt: iso(now - 4 * DAY + 2 * HOUR) },
          { item: PASSPORT_ITEMS[7], condition: 90, photoAt: iso(now - 4 * DAY + 2 * HOUR) },
          { item: PASSPORT_ITEMS[8], condition: 90, photoAt: iso(now - 4 * DAY + 2 * HOUR) },
          { item: PASSPORT_ITEMS[9], condition: 90, photoAt: iso(now - 4 * DAY + 2 * HOUR) },
        ],
        recommendation: "approve",
        note: "Căn hộ rất mới, trang thiết bị đồng bộ, sẵn sàng cho thuê ngay.",
      },
    },
  ];

  const feeAudit: FeeAudit[] = [
    { id: "fa-1", at: iso(now - 12 * DAY), by: "Phạm Thu Hà", field: "dealCommission", from: 300_000, to: 400_000 },
    { id: "fa-2", at: iso(now - 12 * DAY), by: "Phạm Thu Hà", field: "campaignBonus", from: 0, to: 200_000 },
    { id: "fa-3", at: iso(now - 30 * DAY), by: "Phạm Thu Hà", field: "baseViewingFee", from: 40_000, to: 50_000 },
  ];

  return {
    ready: true,
    seededOn: todayKey(now),
    bookings,
    notices,
    unitState: {
      "s1-03-1512": { status: "rented" },
      "zr1-12-0718": { status: "rented" },
      "s1-09-1412": { status: "rented" },
      "s2-16-2216": { status: "holding", holdingUntil: iso(now - 4 * HOUR - 24 * MIN + DAY) },
    },
    mandates,
    consignments,
    fees: DEFAULT_FEES,
    feeAudit,
    favorites: [],
    otp: null,
    guestSent: 0,
    chat: emptyChat(),
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function hm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
