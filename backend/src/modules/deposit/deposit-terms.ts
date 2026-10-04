import { DepositTermsDoc } from '../tenant/tenant.types';

export const DEPOSIT_TERMS_VERSION = 'HOLD-2026.10-v1';

export const HOUSE_RULES = [
  {
    id: 'no_sublease',
    title: 'Không cho thuê lại',
    body: 'Chỉ dùng để ở cho những người đã đăng ký; cấm cho thuê lại theo ngày/giờ, homestay, Airbnb hay chuyển nhượng quyền thuê.',
    source: 'legal/04 §2.6 · legal/02 Điều 5.1',
  },
  {
    id: 'structure',
    title: 'Giữ nguyên kết cấu',
    body: 'Không khoan đục tường chịu lực, đập tường ngăn, đổi màu sơn hay can thiệp điện âm, ống nước ngầm. Khoan treo đồ nhỏ phải được chủ nhà đồng ý và trám trả nguyên trạng khi trả nhà.',
    source: 'legal/04 §2.5 · legal/02 Điều 5.2',
  },
  {
    id: 'ev_charging',
    title: 'Không sạc xe điện trong căn',
    body: 'Cấm mang xe máy điện, xe đạp điện, pin lithium hay ắc-quy xe điện vào căn để sạc; chỉ sạc tại trạm sạc dưới hầm/nhà xe của khu đô thị.',
    source: 'legal/04 §2.3 · legal/02 Điều 5.3',
  },
  {
    id: 'fire_cooking',
    title: 'An toàn cháy nổ',
    body: 'Cấm bếp than, củi, gas công nghiệp hoặc gas mini; cấm đốt vàng mã trong căn, hành lang, ban công; không thắp hương vòng qua đêm khi vắng nhà; không đấu thêm thiết bị vượt công suất aptomat tổng.',
    source: 'legal/04 §2.3 · legal/02 Điều 5.3',
  },
  {
    id: 'quiet_pets',
    title: 'Giờ yên tĩnh & thú cưng',
    body: 'Giữ yên tĩnh từ 22:00 đến 06:00 (BQL phạt 500.000–2.000.000đ/lần). Chỉ nuôi thú cưng khi căn và phân khu cho phép; ra khu chung phải xích, rọ mõm với chó và dọn vệ sinh ngay.',
    source: 'legal/04 §2.1–2.2',
  },
  {
    id: 'bql_fines',
    title: 'Phạt BQL trừ vào cọc',
    body: 'Mọi khoản phạt BQL do lỗi của bạn được trừ thẳng vào Tiền cọc bảo đảm; bạn nộp bù phần thiếu trong 03 ngày làm việc.',
    source: 'legal/04 §3.2–3.3 · legal/02 Điều 5.4',
  },
] as const;

export function buildDepositTerms(holdHours: number = 48): DepositTermsDoc {
  const clampedHoldHours = Math.min(72, Math.max(12, holdHours));

  return {
    version: DEPOSIT_TERMS_VERSION,
    amount: 2000000,
    holdHours: clampedHoldHours,
    items: [
      {
        id: 'amount',
        text: 'Khoản cọc giữ chỗ 2.000.000 VNĐ chuyển qua mã VietQR động vào tài khoản định danh của nền tảng VinStay AI, nội dung COC <mã căn> <SĐT>; không chuyển cho Field Host hay chủ nhà.',
        source: 'legal/02 Điều 2.1–2.2 · tenant/02 §2.2',
      },
      {
        id: 'hold',
        text: `Căn được khoá trạng thái giữ chỗ ${clampedHoldHours} giờ tính từ lúc hệ thống ghi nhận tiền vào tài khoản; trong thời gian này căn từ chối lịch xem và cọc của khách khác. Thời lượng do Quản trị viên cài cho từng căn (12–72 giờ).`,
        source: 'AGENTS.md Chủ nhà #1 · legal/02 Điều 2.3–2.4',
      },
      {
        id: 'obligation',
        text: `Trong ${clampedHoldHours} giờ, Bên B hoàn tất xác minh danh tính eKYC (CCCD gắn chip) trên ứng dụng để hệ thống lập Hợp đồng thuê.`,
        source: 'legal/02 Điều 3 (rút gọn theo quyết định 2026-10-04)',
      },
      {
        id: 'forfeit',
        text: `Quá ${clampedHoldHours} giờ mà Bên B không hoàn tất, hoặc tự huỷ không do bất khả kháng: Bên B mất khoản cọc theo Điều 328 BLDS 2015; 50% bù chủ nhà, 50% chi phí vận hành nền tảng; căn mở lại.`,
        source: 'legal/02 Điều 6.1',
      },
      {
        id: 'landlord_breach',
        text: 'Chủ nhà đổi giá, đổi hiện trạng hoặc từ chối cho thuê trong thời hạn giữ chỗ: hoàn 100% cọc và phạt cọc bằng 2.000.000 VNĐ (tổng 4.000.000 VNĐ). Bất khả kháng: hoàn 100%, không phạt.',
        source: 'legal/02 Điều 6.2–6.3',
      },
      {
        id: 'convert',
        text: 'Khi lập Hợp đồng thuê, 2.000.000 VNĐ chuyển 100% thành một phần Tiền cọc bảo đảm tài sản & nội thất, giữ suốt kỳ thuê; tuyệt đối không trừ vào tiền thuê tháng đầu.',
        source: 'AGENTS.md · legal/02 Điều 4',
      },
    ],
    houseRules: HOUSE_RULES.map((r) => ({ ...r })),
    consentLabel:
      'Tôi đã đọc và đồng ý điều khoản đặt cọc giữ chỗ và nội quy căn hộ theo Điều 328 Bộ luật Dân sự 2015, và cho phép VinStay AI xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.',
  };
}
