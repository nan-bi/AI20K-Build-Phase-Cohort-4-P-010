export type HouseRuleId = "no_sublease" | "structure" | "ev_charging" | "fire_cooking" | "quiet_pets" | "bql_fines";

export interface HouseRule {
  id: HouseRuleId;
  title: string;
  body: string;
  source: string;
}

export const HOUSE_RULES: readonly HouseRule[] = [
  { id: "no_sublease", title: "Không cho thuê lại", body: "Chỉ dùng để ở cho những người đã đăng ký; cấm cho thuê lại theo ngày/giờ, homestay, Airbnb hay chuyển nhượng quyền thuê.", source: "legal/04 §2.6 · legal/02 Điều 5.1" },
  { id: "structure", title: "Giữ nguyên kết cấu", body: "Không khoan đục tường chịu lực, đập tường ngăn, đổi màu sơn hay can thiệp điện âm, ống nước ngầm. Khoan treo đồ nhỏ phải được chủ nhà đồng ý và trám trả nguyên trạng khi trả nhà.", source: "legal/04 §2.5 · legal/02 Điều 5.2" },
  { id: "ev_charging", title: "Không sạc xe điện trong căn", body: "Cấm mang xe máy điện, xe đạp điện, pin lithium hay ắc-quy xe điện vào căn để sạc; chỉ sạc tại trạm sạc dưới hầm/nhà xe của khu đô thị.", source: "legal/04 §2.3 · legal/02 Điều 5.3" },
  { id: "fire_cooking", title: "An toàn cháy nổ", body: "Cấm bếp than, củi, gas công nghiệp hoặc gas mini; cấm đốt vàng mã trong căn, hành lang, ban công; không thắp hương vòng qua đêm khi vắng nhà; không đấu thêm thiết bị vượt công suất aptomat tổng.", source: "legal/04 §2.3 · legal/02 Điều 5.3" },
  { id: "quiet_pets", title: "Giờ yên tĩnh & thú cưng", body: "Giữ yên tĩnh từ 22:00 đến 06:00 (BQL phạt 500.000–2.000.000đ/lần). Chỉ nuôi thú cưng khi căn và phân khu cho phép; ra khu chung phải xích, rọ mõm với chó và dọn vệ sinh ngay.", source: "legal/04 §2.1–2.2" },
  { id: "bql_fines", title: "Phạt BQL trừ vào cọc", body: "Mọi khoản phạt BQL do lỗi của bạn được trừ thẳng vào Tiền cọc bảo đảm; bạn nộp bù phần thiếu trong 03 ngày làm việc.", source: "legal/04 §3.2–3.3 · legal/02 Điều 5.4" },
];
