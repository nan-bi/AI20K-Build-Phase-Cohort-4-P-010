/**
 * Danh mục căn hộ mock — Vinhomes Ocean Park 1 (Gia Lâm, Hà Nội).
 * Ảnh lấy từ `tech data/caodata` (đã copy vào public/units); giá/diện tích/mã căn được chuẩn hoá lại cho demo.
 */

export type ZoneId = "sapphire1" | "sapphire2" | "zenpark" | "pavilion" | "masteri";
export type LayoutKind = "Studio" | "1PN" | "2PN" | "3PN";
export type Furnishing = "full" | "basic" | "empty";
export type UnitStatus = "available" | "holding" | "rented";
export type UnitDisplayStatus = UnitStatus | "viewing"; // + chỉ để hiển thị (Đ9)
export type LockType = "smart" | "physical";

export type HostRole = "sale" | "inspector"; // +
export const HOST_ROLE_LABEL: Record<HostRole, string> = { sale: "Sale", inspector: "Thẩm định" }; // +

export type LeaseTermPref = "mid" | "long" | "fixed"; // + Đ10
export const LEASE_TERM_LABEL: Record<LeaseTermPref, string> = {
  mid: "Trung hạn: 1–6 tháng",
  long: "Dài hạn: 12 tháng",
  fixed: "Cố định: 12 tháng",
};
export type ItemKey =
  | "ac"
  | "fridge"
  | "washer"
  | "kitchen"
  | "heater"
  | "bed"
  | "wardrobe"
  | "sofa"
  | "tv"
  | "curtain"
  | "balcony";

export interface Zone {
  id: ZoneId;
  name: string;
  short: string;
  buildings: string[];
  /** Host phụ trách mặc định. */
  hostId: string;
  nearby: { label: string; walk: string }[];
}

export const ZONES: Zone[] = [
  {
    id: "sapphire1",
    name: "The Sapphire 1",
    short: "Sapphire 1",
    buildings: ["S1.01", "S1.03", "S1.09", "S1.10"],
    hostId: "H01",
    nearby: [
      { label: "Biển hồ Ocean Park", walk: "3 phút đi bộ" },
      { label: "Vincom Mega Mall", walk: "6 phút đi bộ" },
      { label: "Trường Vinschool", walk: "8 phút đi bộ" },
      { label: "Đại học VinUni", walk: "12 phút đi bộ" },
    ],
  },
  {
    id: "sapphire2",
    name: "The Sapphire 2",
    short: "Sapphire 2",
    buildings: ["S2.02", "S2.09", "S2.12", "S2.16", "S2.19"],
    hostId: "H01",
    nearby: [
      { label: "Biển hồ Ocean Park", walk: "5 phút đi bộ" },
      { label: "Vincom Mega Mall", walk: "4 phút đi bộ" },
      { label: "Đại học VinUni", walk: "9 phút đi bộ" },
      { label: "Phố đi bộ Malibu", walk: "7 phút đi bộ" },
    ],
  },
  {
    id: "zenpark",
    name: "The Zenpark",
    short: "Zenpark",
    buildings: ["ZR1", "ZR2", "R1.02"],
    hostId: "H03",
    nearby: [
      { label: "Công viên Nhật Bản", walk: "2 phút đi bộ" },
      { label: "Biển hồ Ocean Park", walk: "10 phút đi bộ" },
      { label: "Trạm VinBus", walk: "3 phút đi bộ" },
      { label: "Đại học VinUni", walk: "6 phút đạp xe" },
    ],
  },
  {
    id: "pavilion",
    name: "The Pavilion",
    short: "Pavilion",
    buildings: ["P3", "P4"],
    hostId: "H05",
    nearby: [
      { label: "Biển hồ Ocean Park", walk: "6 phút đi bộ" },
      { label: "Trung tâm thương mại", walk: "8 phút đi bộ" },
      { label: "Bệnh viện Vinmec", walk: "10 phút đạp xe" },
      { label: "Đại học VinUni", walk: "10 phút đạp xe" },
    ],
  },
  {
    id: "masteri",
    name: "Masteri Waterfront",
    short: "Masteri",
    buildings: ["H1", "H2", "M2", "M3"],
    hostId: "H04",
    nearby: [
      { label: "Bến du thuyền", walk: "4 phút đi bộ" },
      { label: "Vincom Mega Mall", walk: "9 phút đi bộ" },
      { label: "Phố đi bộ ven hồ", walk: "2 phút đi bộ" },
      { label: "Đại học VinUni", walk: "8 phút đạp xe" },
    ],
  },
];

export const zoneById = (id: ZoneId) => ZONES.find((z) => z.id === id)!;
export const zoneOfBuilding = (b: string) => ZONES.find((z) => z.buildings.includes(b));

export const LAYOUT_LABEL: Record<LayoutKind, string> = {
  Studio: "Studio",
  "1PN": "1 phòng ngủ",
  "2PN": "2 phòng ngủ",
  "3PN": "3 phòng ngủ",
};

export const FURNISHING_LABEL: Record<Furnishing, string> = {
  full: "Full nội thất",
  basic: "Nội thất cơ bản",
  empty: "Nhà trống",
};

export const ITEM_LABEL: Record<ItemKey, string> = {
  ac: "Điều hòa",
  fridge: "Tủ lạnh",
  washer: "Máy giặt",
  kitchen: "Bếp & hút mùi",
  heater: "Bình nóng lạnh",
  bed: "Giường & nệm",
  wardrobe: "Tủ quần áo",
  sofa: "Sofa",
  tv: "Smart TV",
  curtain: "Rèm cửa",
  balcony: "Ban công",
};

export const ALL_ITEMS = Object.keys(ITEM_LABEL) as ItemKey[];

export interface Unit {
  id: string;
  code: string;
  building: string;
  zoneId: ZoneId;
  floor: number;
  door: string;
  layout: LayoutKind;
  /** Nhãn hiển thị: "1PN+" nếu có phòng làm việc/phòng phụ. */
  layoutLabel: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  direction: string;
  view: string;
  furnishing: Furnishing;
  rent: number;
  marketAvg: number;
  baseStatus: UnitStatus;
  lock: LockType;
  landlordId: string;
  images: number;
  interest24h: number;
  petFriendly: boolean;
  minMonths: number;
  verifiedAt: string;
  title: string;
  description: string;
  items: ItemKey[];
}

interface UnitSeed extends Omit<Unit, "code" | "zoneId" | "layoutLabel" | "verifiedAt" | "door"> {
  door: number;
  plus?: boolean;
  verifiedDay: string;
}

const seeds: UnitSeed[] = [
  {
    id: "s1-03-1512",
    building: "S1.03",
    floor: 15,
    door: 12,
    layout: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 30,
    direction: "Đông Nam",
    view: "View nội khu",
    furnishing: "full",
    rent: 6_000_000,
    marketAvg: 6_600_000,
    baseStatus: "rented",
    lock: "smart",
    landlordId: "L1",
    images: 4,
    interest24h: 0,
    petFriendly: false,
    minMonths: 6,
    verifiedDay: "2026-08-14",
    title: "Studio full đồ, bàn ăn gỗ và bếp rộng",
    description:
      "Studio 30m² sáng sủa, bếp tách riêng có bàn ăn 4 ghế, đầy đủ điều hòa và tủ lạnh. Phù hợp 1–2 người, vào ở ngay.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "curtain", "washer"],
  },
  {
    id: "r1-02-2104",
    building: "R1.02",
    floor: 21,
    door: 4,
    layout: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 33,
    direction: "Tây Nam",
    view: "View công viên",
    furnishing: "full",
    rent: 6_300_000,
    marketAvg: 7_200_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L3",
    images: 4,
    interest24h: 2,
    petFriendly: false,
    minMonths: 6,
    verifiedDay: "2026-09-02",
    title: "Studio tầng cao ban công thoáng, rèm gỗ ấm",
    description:
      "Studio 33m² tầng 21 nhìn ra công viên Nhật Bản, có ban công và tủ lạnh, TV. Giá thấp hơn mặt bằng Zenpark cùng layout.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "tv", "curtain", "balcony"],
  },
  {
    id: "zr1-12-0718",
    building: "ZR1",
    floor: 12,
    door: 18,
    layout: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 32,
    direction: "Đông Bắc",
    view: "View nội khu",
    furnishing: "basic",
    rent: 5_500_000,
    marketAvg: 6_200_000,
    baseStatus: "rented",
    lock: "physical",
    landlordId: "L3",
    images: 4,
    interest24h: 0,
    petFriendly: true,
    minMonths: 6,
    verifiedDay: "2026-08-21",
    title: "Studio nội thất cơ bản, sàn gỗ, cho nuôi thú cưng",
    description:
      "Studio 32m² trang bị điều hòa, bếp và tủ lạnh; phần còn lại khách tự bài trí theo ý. Cho phép nuôi thú cưng nhỏ.",
    items: ["ac", "fridge", "kitchen", "heater", "curtain"],
  },
  {
    id: "s1-01-0806",
    building: "S1.01",
    floor: 8,
    door: 6,
    layout: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 29,
    direction: "Đông Nam",
    view: "View nội khu",
    furnishing: "full",
    rent: 5_900_000,
    marketAvg: 6_800_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L2",
    images: 4,
    interest24h: 1,
    petFriendly: false,
    minMonths: 6,
    verifiedDay: "2026-09-10",
    title: "Studio 29m² giá tốt nhất Sapphire 1",
    description:
      "Studio gọn gàng, bếp gỗ kiểu chữ L, tủ lạnh và điều hòa mới thay. Rẻ hơn mặt bằng toà S1.01 cùng layout.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "curtain"],
  },
  {
    id: "h1-18-1809",
    building: "H1",
    floor: 18,
    door: 9,
    layout: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 35,
    direction: "Đông",
    view: "View phố đi bộ ven hồ",
    furnishing: "full",
    rent: 7_000_000,
    marketAvg: 7_500_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L1",
    images: 5,
    interest24h: 1,
    petFriendly: false,
    minMonths: 6,
    verifiedDay: "2026-09-05",
    title: "Studio Masteri phong cách be ấm, giường đôi lớn",
    description:
      "Studio 35m² tông be nhẹ, giường đôi 1m6, tủ âm tường và bếp đủ dụng cụ. Toà có bể bơi bốn mùa và phòng gym.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "sofa", "curtain"],
  },
  {
    id: "h2-06-0605",
    building: "H2",
    floor: 6,
    door: 5,
    layout: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 34,
    direction: "Tây Bắc",
    view: "View nội khu",
    furnishing: "full",
    rent: 7_200_000,
    marketAvg: 7_600_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L4",
    images: 5,
    interest24h: 0,
    petFriendly: false,
    minMonths: 6,
    verifiedDay: "2026-09-08",
    title: "Studio Masteri H2, sofa và giường sát nhau tiện làm việc",
    description:
      "Studio 34m² nội thất nguyên bộ, bếp có lò nướng âm và tủ lạnh. Toàn bộ chi phí hàng tháng được tách rõ trong bảng All-in Cost.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "sofa", "tv", "curtain"],
  },
  {
    id: "m3-22-2210",
    building: "M3",
    floor: 22,
    door: 10,
    layout: "Studio",
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 33,
    direction: "Nam",
    view: "View hồ",
    furnishing: "full",
    rent: 6_500_000,
    marketAvg: 7_100_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L4",
    images: 5,
    interest24h: 3,
    petFriendly: false,
    minMonths: 6,
    verifiedDay: "2026-09-12",
    title: "Studio tầng 22 view hồ, sofa tròn và đèn trang trí",
    description:
      "Studio 33m² view hồ, ban công có cửa kính, bếp đá và lò nướng. Được nhiều khách xem trong 24 giờ qua.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "sofa", "tv", "curtain", "balcony"],
  },
  {
    id: "s2-12-1608",
    building: "S2.12",
    floor: 16,
    door: 8,
    layout: "1PN",
    plus: true,
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 45,
    direction: "Đông Nam",
    view: "View biển hồ",
    furnishing: "full",
    rent: 7_000_000,
    marketAvg: 8_200_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L1",
    images: 4,
    interest24h: 3,
    petFriendly: false,
    minMonths: 6,
    verifiedDay: "2026-09-15",
    title: "1PN+ view biển hồ, ban công giặt phơi riêng",
    description:
      "Căn 45m² tầng 16 hướng Đông Nam, phòng khách ngập nắng sáng, ban công rộng có máy giặt, giường tầng cho khách ở ghép. Rẻ hơn mặt bằng Sapphire 2 cùng layout.",
    items: ["ac", "fridge", "washer", "kitchen", "heater", "bed", "wardrobe", "sofa", "tv", "curtain", "balcony"],
  },
  {
    id: "s2-02-1004",
    building: "S2.02",
    floor: 10,
    door: 4,
    layout: "1PN",
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 42,
    direction: "Tây Nam",
    view: "View nội khu",
    furnishing: "full",
    rent: 6_500_000,
    marketAvg: 7_000_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L5",
    images: 5,
    interest24h: 1,
    petFriendly: false,
    minMonths: 6,
    verifiedDay: "2026-09-09",
    title: "1 phòng ngủ tầng đẹp, bếp từ bằng gỗ sáng",
    description:
      "Căn 42m² tầng 10, phòng ngủ tách riêng có cửa sổ lớn, bếp từ mới, khu bếp phòng khách thoáng. Phù hợp cặp đôi hoặc người đi làm.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "sofa", "tv", "curtain"],
  },
  {
    id: "m2-15-1503",
    building: "M2",
    floor: 15,
    door: 3,
    layout: "1PN",
    plus: true,
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 46,
    direction: "Đông Bắc",
    view: "View phố đi bộ ven hồ",
    furnishing: "full",
    rent: 8_500_000,
    marketAvg: 9_000_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L4",
    images: 4,
    interest24h: 1,
    petFriendly: false,
    minMonths: 12,
    verifiedDay: "2026-09-04",
    title: "1PN+ Masteri, phòng khách rộng và góc làm việc",
    description:
      "Căn 46m² sàn gỗ, phòng khách liền bếp mở, phòng ngủ có bàn làm việc riêng. Nội thất mới, cư dân toà được dùng bể bơi bốn mùa.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "sofa", "curtain"],
  },
  {
    id: "s1-09-1412",
    building: "S1.09",
    floor: 14,
    door: 12,
    layout: "1PN",
    plus: true,
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 43,
    direction: "Đông Nam",
    view: "View Botanic và hồ",
    furnishing: "full",
    rent: 8_800_000,
    marketAvg: 9_200_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L2",
    images: 5,
    interest24h: 2,
    petFriendly: false,
    minMonths: 12,
    verifiedDay: "2026-09-11",
    title: "1PN+ Đông Nam, nhìn thẳng khu Botanic và phố đi bộ",
    description:
      "Căn 43m² ban công Đông Nam trực diện khu Botanic và phố đi bộ Malibu. Giường đôi, tủ gỗ tự nhiên, bếp nấu đầy đủ.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "curtain", "balcony"],
  },
  {
    id: "s1-10-1917",
    building: "S1.10",
    floor: 19,
    door: 17,
    layout: "1PN",
    plus: true,
    bedrooms: 1,
    bathrooms: 1,
    areaM2: 47,
    direction: "Tây Bắc",
    view: "View nội khu",
    furnishing: "full",
    rent: 7_000_000,
    marketAvg: 8_000_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L2",
    images: 4,
    interest24h: 2,
    petFriendly: true,
    minMonths: 6,
    verifiedDay: "2026-09-13",
    title: "1PN+ có giường tầng cho khách ở ghép, cho nuôi thú cưng",
    description:
      "Căn 47m² sofa da, TV 55 inch, phòng phụ có giường tầng kèm bàn học. Cho phép nuôi thú cưng nhỏ. Rẻ hơn mặt bằng S1.10 cùng layout.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "sofa", "tv", "curtain"],
  },
  {
    id: "s2-02-2109",
    building: "S2.02",
    floor: 21,
    door: 9,
    layout: "2PN",
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 58,
    direction: "Đông Nam",
    view: "View biển hồ",
    furnishing: "full",
    rent: 9_000_000,
    marketAvg: 10_300_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L5",
    images: 5,
    interest24h: 2,
    petFriendly: false,
    minMonths: 6,
    verifiedDay: "2026-09-07",
    title: "2PN2WC tầng 21, giường xanh biển và bếp chữ L",
    description:
      "Căn 58m² hai phòng ngủ hai vệ sinh, bếp chữ L có tủ lạnh lớn, phòng khách nhìn hồ. Rẻ hơn mặt bằng S2.02 cùng layout.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "sofa", "tv", "curtain", "balcony"],
  },
  {
    id: "zr2-09-0912",
    building: "ZR2",
    floor: 9,
    door: 12,
    layout: "2PN",
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 60,
    direction: "Đông Bắc",
    view: "View công viên",
    furnishing: "full",
    rent: 10_000_000,
    marketAvg: 11_000_000,
    baseStatus: "available",
    lock: "physical",
    landlordId: "L1",
    images: 5,
    interest24h: 0,
    petFriendly: false,
    minMonths: 12,
    verifiedDay: "2026-08-30",
    title: "2PN2WC Zenpark, bếp đảo trắng và máy giặt cửa ngang",
    description:
      "Căn 60m² hai phòng ngủ, bếp trắng có tủ lạnh lớn, máy giặt cửa ngang ở lô gia. Chìa khoá cơ do quầy phân khu Zenpark giữ.",
    items: ["ac", "fridge", "washer", "kitchen", "heater", "bed", "wardrobe", "curtain"],
  },
  {
    id: "h1-25-2502",
    building: "H1",
    floor: 25,
    door: 2,
    layout: "2PN",
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 66,
    direction: "Nam",
    view: "View hồ",
    furnishing: "full",
    rent: 13_000_000,
    marketAvg: 13_500_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L4",
    images: 5,
    interest24h: 1,
    petFriendly: false,
    minMonths: 12,
    verifiedDay: "2026-09-01",
    title: "2PN2WC cao cấp, bàn ăn đá và đèn chùm",
    description:
      "Căn 66m² tầng 25 phòng khách liền bàn ăn mặt đá, đèn chùm, TV treo tường, hai phòng ngủ giường đôi. Nội thất mới gần như chưa sử dụng.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "sofa", "tv", "curtain", "balcony"],
  },
  {
    id: "p4-11-1106",
    building: "P4",
    floor: 11,
    door: 6,
    layout: "2PN",
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 62,
    direction: "Tây Nam",
    view: "View nội khu",
    furnishing: "full",
    rent: 11_000_000,
    marketAvg: 11_800_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L3",
    images: 5,
    interest24h: 1,
    petFriendly: false,
    minMonths: 12,
    verifiedDay: "2026-09-06",
    title: "2PN2WC Pavilion, bộ bàn ăn gỗ và tủ bếp lấy sáng",
    description:
      "Căn 62m² tầng 11 có tủ bếp đèn LED, tủ lạnh 4 cánh và Smart TV. Toàn bộ thiết bị đi kèm được kiểm kê trong Hộ chiếu bàn giao số.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "sofa", "tv", "curtain"],
  },
  {
    id: "s2-09-1503",
    building: "S2.09",
    floor: 15,
    door: 3,
    layout: "3PN",
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 75,
    direction: "Đông Nam",
    view: "View nội khu",
    furnishing: "full",
    rent: 10_500_000,
    marketAvg: 11_200_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L5",
    images: 5,
    interest24h: 1,
    petFriendly: false,
    minMonths: 12,
    verifiedDay: "2026-09-03",
    title: "3PN2WC tầng trung, tủ trưng bày và tranh sen",
    description:
      "Căn 75m² ba phòng ngủ, phòng khách sáng với tủ trưng bày gỗ, tủ lạnh 4 cánh. Chủ nhà đồng ý dời bàn thờ sang phòng khác nếu khách không cần.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "tv", "curtain"],
  },
  {
    id: "s2-19-1907",
    building: "S2.19",
    floor: 19,
    door: 7,
    layout: "3PN",
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 78,
    direction: "Đông",
    view: "View biển hồ",
    furnishing: "full",
    rent: 12_000_000,
    marketAvg: 13_000_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L5",
    images: 5,
    interest24h: 1,
    petFriendly: false,
    minMonths: 12,
    verifiedDay: "2026-09-14",
    title: "3PN2WC full đồ, bàn ăn kính và bếp gạch hoa",
    description:
      "Căn 78m² tầng 19 nhìn ra hồ, ba phòng ngủ có giường và tủ, bếp lát gạch hoa, sẵn đàn organ ở phòng khách.",
    items: ["ac", "fridge", "washer", "kitchen", "heater", "bed", "wardrobe", "tv", "curtain", "balcony"],
  },
  {
    id: "m2-20-2001",
    building: "M2",
    floor: 20,
    door: 1,
    layout: "3PN",
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 82,
    direction: "Nam",
    view: "View phố đi bộ ven hồ",
    furnishing: "full",
    rent: 14_000_000,
    marketAvg: 14_500_000,
    baseStatus: "available",
    lock: "smart",
    landlordId: "L4",
    images: 4,
    interest24h: 2,
    petFriendly: false,
    minMonths: 12,
    verifiedDay: "2026-09-16",
    title: "3PN Masteri, phòng khách sofa kem và bếp đảo",
    description:
      "Căn 82m² tầng 20 sofa kem, TV treo, bếp đảo có lò nướng. Toàn bộ nội thất mới, cư dân dùng bể bơi bốn mùa và gym.",
    items: ["ac", "fridge", "washer", "kitchen", "heater", "bed", "wardrobe", "sofa", "tv", "curtain", "balcony"],
  },
  {
    id: "s2-16-2216",
    building: "S2.16",
    floor: 22,
    door: 16,
    layout: "3PN",
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 75,
    direction: "Đông Nam",
    view: "View sân thể thao và hồ",
    furnishing: "full",
    rent: 15_500_000,
    marketAvg: 15_800_000,
    baseStatus: "holding",
    lock: "smart",
    landlordId: "L1",
    images: 5,
    interest24h: 4,
    petFriendly: false,
    minMonths: 12,
    verifiedDay: "2026-09-17",
    title: "3PN2WC full đồ mới tinh, tông xanh mint",
    description:
      "Căn 75m² tầng 22 mới bàn giao nội thất, tông xanh mint, TV treo tường và bếp kính xanh. Ban công nhìn thẳng sân thể thao và hồ về đêm.",
    items: ["ac", "fridge", "kitchen", "heater", "bed", "wardrobe", "sofa", "tv", "curtain", "balcony"],
  },
];

export const UNITS: Unit[] = seeds.map(({ door, plus, verifiedDay, ...u }) => {
  const zone = zoneOfBuilding(u.building)!;
  const doorText = String(door).padStart(2, "0");
  return {
    ...u,
    door: doorText,
    zoneId: zone.id,
    code: `VHOP-${u.building}-${String(u.floor).padStart(2, "0")}${doorText}`,
    layoutLabel: u.layout === "1PN" && plus ? "1PN+" : u.layout,
    verifiedAt: `${verifiedDay}T14:20:00+07:00`,
  };
});

export const unitById = (id: string) => UNITS.find((u) => u.id === id);

export const unitPhoto = (u: Pick<Unit, "id">, n: number) => `/units/${u.id}/${n}.jpg`;

/** "S2.12 · Tầng 16 · Căn 08" — định danh chuẩn [Tòa-Tầng-Căn]. */
export const unitAddress = (u: Pick<Unit, "building" | "floor" | "door">) => `${u.building} · Tầng ${u.floor} · Căn ${u.door}`;

// ─── Người dùng mock ────────────────────────────────────────────────────────────────────────

export interface Landlord {
  id: string;
  name: string;
  phone: string;
  email: string;
  since: string;
}

export const LANDLORDS: Landlord[] = [
  { id: "L1", name: "Nguyễn Văn Hùng", phone: "0903 456 781", email: "hung.nguyen@example.vn", since: "2026-03-12" },
  { id: "L2", name: "Trần Thị Mai", phone: "0912 208 345", email: "mai.tran@example.vn", since: "2026-04-02" },
  { id: "L3", name: "Phạm Quốc Đạt", phone: "0987 121 909", email: "dat.pham@example.vn", since: "2026-05-18" },
  { id: "L4", name: "Lê Thị Hạnh", phone: "0977 634 120", email: "hanh.le@example.vn", since: "2026-06-07" },
  { id: "L5", name: "Vũ Đức Thắng", phone: "0938 771 264", email: "thang.vu@example.vn", since: "2026-06-25" },
];

export const landlordById = (id: string) => LANDLORDS.find((l) => l.id === id);

export type HostStatus = "active" | "busy" | "off_duty";

export interface FieldHost {
  id: string;
  name: string;
  phone: string;
  zones: ZoneId[];
  rfid: string;
  roles: HostRole[];
  status: HostStatus;
  rating: number;
  joined: string;
  /** Số liệu tuần này (mock nền — cộng thêm từ dữ liệu thật trong store). */
  weekTickets: number;
  weekDeals: number;
  avgAcceptSec: number;
  noShowRate: number;
}

export const HOSTS: FieldHost[] = [
  { id: "H01", name: "Lê Quốc Bảo", phone: "0934 556 201", zones: ["sapphire1", "sapphire2"], rfid: "RF-S1S2-0142", roles: ["sale", "inspector"], status: "active", rating: 4.9, joined: "2026-04-15", weekTickets: 21, weekDeals: 4, avgAcceptSec: 74, noShowRate: 0.05 },
  { id: "H02", name: "Nguyễn Thị Lan", phone: "0942 118 730", zones: ["sapphire2"], rfid: "RF-S2-0089", roles: ["sale"], status: "active", rating: 4.8, joined: "2026-05-02", weekTickets: 17, weekDeals: 3, avgAcceptSec: 92, noShowRate: 0.06 },
  { id: "H03", name: "Trần Minh Khoa", phone: "0965 302 418", zones: ["zenpark"], rfid: "RF-ZEN-0031", roles: ["sale", "inspector"], status: "active", rating: 4.7, joined: "2026-05-20", weekTickets: 13, weekDeals: 2, avgAcceptSec: 118, noShowRate: 0.08 },
  { id: "H04", name: "Phạm Hồng Nhung", phone: "0918 774 052", zones: ["masteri"], rfid: "RF-MAS-0117", roles: ["sale", "inspector"], status: "busy", rating: 4.9, joined: "2026-06-01", weekTickets: 19, weekDeals: 5, avgAcceptSec: 66, noShowRate: 0.04 },
  { id: "H05", name: "Đỗ Văn Tùng", phone: "0983 640 559", zones: ["pavilion"], rfid: "RF-PAV-0064", roles: ["sale", "inspector"], status: "busy", rating: 4.5, joined: "2026-06-14", weekTickets: 9, weekDeals: 1, avgAcceptSec: 171, noShowRate: 0.11 },
  { id: "H06", name: "Hoàng Gia Huy", phone: "0902 913 667", zones: ["sapphire1"], rfid: "RF-S1-0203", roles: ["inspector"], status: "off_duty", rating: 4.6, joined: "2026-07-03", weekTickets: 6, weekDeals: 1, avgAcceptSec: 131, noShowRate: 0.09 },
  { id: "H07", name: "Vũ Ngọc Ánh", phone: "0975 226 843", zones: ["masteri"], rfid: "RF-MAS-0158", roles: ["sale"], status: "active", rating: 4.8, joined: "2026-07-19", weekTickets: 15, weekDeals: 3, avgAcceptSec: 85, noShowRate: 0.05 },
  { id: "H08", name: "Bùi Thanh Sơn", phone: "0936 815 290", zones: ["zenpark", "pavilion"], rfid: "RF-ZEN-0212", roles: ["sale"], status: "active", rating: 4.3, joined: "2026-08-08", weekTickets: 8, weekDeals: 0, avgAcceptSec: 204, noShowRate: 0.14 },
];

export const hostById = (id: string) => HOSTS.find((h) => h.id === id);

export const hostForUnit = (u: Pick<Unit, "zoneId">) => hostById(zoneById(u.zoneId).hostId)!;

/** Danh sách 10 hạng mục của Hộ chiếu bàn giao số (PRD §3.6). */
export const PASSPORT_ITEMS = [
  "Tường & sơn",
  "Sàn nhà",
  "Sofa & bàn ghế",
  "Giường & nệm",
  "Điều hòa",
  "Tủ lạnh",
  "Bếp & hút mùi",
  "Bình nóng lạnh",
  "Thiết bị vệ sinh",
  "Cửa, khoá & công tơ",
] as const;

export type PassportItem = (typeof PASSPORT_ITEMS)[number];
