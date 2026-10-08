export type ZoneId = "sapphire1" | "sapphire2" | "zenpark" | "pavilion" | "masteri";
export type LayoutKind = "Studio" | "1PN" | "2PN" | "3PN";
export type Furnishing = "full" | "basic" | "empty";
export type UnitStatus = "available" | "holding" | "rented";
export type UnitDisplayStatus = UnitStatus | "viewing";
export type LockType = "smart" | "physical";
export type HostRole = "sale" | "inspector";
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
}

/** Các phân khu được hỗ trợ trên danh mục; số căn và tòa luôn lấy từ API. */
export const ZONES: Zone[] = [
  { id: "sapphire1", name: "The Sapphire 1", short: "Sapphire 1" },
  { id: "sapphire2", name: "The Sapphire 2", short: "Sapphire 2" },
  { id: "zenpark", name: "The Zenpark", short: "Zenpark" },
  { id: "pavilion", name: "The Pavilion", short: "Pavilion" },
  { id: "masteri", name: "Masteri Waterfront", short: "Masteri" },
];

export const zoneById = (id?: ZoneId) => (id ? ZONES.find((zone) => zone.id === id) : undefined);

export const zoneOfName = (name?: string) => {
  const normalized = name?.trim().toLocaleLowerCase().replace(/^the\s+/, "");
  return normalized
    ? ZONES.find((zone) => zone.name.toLocaleLowerCase().replace(/^the\s+/, "") === normalized || zone.short.toLocaleLowerCase() === normalized)
    : undefined;
};

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

export interface Unit {
  id: string;
  code: string;
  building: string;
  zoneId?: ZoneId;
  zoneName?: string;
  floor: number;
  door: string;
  layout: LayoutKind;
  layoutLabel: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number;
  managementFee?: number;
  parkingFeeEstimate?: number;
  utilityCostEstimate?: number;
  direction: string;
  view: string;
  furnishing: Furnishing;
  rent: number;
  marketAvg: number;
  baseStatus: UnitStatus;
  lock: LockType;
  landlordId?: string;
  images: number;
  interest24h: number;
  petFriendly: boolean;
  minMonths: number;
  verifiedAt: string;
  items: ItemKey[];
  photos?: string[];
}

export const unitAddress = (unit: Pick<Unit, "building" | "floor" | "door">) =>
  `${unit.building} · Tầng ${unit.floor} · Căn ${unit.door}`;

export const unitPhoto = (unit: Pick<Unit, "id"> & { photos?: string[] }, index: number) =>
  unit.photos?.[index - 1] ?? null;

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

export const HOT_THRESHOLD = 3;
