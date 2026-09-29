import { PASSPORT_ITEMS, type PassportItem } from "./units";
import type { InventoryGroup, InventoryLine, Liability } from "./types";

export interface CatalogItem {
  code: string;
  group: InventoryGroup;
  name: string;
  passport: PassportItem;
  liability: Liability;
  specHint: string;
  checkHint: string;
}

export const MAX_EXTRA_LINES = 10;

export const INVENTORY_GROUP_LABEL: Record<InventoryGroup, string> = {
  I: "Khu vực Phòng khách & Sinh hoạt chung",
  II: "Khu vực Bếp & Bàn ăn",
  III: "Khu vực Phòng ngủ",
  IV: "Khu vực Phòng tắm & Vệ sinh (WC)",
  V: "Khu vực Ban công / Logia & Giặt phơi",
  VI: "Hệ thống Điều hòa không khí",
  VII: "Kết cấu hoàn thiện & Chiếu sáng",
  VIII: "Khóa, Thẻ từ & Điều khiển",
};

/**
 * 32 hạng mục trang thiết bị nội thất theo Điều 5 Hợp đồng thuê căn hộ chính thức
 * (legal/06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md Điều 5 khoản 2).
 */
export const INVENTORY_CATALOG: ReadonlyArray<CatalogItem> = [
  // I. Phòng khách & sinh hoạt chung
  {
    code: "1",
    group: "I",
    name: "Bộ ghế Sofa",
    passport: "Sofa & bàn ghế",
    liability: "misuse",
    specHint: "Nhãn hiệu / Chất liệu da hoặc vải nỉ",
    checkHint: "Mới / Đã qua sử dụng (Ảnh chi tiết góc đệm, tay vịn)",
  },
  {
    code: "2",
    group: "I",
    name: "Bàn trà phòng khách",
    passport: "Sofa & bàn ghế",
    liability: "misuse",
    specHint: "Mặt kính / Mặt đá / Gỗ",
    checkHint: "Mặt bàn nguyên vẹn, không nứt vỡ, trầy xước",
  },
  {
    code: "3",
    group: "I",
    name: "Kệ Tivi phòng khách",
    passport: "Sofa & bàn ghế",
    liability: "misuse",
    specHint: "Gỗ công nghiệp / Gỗ tự nhiên",
    checkHint: "Cánh tủ khít, ray trượt êm, bề mặt không bong tróc",
  },
  {
    code: "4",
    group: "I",
    name: "Tivi thông minh & Smart Box",
    passport: "Cửa, khoá & công tơ",
    liability: "misuse",
    specHint: "Hãng, kích thước inch, Mã Serial",
    checkHint: "Màn hình sáng nét, không kẻ sọc, có kết nối Wifi",
  },
  {
    code: "5",
    group: "I",
    name: "Rèm cửa phòng khách",
    passport: "Tường & sơn",
    liability: "wear_or_misuse",
    specHint: "Rèm 2 lớp / Rèm cuốn / Rèm lá",
    checkHint: "Kéo êm, thanh ray chắc chắn, vải sạch không rách",
  },

  // II. Bếp & bàn ăn
  {
    code: "6",
    group: "II",
    name: "Bếp từ / Bếp hồng ngoại",
    passport: "Bếp & hút mùi",
    liability: "misuse",
    specHint: "Hãng, Model bếp, Số vùng nấu",
    checkHint: "Mặt kính nguyên vẹn; nhận nồi sau 15s; phím cảm ứng nhạy",
  },
  {
    code: "7",
    group: "II",
    name: "Máy hút mùi nhà bếp",
    passport: "Bếp & hút mùi",
    liability: "misuse",
    specHint: "Hãng, Model hút mùi",
    checkHint: "Hoạt động tốt các cấp quạt hút; đèn chiếu sáng sáng; lưới sạch",
  },
  {
    code: "8",
    group: "II",
    name: "Tủ lạnh",
    passport: "Tủ lạnh",
    liability: "misuse",
    specHint: "Hãng, Dung tích Lít, Mã Serial",
    checkHint: "Ngăn đá đông đá tốt, ngăn mát lạnh sâu, khay kệ đủ không nứt",
  },
  {
    code: "9",
    group: "II",
    name: "Hệ thống tủ bếp trên & dưới",
    passport: "Bếp & hút mùi",
    liability: "misuse",
    specHint: "Chất liệu gỗ MDF lõi xanh / Phủ Melamine, Acrylic",
    checkHint: "Cánh tủ đóng mở êm, đáy tủ khô ráo không ngấm nước rò rỉ",
  },
  {
    code: "10",
    group: "II",
    name: "Mặt đá & Kính ốp bếp",
    passport: "Bếp & hút mùi",
    liability: "misuse",
    specHint: "Đá nhân tạo / Đá tự nhiên / Kính cường lực",
    checkHint: "Không nứt nẻ, bề mặt sạch dầu mỡ, keo silicon kín mép",
  },
  {
    code: "11",
    group: "II",
    name: "Chậu rửa bát & Vòi rửa",
    passport: "Thiết bị vệ sinh",
    liability: "misuse",
    specHint: "Inox 304 / Đá granite",
    checkHint: "Vòi quay nhẹ không rỉ nước; xi-phông thoát nhanh, đáy khô",
  },
  {
    code: "12",
    group: "II",
    name: "Bộ bàn ghế ăn",
    passport: "Sofa & bàn ghế",
    liability: "misuse",
    specHint: "Bàn ăn ... ghế, vật liệu",
    checkHint: "Mặt bàn phẳng đẹp; ghế chắc chắn, đệm ghế sạch sẽ",
  },

  // III. Phòng ngủ
  {
    code: "13",
    group: "III",
    name: "Giường ngủ & Táp đầu giường",
    passport: "Giường & nệm",
    liability: "misuse",
    specHint: "Kích thước m2, chất liệu gỗ",
    checkHint: "Khung giường chắc chắn, giát giường phẳng, không có tiếng kêu",
  },
  {
    code: "14",
    group: "III",
    name: "Đệm nệm & Tấm bảo vệ đệm",
    passport: "Giường & nệm",
    liability: "misuse",
    specHint: "Hãng, độ dày cm, loại đệm cao su/lò xo/bông ép",
    checkHint: "Đệm phẳng phiu, đàn hồi tốt; ga và nệm sạch 100%, không ố vàng",
  },
  {
    code: "15",
    group: "III",
    name: "Tủ quần áo",
    passport: "Giường & nệm",
    liability: "misuse",
    specHint: "Tủ ... cánh mở / Cánh lùa, chất liệu",
    checkHint: "Cánh kéo trượt nhẹ, bản lề chắc, suốt treo quần áo thẳng",
  },
  {
    code: "16",
    group: "III",
    name: "Rèm chắn sáng phòng ngủ",
    passport: "Tường & sơn",
    liability: "wear_or_misuse",
    specHint: "Rèm vải cản sáng 100% / Rèm cầu vồng",
    checkHint: "Cơ cấu kéo trơn tru, vải rèm lành lặn",
  },

  // IV. Phòng tắm & vệ sinh (WC)
  {
    code: "17",
    group: "IV",
    name: "Bình nước nóng lạnh",
    passport: "Bình nóng lạnh",
    liability: "misuse",
    specHint: "Hãng, Dung tích Lít, Rơ-le ELCB",
    checkHint: "Nước nóng đạt chuẩn sau 10 phút; ELCB ngắt an toàn; không rò nước",
  },
  {
    code: "18",
    group: "IV",
    name: "Bồn cầu & Vòi xịt vệ sinh",
    passport: "Thiết bị vệ sinh",
    liability: "misuse",
    specHint: "Hãng sứ vệ sinh, nắp rơi êm",
    checkHint: "Men sứ sáng không nứt; xả nước mạnh không rỉ ngầm van phao; dây xịt mềm",
  },
  {
    code: "19",
    group: "IV",
    name: "Chậu Lavabo & Vòi rửa mặt",
    passport: "Thiết bị vệ sinh",
    liability: "misuse",
    specHint: "Hãng thiết bị vệ sinh",
    checkHint: "Men sứ nguyên vẹn; vòi cấp nước áp lực tốt; xi-phông thoát thông suốt",
  },
  {
    code: "20",
    group: "IV",
    name: "Vách kính tắm đứng & Bộ sen cây",
    passport: "Thiết bị vệ sinh",
    liability: "misuse",
    specHint: "Kính cường lực, Bộ sen tắm inox",
    checkHint: "Kính trong suốt không xước/mẻ mép; cánh đóng êm; sen cây phun đều",
  },

  // V. Ban công / logia & giặt phơi
  {
    code: "21",
    group: "V",
    name: "Máy giặt / Máy sấy quần áo",
    passport: "Thiết bị vệ sinh",
    liability: "misuse",
    specHint: "Hãng, Khối lượng giặt kg, Mã Serial",
    checkHint: "Giặt vắt êm, không rung giật lắc mạnh; ống cấp và thoát nước thông suốt",
  },
  {
    code: "22",
    group: "V",
    name: "Giàn phơi thông minh",
    passport: "Thiết bị vệ sinh",
    liability: "wear_or_misuse",
    specHint: "Giàn phơi gắn trần tay quay / Điện tử",
    checkHint: "Cáp tời trơn, thanh phơi nâng hạ nhẹ nhàng, đủ móc treo",
  },

  // VI. Điều hòa
  {
    code: "23",
    group: "VI",
    name: "Điều hòa không khí Phòng khách",
    passport: "Điều hòa",
    liability: "wear_or_misuse",
    specHint: "Hãng, Công suất BTU, Inverter",
    checkHint: "Phả hơi lạnh ổn định sau 5 phút bật; không kêu rè; không chảy nước máng",
  },
  {
    code: "24",
    group: "VI",
    name: "Điều hòa không khí Phòng ngủ",
    passport: "Điều hòa",
    liability: "wear_or_misuse",
    specHint: "Hãng, Công suất BTU, Inverter",
    checkHint: "Làm lạnh sâu, cánh vẫy tự động tốt; dàn nóng chạy êm",
  },

  // VII. Kết cấu hoàn thiện & chiếu sáng
  {
    code: "25",
    group: "VII",
    name: "Sàn gỗ / Gạch lát nền",
    passport: "Sàn nhà",
    liability: "misuse",
    specHint: "Gỗ công nghiệp dày ...mm / Gạch men",
    checkHint: "Bề mặt phẳng, không bong tróc, không có vết cào sâu hay ngấm nước phồng rộp",
  },
  {
    code: "26",
    group: "VII",
    name: "Nước sơn tường & Trần nhà",
    passport: "Tường & sơn",
    liability: "wear_or_misuse",
    specHint: "Màu sơn, loại sơn",
    checkHint: "Sơn đồng màu, không bong tróc mảng lớn, không bị vẽ bẩn hay đục lỗ trái phép",
  },
  {
    code: "27",
    group: "VII",
    name: "Hệ thống đèn chiếu sáng & Công tắc ổ cắm",
    passport: "Tường & sơn",
    liability: "wear_or_misuse",
    specHint: "Đèn LED âm trần, Hãng công tắc",
    checkHint: "Đèn sáng 100%, mặt hạt công tắc và ổ cắm chắc chắn an toàn",
  },

  // VIII. Khóa, thẻ từ & điều khiển
  {
    code: "28",
    group: "VIII",
    name: "Khóa cửa chính ra vào căn hộ",
    passport: "Cửa, khoá & công tơ",
    liability: "wear_or_misuse",
    specHint: "Khóa điện tử vân tay/mã số hoặc Khóa cơ",
    checkHint: "Đóng mở mượt mà; bàn phím cảm ứng nhạy; chốt khóa an toàn",
  },
  {
    code: "29",
    group: "VIII",
    name: "Thẻ cư dân thang máy",
    passport: "Cửa, khoá & công tơ",
    liability: "misuse",
    specHint: "Mã số in trên từng thẻ cư dân",
    checkHint: "Quẹt thang máy bình thường các tầng được cấp phép",
  },
  {
    code: "30",
    group: "VIII",
    name: "Điều khiển điều hòa nhiệt độ (Remote)",
    passport: "Điều hòa",
    liability: "misuse",
    specHint: "Điều khiển chính hãng theo từng máy",
    checkHint: "Bấm nhạy, màn hình hiển thị số rõ ràng, nắp pin đủ",
  },
  {
    code: "31",
    group: "VIII",
    name: "Điều khiển Tivi (Remote Smart TV)",
    passport: "Cửa, khoá & công tơ",
    liability: "misuse",
    specHint: "Điều khiển thông minh giọng nói",
    checkHint: "Nhận giọng nói tốt, phím bấm êm, không nứt vỏ",
  },
  {
    code: "32",
    group: "VIII",
    name: "Chìa khóa cơ các loại (Cửa chính/phòng)",
    passport: "Cửa, khoá & công tơ",
    liability: "misuse",
    specHint: "Chìa khóa cơ dự phòng",
    checkHint: "Đút vặn ổ nhẹ nhàng",
  },
];

/** Tạo bảng kê 32 dòng catalog trắng (present=false). */
export function blankInventory(): InventoryLine[] {
  return INVENTORY_CATALOG.map((item) => ({
    code: item.code,
    group: item.group,
    name: item.name,
    passport: item.passport,
    present: false,
    liability: item.liability,
    qty: 1,
    spec: "",
    note: "",
  }));
}

/** Tóm tắt 10 hạng mục Hộ chiếu bàn giao số từ danh sách dòng kiểm định. */
export function passportSummary(
  lines: InventoryLine[]
): { item: PassportItem; avg: number | null; count: number }[] {
  return PASSPORT_ITEMS.map((item) => {
    const matching = lines.filter(
      (l) => l.passport === item && l.present && typeof l.condition === "number"
    );
    if (matching.length === 0) {
      return { item, avg: null, count: 0 };
    }
    const sum = matching.reduce((acc, curr) => acc + (curr.condition ?? 0), 0);
    return {
      item,
      avg: Math.round(sum / matching.length),
      count: matching.length,
    };
  });
}
