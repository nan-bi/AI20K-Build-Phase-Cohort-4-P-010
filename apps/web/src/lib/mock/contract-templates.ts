import type { ContractKind, ContractRow } from "./contracts";

export type TemplateKind = ContractKind;
export type TemplateGroup = "core" | "tenant" | "landlord" | "host" | "admin";
export type TemplateType = "contract" | "variant" | "annex" | "policy" | "sop";
export type TemplateParty = "tenant" | "landlord" | "host" | "platform" | "bank" | "bql" | "handyman";
export type StepActor = "tenant" | "landlord" | "host" | "admin" | "system";

export interface ContractTemplate {
  id: string;              // SPEC-P01 §1 cột Id — duy nhất
  group: TemplateGroup;    // khớp thư mục: core = legal/ gốc
  type: TemplateType;
  title: string;           // tên ngắn tiếng Việt (SPEC-P01 §1)
  summary: string;         // 1 câu ≤ 160 ký tự (SPEC-P01 §1)
  file: string;            // từ ROOT REPO, vd "legal/06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md"
  refCode?: string;        // số/mã văn bản chép NGUYÊN VĂN từ file (SPEC-P01 §3)
  parties: TemplateParty[];
  binds?: TemplateKind;    // chỉ mẫu chính của sổ HĐ
  related?: string[];      // id mẫu cùng chủ đề
}

export interface TemplateStep {
  id: string;              // "S01"…"S18"
  actor: StepActor;
  step: string;            // mô tả bước (SPEC-P01 §2)
  route?: string;          // màn nơi bước xảy ra
  action?: string;         // tên hàm export trong lib/mock/actions.ts; thiếu ⇒ chưa có luồng
  primary?: string;        // id mẫu được KÝ ở bước này
  attached: string[];      // id mẫu đồng ý kèm / áp dụng
  produces?: TemplateKind; // bước làm xuất hiện/đổi HĐ trong sổ
  implemented: boolean;    // === !!action
}

export const TEMPLATE_GROUP_META: Record<TemplateGroup, { label: string }> = {
  core: { label: "Nền tảng" },
  tenant: { label: "Khách thuê" },
  landlord: { label: "Chủ nhà" },
  host: { label: "Field Host" },
  admin: { label: "Quản trị" },
};

export const TEMPLATE_TYPE_META: Record<TemplateType, { label: string }> = {
  contract: { label: "Hợp đồng ký số" },
  variant: { label: "Bản theo vai" },
  annex: { label: "Điều khoản kèm" },
  policy: { label: "Chính sách" },
  sop: { label: "Quy chế vận hành" },
};

export const TEMPLATE_PARTY_META: Record<TemplateParty, { label: string }> = {
  tenant: { label: "Khách thuê" },
  landlord: { label: "Chủ nhà" },
  host: { label: "Field Host" },
  platform: { label: "VinStay AI" },
  bank: { label: "Ngân hàng" },
  bql: { label: "BQL" },
  handyman: { label: "Thợ ngoài" },
};

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: "CORE-00",
    group: "core",
    type: "policy",
    file: "legal/00_UNIVERSAL_ELECTRONIC_SIGNING_PROTOCOL.md",
    title: "Quy chuẩn ký hợp đồng điện tử",
    parties: ["landlord", "tenant", "platform"],
    summary: "Quy trình ký số OTP Zalo áp dụng cho mọi hợp đồng; nhật ký chứng cứ điện tử 7 yếu tố.",
    refCode: "VINSTAY-LEGAL-GEN-00",
  },
  {
    id: "CORE-01",
    group: "core",
    type: "contract",
    file: "legal/01_EXCLUSIVE_RENTAL_MANDATE.md",
    title: "HĐ ký gửi quản lý cho thuê độc quyền",
    parties: ["landlord", "platform"],
    binds: "mandate",
    related: ["LL-01"],
    summary: "Chủ nhà uỷ quyền VinStay AI điều phối cho thuê; thẩm định 0đ; thoát 15 ngày khi nhà trống.",
    refCode: "VSA-MANDATE-[MÃ CĂN]-[NĂM]",
  },
  {
    id: "CORE-02",
    group: "core",
    type: "contract",
    file: "legal/02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md",
    title: "Thoả thuận đặt cọc giữ căn (7 ngày)",
    parties: ["tenant", "platform", "landlord"],
    binds: "holding",
    related: ["TN-02"],
    summary: "Cọc 2.000.000đ qua VietQR khoá căn 7 ngày; khi ký HĐ thuê chuyển 100% thành cọc bảo đảm, không trừ tháng đầu.",
    refCode: "VSA-HOLD-[MÃ CĂN]-[SĐT]",
  },
  {
    id: "CORE-03",
    group: "core",
    type: "policy",
    file: "legal/03_PRIVACY_POLICY_AND_DATA_CONSENT.md",
    title: "Chính sách dữ liệu cá nhân & đồng thuận OCR CCCD",
    parties: ["tenant", "landlord", "host", "platform"],
    related: ["TN-03", "ADM-06"],
    summary: "Xử lý dữ liệu cá nhân theo NĐ 13/2023; OCR CCCD không lưu ảnh gốc.",
  },
  {
    id: "CORE-04",
    group: "core",
    type: "annex",
    file: "legal/04_BQL_REGULATIONS_AND_LIABILITY.md",
    title: "Nội quy BQL & khấu trừ phạt vào cọc",
    parties: ["tenant", "landlord", "bql"],
    related: ["LL-04"],
    summary: "Nội quy BQL Ocean Park; tiền phạt do lỗi khách trừ thẳng vào cọc bảo đảm.",
  },
  {
    id: "CORE-05",
    group: "core",
    type: "annex",
    file: "legal/05_HANDYMAN_REFERRAL_DISCLAIMER.md",
    title: "Miễn trừ trách nhiệm sửa chữa — thợ ngoài",
    parties: ["tenant", "platform", "handyman"],
    related: ["LL-05"],
    summary: "Nền tảng chỉ giới thiệu thợ ngoài; khách và thợ tự thoả thuận chi phí và trách nhiệm.",
  },
  {
    id: "CORE-06",
    group: "core",
    type: "contract",
    file: "legal/06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md",
    title: "HĐ thuê căn hộ chung cư",
    parties: ["landlord", "tenant"],
    binds: "lease",
    related: ["TN-04"],
    summary: "HĐ thuê giữa chủ nhà và khách, ký OTP hai đầu; VinStay AI làm chứng và giữ ký quỹ.",
    refCode: "VSA-LEASE-[MÃ CĂN]-[NĂM]",
  },
  {
    id: "CORE-07",
    group: "core",
    type: "policy",
    file: "legal/07_ESCROW_AND_DEPOSIT_CUSTODY_POLICY.md",
    title: "Chính sách ký quỹ giữ hộ cọc 3 bên",
    parties: ["tenant", "landlord", "platform", "bank"],
    related: ["TN-05", "ADM-05"],
    summary: "Cọc bảo đảm phong toả tại ngân hàng đối tác, chỉ giải toả khi đối soát xong.",
    refCode: "VSA-POL-ESCROW-2026",
  },
  {
    id: "TN-01",
    group: "tenant",
    type: "policy",
    file: "legal/tenant/01_TERMS_OF_SEARCH_AND_BOOKING.md",
    title: "Quy chế tìm kiếm, All-in Cost & đặt lịch OTP",
    parties: ["tenant", "platform"],
    summary: "Minh bạch All-in Cost; bắt buộc xác thực OTP trước khi đặt lịch xem.",
    refCode: "VSA-TENANT-01-BOOKING-2026",
  },
  {
    id: "TN-02",
    group: "tenant",
    type: "policy",
    file: "legal/tenant/02_HOLDING_DEPOSIT_AND_VIETQR_TERMS.md",
    title: "Quy chế cọc giữ căn & VietQR (7 ngày)",
    parties: ["tenant", "platform"],
    related: ["CORE-02"],
    summary: "Điều kiện thanh toán VietQR động và xử lý cọc khi hết 7 ngày.",
    refCode: "VSA-TENANT-02-DEPOSIT-2026",
  },
  {
    id: "TN-03",
    group: "tenant",
    type: "policy",
    file: "legal/tenant/03_DATA_PRIVACY_AND_OCR_CONSENT.md",
    title: "Đồng thuận AI OCR CCCD (bản khách)",
    parties: ["tenant", "platform"],
    related: ["CORE-03"],
    summary: "Khách đồng ý bóc tách CCCD; độ tin cậy < 85% chuyển nhập tay.",
    refCode: "VSA-TENANT-03-PRIVACY-2026",
  },
  {
    id: "TN-04",
    group: "tenant",
    type: "variant",
    file: "legal/tenant/04_DIGITAL_APARTMENT_LEASE_AGREEMENT.md",
    title: "HĐ thuê số hoá (bản khách)",
    parties: ["landlord", "tenant"],
    related: ["CORE-06"],
    summary: "Bản trình bày cho khách của HĐ thuê chính thức.",
    refCode: "VSA-TENANT-04-LEASE-[MÃ CĂN]-[NĂM]",
  },
  {
    id: "TN-05",
    group: "tenant",
    type: "contract",
    file: "legal/tenant/05_TRIPARTITE_ESCROW_AGREEMENT.md",
    title: "Thoả thuận ký quỹ 3 bên",
    parties: ["tenant", "landlord", "platform", "bank"],
    related: ["CORE-07"],
    summary: "Thoả thuận gửi giữ cọc bảo đảm tại ngân hàng; bản demo chưa sinh số HĐ riêng.",
    refCode: "VSA-TENANT-05-ESCROW-[MÃ CĂN]-[NĂM]",
  },
  {
    id: "TN-06",
    group: "tenant",
    type: "sop",
    file: "legal/tenant/06_HANDOVER_STAY_AND_SETTLEMENT_PROTOCOL.md",
    title: "Quy trình bàn giao, lưu trú & hoàn cọc (khách)",
    parties: ["tenant", "landlord", "host"],
    related: ["LL-06"],
    summary: "Hộ chiếu bàn giao 10 hạng mục, phân định hao mòn tự nhiên, quyết toán hoàn cọc.",
    refCode: "VSA-TENANT-06-SETTLEMENT-2026",
  },
  {
    id: "LL-01",
    group: "landlord",
    type: "variant",
    file: "legal/landlord/01_EXCLUSIVE_RENTAL_MANDATE_AGREEMENT.md",
    title: "HĐ ký gửi độc quyền & kiểm định niêm yết (bản chủ nhà)",
    parties: ["landlord", "platform"],
    related: ["CORE-01"],
    summary: "Bản trình bày cho chủ nhà của HĐ ký gửi độc quyền.",
    refCode: "VINSTAY-LEGAL-LL-01",
  },
  {
    id: "LL-02",
    group: "landlord",
    type: "annex",
    file: "legal/landlord/02_SMART_LOCK_AND_KEY_CUSTODY_PROTOCOL.md",
    title: "Quy chế mã khoá điện tử & lưu ký chìa cơ",
    parties: ["landlord", "platform", "host"],
    summary: "Mã cửa cấp trong app khi Host xác nhận xem; không Lockbox; chìa cơ giữ tại phân khu.",
    refCode: "VINSTAY-LEGAL-LL-02",
  },
  {
    id: "LL-03",
    group: "landlord",
    type: "annex",
    file: "legal/landlord/03_DIGITAL_HANDOVER_PASSPORT_AND_ASSET_BASELINE.md",
    title: "Thẩm định hiện trạng & Hộ chiếu bàn giao",
    parties: ["landlord", "host", "tenant"],
    related: ["FH-06"],
    summary: "Baseline 10 hạng mục nội thất có ảnh timestamp làm bằng chứng khi trả phòng.",
    refCode: "VINSTAY-LEGAL-LL-03",
  },
  {
    id: "LL-04",
    group: "landlord",
    type: "annex",
    file: "legal/landlord/04_SECURITY_DEPOSIT_AND_VIOLATION_DEDUCTION_POLICY.md",
    title: "Quản lý cọc bảo đảm & khấu trừ phạt BQL",
    parties: ["landlord", "tenant", "platform"],
    related: ["CORE-04"],
    summary: "Cọc bảo đảm 1–2 tháng gồm 2tr chuyển đổi; khấu trừ phạt BQL, hư hại, công nợ.",
    refCode: "VINSTAY-LEGAL-LL-04",
  },
  {
    id: "LL-05",
    group: "landlord",
    type: "annex",
    file: "legal/landlord/05_ASSET_LIGHT_MAINTENANCE_AND_HANDYMAN_DISCLAIMER.md",
    title: "Miễn trừ bảo trì & danh bạ thợ ngoài (bản chủ nhà)",
    parties: ["landlord", "platform", "handyman"],
    related: ["CORE-05"],
    summary: "Chủ nhà không bị gọi lúc nửa đêm; sự cố xử lý qua danh bạ thợ ngoài.",
    refCode: "VINSTAY-LEGAL-LL-05",
  },
  {
    id: "LL-06",
    group: "landlord",
    type: "sop",
    file: "legal/landlord/06_CHECKOUT_SETTLEMENT_AND_FAST_ESCROW_RELEASE.md",
    title: "Nghiệm thu cuối kỳ & giải toả ký quỹ",
    parties: ["landlord", "tenant", "platform"],
    related: ["TN-06"],
    summary: "Chốt công tơ, đối soát EVN/nước/xe trước khi hoàn cọc.",
    refCode: "VINSTAY-LEGAL-LL-06",
  },
  {
    id: "FH-01",
    group: "host",
    type: "contract",
    file: "legal/host/01_FIELD_HOST_PARTNERSHIP_AND_SLA_AGREEMENT.md",
    title: "HĐ hợp tác Field Host & SLA 3 phút",
    parties: ["host", "platform"],
    binds: "partnership",
    summary: "Đối tác thực địa 100% biến phí; nhận ticket trong 3 phút theo Auto-Dispatch 3 tầng.",
    refCode: "VINSTAY-LEGAL-FH-01",
  },
  {
    id: "FH-02",
    group: "host",
    type: "annex",
    file: "legal/host/02_DYNAMIC_COMMISSION_AND_INCENTIVE_POLICY.md",
    title: "Chính sách thù lao biến phí & thưởng",
    parties: ["host", "platform"],
    related: ["ADM-03"],
    summary: "Thù lao lượt dẫn, hoa hồng chốt cọc, hệ số sao và thưởng chiến dịch do Admin cấu hình.",
    refCode: "VINSTAY-LEGAL-FH-02",
  },
  {
    id: "FH-03",
    group: "host",
    type: "sop",
    file: "legal/host/03_LOBBY_RECEPTION_AND_RFID_CARD_PROTOCOL.md",
    title: "Tiếp đón sảnh, thẻ RFID & Zalo OA",
    parties: ["host"],
    summary: "Đón khách tại sảnh, quẹt thẻ cư dân, liên lạc qua Zalo OA không lộ SĐT.",
    refCode: "VINSTAY-LEGAL-FH-03",
  },
  {
    id: "FH-04",
    group: "host",
    type: "sop",
    file: "legal/host/04_DOUBLE_REMINDER_AND_ANTI_NOSHOW_PROTOCOL.md",
    title: "Nhắc hẹn kép T-10m & xử lý no-show",
    parties: ["host", "tenant"],
    summary: "Nhắc Host và khách trước 10 phút; nút 1-chạm “Tôi đã có mặt tại sảnh”.",
    refCode: "VINSTAY-LEGAL-FH-04",
  },
  {
    id: "FH-05",
    group: "host",
    type: "annex",
    file: "legal/host/05_CODE_OF_CONDUCT_AND_NON_CIRCUMVENTION.md",
    title: "Quy tắc ứng xử & chống cắt cầu",
    parties: ["host", "platform"],
    summary: "Chuẩn tiếp đón, bảo mật thông tin, chế tài giao dịch ngoài nền tảng.",
    refCode: "VINSTAY-LEGAL-FH-05",
  },
  {
    id: "FH-06",
    group: "host",
    type: "sop",
    file: "legal/host/06_DIGITAL_HANDOVER_AND_HOST_PERFORMANCE_RATING.md",
    title: "Nghiệm thu Hộ chiếu số & đánh giá Host",
    parties: ["host", "landlord", "tenant"],
    related: ["LL-03"],
    summary: "Host lập hộ chiếu bàn giao, chốt công tơ và được chấm điểm năng lực.",
    refCode: "VINSTAY-LEGAL-FH-06",
  },
  {
    id: "ADM-01",
    group: "admin",
    type: "sop",
    file: "legal/admin/01_SYSTEM_ADMINISTRATION_AND_BI_OCCUPANCY_HEATMAP.md",
    title: "Quản trị hệ thống, phễu BI & heatmap",
    parties: ["platform"],
    summary: "Phân quyền quản trị, theo dõi phễu chuyển đổi và tỷ lệ lấp đầy.",
    refCode: "VINSTAY-LEGAL-ADM-01",
  },
  {
    id: "ADM-02",
    group: "admin",
    type: "sop",
    file: "legal/admin/02_EXCLUSIVE_INVENTORY_AND_15_DAY_EXIT_MONITORING.md",
    title: "Rổ hàng độc quyền, khoá 7 ngày & thoát 15 ngày",
    parties: ["platform"],
    related: ["CORE-01"],
    summary: "Vòng đời căn, thẩm định 1 lần, giám sát và offboard khi thoát uỷ quyền.",
    refCode: "VINSTAY-LEGAL-ADM-02",
  },
  {
    id: "ADM-03",
    group: "admin",
    type: "sop",
    file: "legal/admin/03_DYNAMIC_COMMISSION_ENGINE_AND_AUDIT_TRAIL.md",
    title: "Công cụ biến phí & nhật ký kiểm toán",
    parties: ["platform"],
    related: ["FH-02"],
    summary: "Cấu hình biến phí Host trên Admin Portal, mọi thay đổi có audit log.",
    refCode: "VINSTAY-LEGAL-ADM-03",
  },
  {
    id: "ADM-04",
    group: "admin",
    type: "sop",
    file: "legal/admin/04_AUTO_DISPATCH_SLA_AND_FIELD_ESCALATION.md",
    title: "Điều phối SLA & leo thang thực địa",
    parties: ["platform"],
    related: ["FH-01"],
    summary: "Auto-Dispatch 3 tầng, can thiệp khi ticket quá 3 phút.",
    refCode: "VINSTAY-LEGAL-ADM-04",
  },
  {
    id: "ADM-05",
    group: "admin",
    type: "sop",
    file: "legal/admin/05_NAMED_ESCROW_ACCOUNT_AND_SETTLEMENT_PROTOCOL.md",
    title: "Tài khoản định danh & quyết toán ký quỹ",
    parties: ["platform"],
    related: ["CORE-07"],
    summary: "Tách dòng tiền ký quỹ và phí vận hành; đối soát All-in Cost.",
    refCode: "VINSTAY-LEGAL-ADM-05",
  },
  {
    id: "ADM-06",
    group: "admin",
    type: "sop",
    file: "legal/admin/06_DATA_PRIVACY_SECURITY_AND_AI_GOVERNANCE.md",
    title: "An toàn thông tin, NĐ 13 & giám sát AI",
    parties: ["platform"],
    related: ["CORE-03"],
    summary: "Mã hoá dữ liệu, quyền truy cập và giám sát các module AI.",
    refCode: "VINSTAY-LEGAL-ADM-06",
  },
];

export const TEMPLATE_STEPS: TemplateStep[] = [
  {
    id: "S01",
    actor: "tenant",
    step: "Xác thực OTP và đặt lịch xem phòng",
    route: "/units/[id]",
    action: "createBooking",
    attached: ["TN-01", "CORE-03"],
    implemented: true,
  },
  {
    id: "S02",
    actor: "host",
    step: "Nhắc hẹn T-10m, đón sảnh, xác nhận xem để nhận mã cửa",
    route: "/host/viewing/[id]",
    action: "hostConfirmViewing",
    attached: ["FH-03", "FH-04", "LL-02"],
    implemented: true,
  },
  {
    id: "S03",
    actor: "tenant",
    step: "Chuyển cọc 2.000.000đ qua VietQR",
    route: "/host/viewing/[id]",
    action: "confirmDepositPaid",
    attached: ["TN-02", "CORE-07"],
    produces: "holding",
    implemented: true,
  },
  {
    id: "S04",
    actor: "tenant",
    step: "Xác minh CCCD bằng AI OCR",
    route: "/host/viewing/[id]",
    action: "saveKyc",
    attached: ["CORE-03", "TN-03"],
    implemented: true,
  },
  {
    id: "S05",
    actor: "tenant",
    step: "Ký thoả thuận đặt cọc bằng OTP",
    route: "/booking/[ref]",
    action: "tenantSignAgreement",
    primary: "CORE-02",
    attached: ["CORE-00", "TN-02"],
    produces: "holding",
    implemented: true,
  },
  {
    id: "S06",
    actor: "tenant",
    step: "Chủ nhà và khách ký HĐ thuê",
    route: "/host/viewing/[id]",
    action: "signLease",
    primary: "CORE-06",
    attached: ["TN-04", "CORE-00", "CORE-04", "CORE-05", "LL-04", "CORE-07", "TN-05"],
    produces: "lease",
    implemented: true,
  },
  {
    id: "S07",
    actor: "host",
    step: "Lập Hộ chiếu bàn giao khi khách nhận nhà",
    attached: ["LL-03", "FH-06", "TN-06"],
    implemented: false,
  },
  {
    id: "S08",
    actor: "landlord",
    step: "Đăng ký căn và ký uỷ quyền độc quyền bằng OTP",
    route: "/landlord/consign",
    action: "signConsignment",
    primary: "CORE-01",
    attached: ["LL-01", "LL-02", "CORE-00", "CORE-03"],
    produces: "mandate",
    implemented: true,
  },
  {
    id: "S09",
    actor: "host",
    step: "Nhận ticket và thẩm định hiện trạng căn ký gửi",
    route: "/host/inspections/[id]",
    action: "submitInspection",
    attached: ["LL-03", "ADM-02"],
    produces: "mandate",
    implemented: true,
  },
  {
    id: "S10",
    actor: "admin",
    step: "Duyệt hoặc từ chối hồ sơ ký gửi",
    route: "/admin/inventory/[id]",
    action: "approveConsignment",
    attached: ["ADM-02"],
    produces: "mandate",
    implemented: true,
  },
  {
    id: "S11",
    actor: "landlord",
    step: "Yêu cầu thoát uỷ quyền, báo trước 15 ngày",
    route: "/landlord/exit-request",
    action: "requestMandateExit",
    attached: ["CORE-01", "ADM-02"],
    produces: "mandate",
    implemented: true,
  },
  {
    id: "S12",
    actor: "admin",
    step: "Hoàn tất offboard khi hết 15 ngày",
    route: "/admin/contracts/[key]",
    action: "completeMandateExit",
    attached: ["ADM-02", "LL-02"],
    produces: "mandate",
    implemented: true,
  },
  {
    id: "S13",
    actor: "admin",
    step: "Nhắc gia hạn HĐ thuê còn ≤ 30 ngày",
    route: "/admin/contracts/[key]",
    action: "remindLeaseRenewal",
    attached: ["CORE-06"],
    produces: "lease",
    implemented: true,
  },
  {
    id: "S14",
    actor: "admin",
    step: "Chỉnh biến phí Field Host",
    route: "/admin/commission",
    action: "updateFee",
    attached: ["ADM-03", "FH-02"],
    implemented: true,
  },
  {
    id: "S15",
    actor: "admin",
    step: "Điều phối lại ca xem cho Host khác",
    route: "/admin/bookings",
    action: "adminReassign",
    attached: ["ADM-04", "FH-01"],
    implemented: true,
  },
  {
    id: "S16",
    actor: "admin",
    step: "Kết nạp Field Host, cấp thẻ RFID",
    route: "/admin/hosts",
    primary: "FH-01",
    attached: ["FH-02", "FH-03", "FH-05", "CORE-03"],
    produces: "partnership",
    implemented: false,
  },
  {
    id: "S17",
    actor: "tenant",
    step: "Báo sự cố, nhận danh bạ thợ ngoài",
    route: "/account/contracts",
    attached: ["CORE-05", "LL-05"],
    implemented: false,
  },
  {
    id: "S18",
    actor: "system",
    step: "Trả phòng: chốt công tơ, đối soát, hoàn cọc",
    attached: ["LL-06", "TN-06", "LL-04", "ADM-05"],
    produces: "lease",
    implemented: false,
  },
];

export function templateById(id: string): ContractTemplate | undefined {
  return CONTRACT_TEMPLATES.find((t) => t.id === id);
}

export function templateForKind(kind: TemplateKind): ContractTemplate {
  const t = CONTRACT_TEMPLATES.find((item) => item.binds === kind);
  if (!t) {
    throw new Error(`template_missing:${kind}`);
  }
  return t;
}

export function templatesForKind(kind: TemplateKind): { primary: ContractTemplate; attached: ContractTemplate[] } {
  const primary = templateForKind(kind);
  const attachedIds: string[] = [];
  const seen = new Set<string>();
  seen.add(primary.id);

  for (const s of TEMPLATE_STEPS) {
    if (s.produces === kind) {
      for (const attId of s.attached) {
        if (!seen.has(attId)) {
          seen.add(attId);
          attachedIds.push(attId);
        }
      }
    }
  }

  const attached = attachedIds
    .map((id) => templateById(id))
    .filter((t): t is ContractTemplate => t !== undefined);

  return { primary, attached };
}

export function stepsForTemplate(id: string): TemplateStep[] {
  return TEMPLATE_STEPS.filter((s) => s.primary === id || s.attached.includes(id));
}

export function templatesForParty(role: TemplateParty): ContractTemplate[] {
  return CONTRACT_TEMPLATES.filter((t) => t.parties.includes(role) && t.type !== "sop");
}

export function contractsUsingTemplate(rows: ContractRow[], id: string): ContractRow[] {
  const t = templateById(id);
  const kinds = new Set<string>();
  if (t?.binds) {
    kinds.add(t.binds);
  }
  for (const s of stepsForTemplate(id)) {
    if (s.produces) {
      kinds.add(s.produces);
    }
  }
  return rows.filter((r) => kinds.has(r.kind));
}
