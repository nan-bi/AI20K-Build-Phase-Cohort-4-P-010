# Worklog — Team P-010

> Ghi lại tất cả công việc đã làm theo ngày. Ai làm gì, kết quả gì.

---

## 2026-09-19

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Nam (namnp) | Cấu hình biến môi trường `.env` và cài đặt Git pre-push hook cho AI Logging | ✅ Done | Branch `namnp/set_up_ai_log`, hook `.git/hooks/pre-push` sẵn sàng | 1h |

**Tổng kết ngày:** Hoàn thành thiết lập ban đầu và kích hoạt hệ thống AI Usage Logging cho repo.

---

## 2026-09-20

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| lan(nan-bi) | Cài đặt môi trường Python: tạo venv, cài `requirements.txt` (langchain, langchain-openai, v.v.) | ✅ Done | Các package đã được cài đặt thành công vào môi trường ảo `.venv` | 0.5h |
| lan(nan-bi) | Sao chép `.env.example` → `.env` để cấu hình biến môi trường cục bộ | ✅ Done | File `.env` sẵn sàng để điền API keys | 0.1h |
| lan(nan-bi) | Chạy lại `scripts/setup_hooks.ps1` để cài đặt/tái xác nhận Git pre-push hook AI Logging | ✅ Done | Hook `.git/hooks/pre-push` được xác nhận hoạt động | 0.2h |
| Phương (phuong) | Chuẩn bị môi trường làm việc và kiểm tra repo template của dự án | ✅ Done | Đã xác nhận cấu trúc repo và sẵn sàng triển khai công việc cá nhân | 0.3h |
| Phương (phuong) | Nghiên cứu yêu cầu và xác định nhiệm vụ của bản thân trong dự án | ✅ Done | Đã nắm rõ hướng phát triển agent và cách phối hợp với team | 0.4h |

**Tổng kết ngày:** Hoàn tất thiết lập môi trường phát triển cục bộ — venv, dependencies, `.env`, và Git hook AI Logging đều sẵn sàng hoạt động.

---

## 2026-09-22

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| phuong | Rà soát các tài liệu trong thư mục `docs/` để lọc thông tin về luồng khách thuê và luồng hệ thống | ✅ Done | Tổng hợp chuỗi end-to-end: ký gửi căn → xác minh listing → tìm và khớp căn theo All-in Cost → đặt lịch OTP → điều phối Field Host → xem phòng → cọc VietQR → khóa căn 24 giờ → OCR CCCD và ký số → bàn giao | 1h |
| phuong | Phân tích luồng chủ nhà trong `UI_FLOW_SPEC.md`, `PRD.md`, `SAD.md` và `PROTOTYPE_GUIDE.md` | ✅ Done | Đặc tả luồng đăng ký căn, ký gửi độc quyền, cấu hình mã cửa/chìa cơ, theo dõi từ xa, nhận thông báo mở cửa/cọc, Digital Handover Passport và thoát ủy quyền sau 15 ngày | 0.5h |
| phuong | Đối chiếu các trạng thái và trách nhiệm giữa người dùng và hệ thống | ✅ Done | Ghi nhận các trạng thái chính `available`, `holding`, `rented`, `unlisted`; cùng các nhánh no-show, double booking, OCR không đạt và webhook thanh toán chậm | 0.5h |

**Tổng kết ngày:** Hoàn thành việc đọc và hệ thống hóa tài liệu nghiệp vụ. Làm rõ luồng chủ nhà theo mục tiêu vận hành từ xa 100%, đồng thời phân tách được thao tác của khách thuê, Field Host, Admin và các xử lý tự động của hệ thống.

## 2026-09-23

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Nam (namnp) | Xây dựng giao diện danh mục căn hộ (Catalog) và Bộ lọc All-in Cost ban đầu | ✅ Done | Component Catalog, All-in Cost Calculator sơ bộ | 2h |
| Duy (duynk) | Soạn thảo khung Hợp đồng Ký gửi Độc quyền và Quy chuẩn pháp lý chủ nhà | ✅ Done | Bản thảo Hợp đồng Ký gửi và cam kết bảo vệ tài sản | 1.5h |
| Phương (phuong) | Rà soát luồng người dùng và hỗ trợ kiểm tra giao diện Catalog | ✅ Done | Tài liệu phản hồi UX/UI cho luồng tìm phòng | 1h |

**Tổng kết ngày:** Khởi động Tuần 2 — bước đầu hình thành giao diện Catalog phòng và các khung pháp lý nền tảng cho sàn hai mặt.

---

## 2026-09-24

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Duy (duynk) | Ban hành Quy chuẩn Ký kết Hợp đồng Điện tử Thống nhất (00) & Bộ pháp lý Nhóm 2 (Chủ nhà), Nhóm 3 (Field Host), Nhóm 4 (Admin/Partners) | ✅ Done | 5 văn bản pháp lý hoàn thiện tại thư mục `legal/` | 3h |
| Duy (duynk) | Nghiên cứu và áp dụng cơ chế bảo mật Zero-Storage Ephemeral OCR (tiêu hủy ảnh CCCD tức thì theo NĐ 13/2023) | ✅ Done | Quy trình kỹ thuật mã hóa AES-256 và bảo vệ dữ liệu cá nhân | 1.5h |
| Phương (phuong) | Cập nhật và tinh gọn tài liệu kiến trúc SAD / PRD | ✅ Done | Làm rõ vai trò các bên và cấu trúc dịch vụ | 1h |

**Tổng kết ngày:** Hoàn thiện bộ khung pháp lý cốt lõi gồm 5 văn bản ràng buộc và thiết lập chuẩn bảo mật dữ liệu Zero-Storage.

---

## 2026-09-25

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Lan (nan-bi) | Xây dựng kiến trúc Backend NestJS tích hợp Prisma ORM và Supabase | ✅ Done | Thư mục `backend/` với đầy đủ service, controller, DDL schema | 3.5h |
| Nam (namnp) | Hiện thực hóa xác thực 4 vai trò người dùng (Tenant, Landlord, Host, Admin) và xác nhận thẻ cư dân RFID | ✅ Done | Luồng đăng nhập đa vai trò, bộ chọn vai trò mô phỏng | 2.5h |
| Duy (duynk) | Chuẩn hóa quy chuẩn tích hợp FPT.AI eKYC, Face Liveness và tiêu hủy ảnh tức thì | ✅ Done | Tài liệu kỹ thuật tích hợp eKYC đạt chuẩn pháp lý | 1.5h |

**Tổng kết ngày:** Hợp nhất thành công tầng Backend NestJS/Prisma và hoàn thành luồng xác thực đa vai trò trên Web Frontend.

---

## 2026-09-26

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Nam (namnp) | Cấu trúc lại giao diện Admin Portal và Host Dashboard; bổ sung Mock Data MVP | ✅ Done | Giao diện quản trị, tiếp nhận ticket Host, điều phối lượt dẫn | 3h |
| Nam (namnp) | Tích hợp Google OAuth với JWT session cookie (`vs_role`) | ✅ Done | Đăng nhập Google mượt mà cho tài khoản người dùng | 1.5h |

**Tổng kết ngày:** Giao diện điều hành nội bộ của Admin và Field Host đã sẵn sàng với dữ liệu mô phỏng căn hộ Vinhomes Ocean Park.

---

## 2026-09-27

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Duy (duynk) | Thiết lập Mô hình Tài chính & Kinh doanh ban đầu (`FINANCIAL_AND_REVENUE_MODEL.md`) | ✅ Done | Định phí 5 nhóm chi phí và mô hình hóa 3 nguồn thu nền tảng | 2.5h |
| Duy (duynk) | Chuẩn hóa tiếng Việt thuần và điều khoản bảo mật cho Hợp đồng Ký gửi và Chính sách Ký quỹ | ✅ Done | Hoàn thiện ngôn ngữ pháp lý chính xác, dễ hiểu cho người dùng | 1.5h |

**Tổng kết ngày:** Dự án có bản phân tích tài chính sơ bộ đầu tiên, gắn kết giữa năng lực sản phẩm và bài toán dòng tiền.

---

## 2026-09-28

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Duy (duynk) | Bổ sung Phụ lục 01 ủy quyền kiểm định, tinh gọn Hợp đồng độc quyền; tích hợp danh mục 32 hạng mục kiểm định | ✅ Done | Phụ lục 01 và bảng kiểm 32 hạng mục nội thất số hóa | 2h |
| Duy (duynk) | Mã hóa bảo mật SĐT chủ nhà trên hợp đồng; chuyển tham số mở tiền cọc theo căn | ✅ Done | Cơ chế ẩn danh SĐT chủ nhà và tiền cọc mở | 1.5h |
| Nam (namnp) | Nâng cấp giao diện người dùng, bổ sung layout và làm mới README dự án | ✅ Done | Cải tiến giao diện Web mượt mà, trực quan hơn | 1.5h |

**Tổng kết ngày:** Tối ưu hóa trải nghiệm ký gửi căn hộ, bổ sung danh mục kiểm định 32 hạng mục làm nền tảng cho Hộ chiếu bàn giao số.

---

## 2026-09-29

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Nam (namnp) | Release Web v0.7.0: Khóa căn 7 ngày, quy trình cọc & thuê phía khách, kiểm tra 32 hạng mục | ✅ Done | Web v0.7.0 với toàn bộ luồng khách thuê và kiểm tra nội thất | 3h |
| Nam (namnp) | Release Web v0.8.0: Điều phối Field Host 3 tầng theo Rating sao & Ticket mở, Tenant Gate, Zalo OTP 1 lần, bỏ ký thỏa thuận cọc riêng | ✅ Done | Web v0.8.0, 14 test suites (147/147 tests pass) | 3h |
| Duy (duynk) | Nâng cấp Hợp đồng Ủy quyền 10 điều, ban hành Thỏa thuận Đối tác Tiếp đón Thực địa 08 (Field Host Protocol) | ✅ Done | Văn bản pháp lý 08 và cập nhật HĐ ủy quyền độc quyền | 2h |
| Duy (duynk) | Bổ sung Điều 13 chế tài cố ý phá hoại/tẩu thoát; bổ sung tài khoản thanh toán và phạt trễ hạn vào hợp đồng thuê | ✅ Done | Đồng bộ điều khoản bảo vệ tài sản chủ nhà và thu hồi công nợ | 1.5h |
| Duy (duynk) | Sửa lỗi cơ chế SSL fallback trong `submit_log.py` cho hệ thống AI Usage Logging trên macOS | ✅ Done | Script log tự động chạy trơn tru khi push git | 0.5h |

**Tổng kết ngày:** Bước ngoặt lớn của sản phẩm: Tinh gọn quy trình từ cọc sang thuê, kích hoạt hệ thống điều phối Host 3 tầng và đạt 100% test pass.

---

## 2026-09-30

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Nam (namnp) | Release Web v0.9.0 & v0.9.1: Đồng bộ pháp lý Admin cấu hình thời hạn giữ căn (12-72h), Fix chọn lịch tháng kế tiếp | ✅ Done | Web v0.9.1 với bộ chọn lịch cải tiến | 2h |
| Nam (namnp) | Release Web v0.9.2: Sửa lỗi hiển thị tóm tắt đặt lịch khi khách đã đăng nhập | ✅ Done | Web v0.9.2 hoạt động hoàn hảo tại port 3000 | 1h |
| Duy (duynk) | Rà soát và đồng bộ toàn diện Mô hình Tài chính (`FINANCIAL_AND_REVENUE_MODEL.md`) với Web v0.9.2 | ✅ Done | Số liệu khớp 100% với mã nguồn, fix test `legal-sync.test.ts` (169/169 tests pass) | 2h |
| Duy (duynk) | Xây dựng phân tích Thị trường TAM – SAM – SOM định lượng (TAM $1.16B, SAM $58M, SOM 300 căn) — ĐÃ DUYỆT | ✅ Done | Mục 2 chi tiết trong mô hình tài chính | 2h |
| Duy (duynk) | Xây dựng Phễu chuyển đổi 2 đầu (Tenant 6 tầng, Landlord 5 tầng) và Mô hình phân bổ CAC chi tiết (~1.150k/deal) | ✅ Done | Mục 3.4 chi tiết trong mô hình tài chính | 2h |

**Tổng kết ngày:** Hoàn thiện 100% bộ tiêu chí kỹ thuật và bài toán kinh doanh Gate 1: Web v0.9.2 chạy thực tế, 169 tests pass, TAM-SAM-SOM và phễu chuyển đổi hai đầu định lượng đạt chuẩn tổ chức.

---

## 2026-10-02

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Duy (duynk) | Xây dựng Tài liệu Đặc tả Thuật toán Định giá & Niêm yết Động (`docs/DYNAMIC_PRICING_SPEC.md`) | ✅ Done | Công thức trọng số đa biến 4 nhóm, hàm phân rã DOM, cơ chế Floor/Target Price Guardrail và Rank PCS | 2.5h |
| Duy (duynk) | Ban hành Quy chuẩn FOMO Tag, Waitlist F2 và Quy chế First-to-Pay Wins + AI Conflict Resolver | ✅ Done | Cập nhật đồng bộ AGENTS.md, GEMINI.md, PRD.md (Mục 3.5) và Văn bản Pháp lý 08 (Điều 5, Điều 6) | 2h |
| Duy (duynk) | Khắc phục xung đột phụ thuộc `@react-oauth/google`, phục hồi localhost:3000 đạt HTTP 200 | ✅ Done | Cài đặt module vào `apps/web/node_modules/`, khởi động lại dev server thành công | 0.5h |
| Lan (nan-bi) | Đồng bộ 75 căn hộ chuẩn hóa Vinhomes Ocean Park (Sapphire 1 & 2) lên Web và Supabase DB | ✅ Done | Catalog Web hiển thị 75 căn kèm hình ảnh thực tế, script seed DB `seed_excel_units.ts` | 3h |
| Lan (nan-bi) | Tích hợp Google OAuth Login & Register 1-chạm và xây dựng module `apiClient` kết nối Backend | ✅ Done | Giao diện đăng nhập mượt mà, bộ API client cho frontend kết nối Supabase/NestJS | 2.5h |
| Lan (nan-bi) | Hoàn thiện toàn diện các API Backend NestJS (GET & Mutation) cho 8 modules cốt lõi | ✅ Done | Endpoints Account, Host, Booking, Dispatch, Deposit, Landlord, Identity, Admin | 3h |
| Phương (phuong) | Xây dựng bộ công cụ điều phối tự động và trích xuất tài liệu Kiến trúc phần mềm chuẩn hóa (SAD v2.0) | ✅ Done | 15 lát cắt kiến trúc chuyên sâu tại `ai-pack/sad/`, bộ tools kiểm tra tự động | 3h |
| Phương (phuong) | Xây dựng Bảng phân quyền Route Guard (88 routes) và Bản đồ CSDL Prisma | ✅ Done | `ai-pack/ROUTE_GUARD_TABLE.md`, `ai-pack/PRISMA_MODELS.md` | 1.5h |
| Nam (namnp) | Cập nhật tài liệu kiến trúc Backend (`backend/README.md`) và danh mục endpoints chuẩn (PR #6) | ✅ Done | Tài liệu API Backend chi tiết, hướng dẫn cài đặt và tích hợp cho toàn team | 1.5h |

**Tổng kết ngày:** Ngày làm việc bứt phá của toàn đội: Hoàn tất đồng bộ 75 căn hộ thực tế, kết nối thông luồng Frontend - Backend - Supabase, ban hành cơ chế giải quyết xung đột giữ căn và trích xuất chuẩn hóa toàn bộ tài liệu kiến trúc hệ thống phục vụ Gate 2.

## 2026-10-03

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| Nam (namnp) | Hợp nhất và chuẩn hóa toàn diện luồng Xác thực (Auth Flow) trên toàn bộ các Portal (PR #9) | ✅ Done | Bỏ các form đăng nhập phân mảnh; tích hợp `PortalAuth.tsx`, `client.ts`, bổ sung test `account.http.spec.ts` | 3h |
| Duy (duynk) | Kéo mã nguồn mới nhất (`git pull origin main`), đồng bộ 14 test suites (157/157 tests pass 100%) | ✅ Done | Kiểm thử toàn diện frontend, xác nhận dev server Next.js localhost:3000 đạt HTTP 200 | 1h |
| Duy (duynk) | Xây dựng Báo cáo Tiến độ Ca trực Mentor Gate 2 (`docs/MENTOR_DUTY_REPORT.md`) | ✅ Done | Báo cáo chi tiết 5 tiêu chí Gate 2, tiến độ 4 phân hệ và 3 chủ đề tham vấn chuyên sâu | 1h |
| Duy & Phương | Chuẩn hóa toàn văn ARCHITECTURE.md từ SAD v2.0 và 4 Core Engines của VinStay AI | ✅ Done | File ARCHITECTURE.md hoàn chỉnh, sơ đồ Mermaid C4 Container, Sequence Flows, 4 ADRs | 2h |
| Nam, Lan & Duy | Hoàn thiện Báo cáo Đánh giá & Kiểm thử Gate 2 (`eval/results/report.md`) | ✅ Done | 5 Trụ cột đánh giá, 405 tests pass 100%, 5 Kịch bản nghiệp vụ vàng, Khảo sát 20 người dùng | 2h |

**Tổng kết ngày:** Ngày làm việc hoàn thành xuất sắc toàn bộ hồ sơ kỹ thuật Gate 2: Chuẩn hóa kiến trúc ARCHITECTURE.md, hoàn thiện Báo cáo Kiểm thử Thực tế eval/results/report.md với 405 tests pass xanh 100%, tự tin bảo vệ Gate 2 ở mức điểm tối đa (49-50/50).

---

<!-- Format: copy block trên cho mỗi ngày làm việc -->


