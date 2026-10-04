# VINSTAY AI — BACKEND SERVICE PLATFORM

Hệ thống API Backend toàn diện cho nền tảng thuê căn hộ Asset-Light tại **Vinhomes Ocean Park (The Sapphire 1 & 2)**.

> **Công nghệ:** NestJS 10 + Prisma ORM + Supabase (PostgreSQL + Auth + Storage).  
> **Tuân thủ chuẩn:** [SAD v2.0](../docs/SAD_v2.md), bộ văn bản pháp lý [`legal/`](../legal/) và [Interactive Prototype Guide](../docs/PROTOTYPE_GUIDE.md).  
> **🎯 TRÌNH DIỄN SƠ ĐỒ & TÀI LIỆU BACKEND:** Mở tệp tin [`backend/BACKEND_SHOW.html`](./BACKEND_SHOW.html) (hoặc [`presentation/BACKEND_SHOW.html`](../presentation/BACKEND_SHOW.html)) để xem tài liệu cơ bản và bấm nút **"Mở Trình Chiếu Sơ Đồ (Show Mode)"** để xem 6 sơ đồ kiến trúc tương tác!

---

## 1. DANH MỤC API THEO MÀN HÌNH & LUỒNG NGHIỆP VỤ

Danh mục API được dựng từ **các màn hình và luồng nghiệp vụ** của 4 cổng (Khách thuê, Chủ nhà, Field Host, Admin).
API phục vụ dữ liệu thật và bám theo quy tắc trong [`legal/`](../legal/) và [`AGENTS.md`](../AGENTS.md).

- Base URL `/api/v1` · Swagger `/api/docs` · Phiên = cookie httpOnly (xem §4).
- Các controller nghiệp vụ hiện vẫn `@Public()` — chưa gắn `@Roles`. Cột "Vai" là phân quyền đích.
- Trạng thái so với code backend: ✅ đã có · ⚠️ đã có nhưng lệch nghiệp vụ (phải sửa) · ⬜ chưa có (đường dẫn là đề xuất).

### 1.0. Quy tắc nghiệp vụ API phải tuân thủ

Các đơn giá và ngưỡng có thể thay đổi (phí quản lý, gửi xe, biến phí Host, thời hạn giữ chỗ…) lưu trong DB và do Admin cấu hình, không hard-code.

| Quy tắc | Nội dung | Nguồn |
|---|---|---|
| All-in Cost | tiền thuê + phí quản lý BQL theo m² + phí gửi xe + điện nước ước tính theo số người; lọc loại căn vượt ngân sách trần | AGENTS (Khách thuê #2) |
| Badge "Căn hời phân khu" | rẻ hơn ≥ 10% so với layout cùng phân khu | AGENTS (Chủ nhà #1) |
| Xác thực SĐT | OTP Zalo bắt buộc trước khi đặt lịch, mỗi SĐT xác thực một lần | AGENTS (Chủ nhà #2) |
| Điều phối | 3 tầng: Host gần nhất → Open Pool 500m sau 3 phút → Area Lead; nhắc hẹn kép T-10m | AGENTS (Vận hành #3, #5) |
| Mã cửa | chỉ cấp khi Host xác nhận xem phòng tại cửa; không Lockbox, không QR sảnh | AGENTS (Chủ nhà #2) |
| Cọc giữ chỗ | 2.000.000đ qua VietQR động; căn khoá `holding` theo số giờ Admin cài (mặc định **48h**, 12–72h, chỉnh riêng từng căn) | [legal/02](../legal/02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md) · ⚠️ backend đang cứng **7 ngày** |
| Điều khoản cọc | khách tick đồng ý trước khi hiện VietQR — **không** ký thỏa thuận cọc riêng | AGENTS (Chủ nhà #3) |
| Kết cục cọc | ký HĐ thuê → chuyển **100%** vào Tiền cọc bảo đảm (không trừ tiền thuê tháng đầu) · khách quá hạn/từ chối → mất cọc, chia 50% chủ nhà / 50% nền tảng · chủ nhà vi phạm → hoàn cọc + phạt tương đương · bất khả kháng → hoàn 100% | [legal/02 Điều 6](../legal/02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md) |
| Tiền cọc bảo đảm | 1–2 tháng tiền thuê; giữ nguyên suốt kỳ thuê để cấn trừ hư hỏng nội thất, phạt BQL, nợ điện nước; hoàn khách khi thanh lý HĐ | [legal/06 Điều 4](../legal/06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md) |
| Uỷ quyền độc quyền | 12 tháng, tự gia hạn; chủ nhà thoát khi căn trống, báo trước 15 ngày, hết hạn thì thu hồi mã cửa | [legal/01 Điều 8](../legal/01_EXCLUSIVE_RENTAL_MANDATE.md) |
| Biến phí Field Host | phí lượt dẫn, hoa hồng chốt cọc, hệ số đánh giá, thưởng nóng — Admin cấu hình, có nhật ký | AGENTS (Vận hành #4) |

Vòng đời lịch xem: `pending → confirmed → lobby → receiving → viewing → closing → holding → leased`;
nhánh phụ `completed` (xem xong chưa thuê), `no_show`, `cancelled`, `rejected`.

### 1.1. 👤 Công khai & Khách thuê (Toàn bộ A1–A21 đã hoàn thành)

Màn: trang chủ chat AI, danh sách/chi tiết căn, đặt lịch xem & OTP Zalo, theo dõi lịch hẹn, cọc giữ chỗ VietQR, eKYC 1 bước Zero-Storage, hợp đồng & tải PDF tiếng Việt.

| Endpoint | Vai | Nghiệp vụ / Contract | TT |
|---|---|---|---|
| `GET /properties/buildings` (A1) | công khai | Bộ lọc toà | ✅ |
| `GET /properties/units` (A1) | công khai | Catalog căn hộ: All-in Cost, Căn hời, ẩn căn 0 ảnh | ✅ |
| `GET /properties/units/:code` (A2) | công khai | Chi tiết căn hộ: `holdHours`, `activeViewingAt`, `photos` | ✅ |
| `GET /properties/units/:code/busy-slots` (A3) | công khai | Khung giờ đã bận của căn hộ trong 14 ngày | ✅ |
| `POST /auth/otp/send` (A4) | công khai | Gửi OTP SĐT (purpose: `TENANT_VIEWING`, cooldown 30s) | ✅ |
| `POST /auth/otp/verify` (A5) | công khai | Xác thực OTP → sinh `actionToken` dùng 1 lần (15 phút) | ✅ |
| `POST /bookings` (A6) | tenant | Đặt lịch xem phòng với `actionToken` hợp lệ | ✅ |
| `GET /me/bookings` (A7) | tenant | Danh sách lịch xem của tôi (chỉ xem lịch thuộc tài khoản) | ✅ |
| `GET /bookings/:ref` (A8) | tenant | Chi tiết lịch xem (timeline 7 bước, DTO TenantBooking) | ✅ |
| `POST /bookings/:ref/cancel` (A9) | tenant | Huỷ lịch xem phòng (trước ≥ 2h) | ✅ |
| `POST /bookings/:ref/reschedule` (A10) | tenant | Đổi giờ xem phòng (trước ≥ 2h, kiểm tra slot bận) | ✅ |
| `POST /bookings/:ref/late` (A11) | tenant | Báo xin đến muộn 10 phút | ✅ |
| `POST /bookings/:ref/lobby-checkin` (A12) | tenant | Bấm "Tôi đã có mặt tại sảnh" | ✅ |
| `POST /bookings/:ref/rating` (A13) | tenant | Chấm sao đánh giá Field Host | ✅ |
| `GET /legal/deposit-terms` (A14) | công khai | Văn bản điều khoản cọc, 6 nội quy BQL, phiên bản pháp lý | ✅ |
| `POST /bookings/:ref/deposit` (A15) | tenant | Khách tick đồng ý điều khoản cọc → sinh VietQR động 2 triệu | ✅ |
| `POST /deposits/webhook-vietqr` · `/mark-paid` (A16) | ngân hàng/host | First-to-Pay Wins: khoá holding, huỷ lịch trùng, gợi ý 2 căn | ✅ |
| `POST /identity/ekyc/scan` (A17) | tenant | Quét CCCD 1 bước (Zero-Storage, không upload ảnh) | ✅ |
| `POST /identity/ekyc` (A18) | tenant | Xác nhận trường CCCD + 3 điều khoản thuê → xác lập HĐ | ✅ |
| `GET /me/contracts` (A19) | tenant | Danh sách hợp đồng thuê: thời hạn, cọc, tiền thanh toán kỳ 1 | ✅ |
| `GET /me/contracts/:id/pdf` (A20) | tenant | Tải PDF HĐ thuê chính thức tiếng Việt có niêm phong sha256 | ✅ |
| `GET/PUT/DELETE /me/favorites[/:code]` | đăng nhập | Căn đã lưu theo tài khoản (bảng `favorite_units`), nhận mã căn hoặc UUID, trả DTO `TenantUnit` | ✅ |
| `POST /demo/bookings/:ref/step` (A21) | demo | Giả lập thao tác Host/Bank phục vụ trình diễn | ✅ |

### 1.3. 🏠 Chủ nhà

Màn: tổng quan, căn của tôi, ký gửi căn mới, hồ sơ ký gửi, tài chính, yêu cầu thoát uỷ quyền, tài khoản.

| Endpoint | Vai | Màn hình / bước nghiệp vụ | TT |
|---|---|---|---|
| `GET /landlord/dashboard` | landlord | tổng quan | ⚠️ bản tối thiểu, UI làm sau |
| `GET /landlord/units` | landlord | danh sách căn đã ký gửi (trạng thái căn + ủy quyền, giá hiện hành) | ✅ |
| `GET /landlord/units/:id` | landlord | chi tiết căn **gồm luôn** `viewings` + `doorAudit`: All-in, ủy quyền + ngày gia hạn, giữ chỗ, HĐ đang chạy (không có mã cửa); các truy vấn chạy song song, phí và danh bạ Host cache 60 giây | ✅ |
| `GET /landlord/units/:id/viewings` | landlord | nhật ký xem phòng (khách bị che SĐT) | ✅ |
| `GET /landlord/units/:id/audit-trail` | landlord | nhật ký mở cửa của căn (lọc theo căn) | ✅ |
| `GET /landlord/consignments` · `GET /landlord/consignments/:id` | landlord | hồ sơ ký gửi + kết quả thẩm định | ✅ |
| `POST /landlord/consignments` `{building, floor, door, layout, areaM2, askRent, suggestedDeposit, leaseTerm (mid\|long\|fixed), furnished, locks[], doorCode, note, draft}` | landlord | form ký gửi căn → tạo Unit `UNLISTED` + ủy quyền `PENDING_INSPECTION` (draft) | ✅ |
| `POST /landlord/consignments/:id/photos` (multipart `files`) · `DELETE /landlord/consignments/:id/photos/:photoId` | landlord | đính kèm/xóa ảnh tham khảo của hồ sơ: JPG/PNG/WebP (kiểm tra theo nội dung file), ≤3MB/ảnh (web nén ảnh trước khi gửi), tối đa 8 ảnh; chỉ khi hồ sơ còn nháp hoặc chờ Host nhận. Lưu Supabase Storage bucket **private** `consignment-photos` (tự tạo lần đầu), xem qua link ký 1 giờ. **Không** ghi vào `UnitMedia` — ảnh Verified do Host chụp khi thẩm định | ✅ |
| `POST /landlord/consignments/:id/send-otp` `{phone?}` | landlord | gửi OTP Zalo tới SĐT đã lưu của chủ nhà (chưa có SĐT thì dùng `phone` truyền lên) | ✅ |
| `POST /landlord/consignments/:id/sign` `{ownershipWarranted, otp, phone?}` | landlord | ký ủy quyền bằng OTP (PHONE_VERIFY); số ĐÃ XÁC THỰC của tài khoản ⇒ KHÔNG cần OTP (`send-otp` trả `otpRequired:false`); nhập số khác hoặc tài khoản chưa có số ⇒ bắt buộc OTP trên số đó. Số ký lưu mã hoá trong hồ sơ ký gửi, KHÔNG gắn vào tài khoản, không kiểm trùng; → giao Inspector phân khu, SLA 48h | ✅ |
| `GET /landlord/finance` | landlord | khoản thu: tháng này, 6 tháng, theo căn, cọc giữ hộ; phí dịch vụ đọc từ FeeConfig `landlord_service_fee_rate` (chưa có ⇒ 5% tạm, `feeSource: "default"`) | ✅ tính từ hợp đồng |
| `POST /landlord/mandates/request-exit` `{mandateId, reason}` · `POST /landlord/mandates/cancel-exit` `{mandateId}` | landlord | thoát ủy quyền: chỉ khi căn `AVAILABLE`, báo trước 15 ngày | ✅ (chưa có job thu hồi mã cửa khi hết hạn) |

Mọi route `/landlord/*` có `@Roles('landlord')`; `landlordId` lấy từ phiên, căn của người khác trả 404.
Hồ sơ ký gửi lưu phần mở rộng (giá cọc đề xuất, nội thất, hạn thẩm định, báo cáo…) trong `ExclusiveMandate.doorAccessConfig.consignment`; mã cửa lưu mã hóa ở `DoorAccessKey.vaultSecretRef` (`aes:` + AES-256-GCM), không trả lại qua API.

### 1.4. 🚶 Field Host (Sale / Inspector)

Màn: bảng điều phối, buổi xem phòng, thẩm định căn ký gửi, thu nhập, cẩm nang, tài khoản.

| Endpoint | Vai | Màn hình / bước nghiệp vụ | TT |
|---|---|---|---|
| `GET /host/board` | field_host (sale) | **Lịch & yêu cầu**: yêu cầu mới (ASSIGNED 3′ → Open Pool phân khu → mọi Sale) · lịch của tôi · lịch sử · KPI — 1 request, web poll 15″ | ✅ |
| `POST /host/tickets/:id/accept` · `/reject` `{reason}` · `/claim` | field_host (sale) | nhận ticket được giao / từ chối (giao Sale khác) / nhận trong Open Pool (nguyên tử, ai nhận trước thắng) | ✅ |
| `GET /host/viewings/:ref` | field_host (sale) | chi tiết ca — chỉ chủ ca (khác ⇒ 404), có SĐT đầy đủ của khách | ✅ |
| `POST /host/viewings/:ref/remind` · `/receive` · `/no-show` | field_host (sale) | nhắc T-10 (chỉ ghi mốc) · đã đón khách ở sảnh · khách không đến (≥ giờ hẹn + 15′) | ✅ |
| `POST /host/viewings/:ref/open-door` · `/door-code` | field_host (sale) | [Mở cửa] ca RECEIVING → VIEWING, trả mã cửa hiển thị 10′ + ghi `DOOR_KEY_REVEAL` cho chủ nhà; thiếu mã ⇒ 409 `door_code_missing` (không có PIN giả) | ✅ |
| `POST /host/viewings/:ref/start-deposit` · `/not-interested` `{reason}` · `/emergency` | field_host (sale) | khách muốn cọc (⇒ CLOSING, khách tự quét VietQR — Host không đụng tiền) · khách chưa quyết · báo sự cố khoá/chìa (chỉ ghi nhật ký) | ✅ |
| `PATCH /host/me/duty` `{status}` | field_host (sale) | bật/tắt trực (đang dẫn khách ⇒ 409 `host_busy`) | ✅ |
| `GET /host/inspections` · `GET /host/inspections/:id` | field_host (inspector) | **Thẩm định ký gửi** (hồ sơ 16): ca giao cho tôi + Open Pool (sau 4h chưa nhận) + đã nộp; chi tiết kèm catalog 32 hạng mục, ảnh tham khảo chủ nhà, ảnh đã chụp | ✅ |
| `POST /host/inspections/:id/accept` · `/claim` · `/door-code` | field_host (inspector) | nhận ca được giao · nhận ca Open Pool (nguyên tử) · lấy mã cửa (hiển thị 10′, ghi `DOOR_KEY_REVEAL`; thiếu mã ⇒ 409 `door_code_missing`) | ✅ |
| `POST /host/inspections/:id/photos` (multipart `file`, `slot`, `room?`) · `DELETE .../photos/:photoId` | field_host (inspector) | ảnh hạng mục (1–4/dòng) + ảnh niêm yết (4–12); kiểm theo nội dung, cạnh ngắn ≥200px, ≤3MB; bucket private, đường dẫn `inspections/<mandateId>/…` | ✅ |
| `POST /host/inspections/:id/submit` | field_host (inspector) | nộp phiếu 32 hạng mục. **Đạt ⇒ một giao dịch tự niêm yết** (ủy quyền ACTIVE, căn AVAILABLE + Verified, ảnh niêm yết vào `UnitMedia`) — KHÔNG qua Admin; không đạt ⇒ ủy quyền TERMINATED. Lỗi phiếu ⇒ 400 `report_invalid` kèm `field` | ✅ |
| `GET /media/listing/:mandateId/:file` | public | ảnh niêm yết của căn đã đạt (ảnh hạng mục/hồ sơ chưa đạt ⇒ 404), cache 1 ngày | ✅ |
| `GET /host/inspections` | field_host (inspector) | danh sách căn ký gửi cần thẩm định | ⬜ |
| `POST /host/inspections/:consignmentId/accept` | field_host | nhận việc thẩm định | ⬜ |
| `POST /host/inspections/:consignmentId/report` | field_host | nộp báo cáo: đối chiếu thông tin khai báo, kiểm kê nội thất có ảnh + % độ mới, diện tích thông thuỷ, đề xuất duyệt/từ chối | ⬜ |
| `POST /handovers` · `GET /handovers/contracts/:contractId` | field_host / tenant | Hộ chiếu bàn giao số 10 hạng mục + công tơ điện nước | ✅ |
| `GET /host/earnings` | field_host | thu nhập: lượt dẫn, hoa hồng, thưởng | ⬜ |

### 1.5. ⚙️ Admin

Màn: tổng quan, rổ hàng ký gửi, lịch hẹn & điều phối, sổ hợp đồng (mẫu, bên ký), Field Host, biến phí, cài đặt.

| Endpoint | Vai | Màn hình / bước nghiệp vụ | TT |
|---|---|---|---|
| `GET /admin/bi-funnel` | ops_admin | tổng quan: phễu chuyển đổi, tỉ lệ no-show, heatmap lấp đầy | ✅ |
| `GET /admin/exclusive-inventory` | ops_admin | rổ hàng ký gửi | ✅ |
| `POST /admin/consignments/:id/approve` · `/reject` `{note}` | ops_admin | duyệt / từ chối hồ sơ ký gửi sau thẩm định | ⬜ |
| `GET /admin/dispatch-sla` | ops_admin | lịch hẹn & cảnh báo quá SLA | ✅ |
| `POST /admin/bookings/:id/reassign` `{hostId}` | ops_admin | điều phối tay sang Host khác | ⬜ |
| `GET /admin/contracts` · `GET /admin/contracts/:id` | ops_admin | sổ hợp đồng: uỷ quyền, giữ chỗ, thuê, hợp tác Host | ⬜ |
| `POST /admin/contracts/:id/void-hold` `{reason: landlord_breach \| force_majeure, note}` | ops_admin | huỷ cọc giữ chỗ (chủ nhà vi phạm / bất khả kháng) | ⬜ |
| `POST /admin/contracts/:id/complete-exit` | ops_admin | hoàn tất thoát uỷ quyền sau 15 ngày | ⬜ |
| `POST /admin/contracts/:id/remind-renewal` | ops_admin | nhắc gia hạn HĐ thuê sắp hết hạn | ⬜ |
| `GET /admin/contract-templates[/:id]` · `GET /admin/contract-parties[/:id]` | ops_admin | thư viện mẫu văn bản, danh bạ bên ký | ⬜ |
| `GET /admin/field-hosts` `?q&role=sale\|inspector\|both&zone&active=true\|false` | ops_admin | danh sách Field Host (tìm theo tên/email/SĐT, lọc vai, phân khu, tài khoản khoá) | ✅ |
| `GET /admin/field-hosts/zones` | ops_admin | phân khu hợp lệ để gán cho Host | ✅ |
| `POST /admin/field-hosts` `{email, fullName, assignedZone, roles[1..2], password?}` | ops_admin | Admin tạo Host: Profile `field_host` + hồ sơ Host cùng 1 giao dịch. Không có SĐT (Host tự xác thực OTP), không có số thẻ. Email là Profile `field_host` chưa có hồ sơ Host ⇒ nhận vào. Bỏ `password` ⇒ Host chỉ đăng nhập Google | ✅ |
| `GET /admin/field-hosts/:id` | ops_admin | hồ sơ Host + `ticketStats` (7 trạng thái ticket); thu nhập/lịch xem chi tiết ở hồ sơ 15 | ✅ |
| `PATCH /admin/field-hosts/:id` `{fullName?, assignedZone?, roles?, password?, isActive?}` | ops_admin | sửa tên/phân khu, đổi vai (AuditLog `HOST_ROLES_UPDATE`), đặt lại mật khẩu, khoá/mở. Email không sửa được. Phiên của Host đọc lại ngay | ✅ |
| `DELETE /admin/field-hosts/:id` | ops_admin | khoá mềm (giữ lịch sử ticket/cọc/chi trả); Host đang có ticket OFFERED/ACCEPTED/CHECKED ⇒ 409 `host_has_active_tickets` | ✅ |
| `GET /admin/commission-engine` · `POST /admin/commission-engine/config` | ops_admin | cấu hình biến phí + nhật ký thay đổi | ✅ |
| `GET /admin/settings/hold-policy` · `PUT /admin/settings/hold-policy` `{unitId?, hours}` | ops_admin | thời hạn giữ chỗ toàn sàn / riêng từng căn + nhật ký | ⬜ |
| `GET /contracts/:id/evidence-package` | ops_admin | gói chứng cứ hợp đồng | ✅ |

### 1.6. ⏱ Tác vụ nền (không có màn hình)

| Tác vụ | Kích hoạt | TT |
|---|---|---|
| Nhắc hẹn kép T-10m (push Host + Zalo 1-chạm cho khách) | lịch hẹn `confirmed` | ⬜ |
| Leo thang điều phối 3 tầng khi ticket quá 3 phút chưa nhận | ticket chưa nhận | ⬜ |
| Hết hạn giữ chỗ → xử lý mất cọc 50/50, mở lại căn `available` | hết thời hạn `holding` | ⬜ |
| Đếm ngược thoát uỷ quyền 15 ngày → ngừng niêm yết, thu hồi mã cửa | yêu cầu thoát | ⬜ |
| Cảnh báo quá hạn thẩm định ký gửi | hồ sơ chờ thẩm định | ⬜ |

---

## 2. CẤU TRÚC THƯ MỤC SOURCE CODE

```
backend/
├── prisma/
│   ├── schema.prisma          # 27 model (IAM/Auth, Property, Door Key, Mandate, Viewing/Dispatch, VietQR, eKYC, E-Sign, Handover, Payout, Audit)
│   ├── seed.ts                # Dữ liệu khởi tạo (Sapphire 1 & 2, Field Host, căn mẫu, Fee Configs)
│   └── legacy/                # drop_web_schema.sql — gỡ schema cũ của apps/web
│
├── src/
│   ├── main.ts                # Entrypoint, Swagger UI, cookie-parser, Global Pipes, CORS
│   ├── app.module.ts          # Root Module
│   ├── prisma/                # PrismaService & PrismaModule (Global)
│   ├── supabase/              # SupabaseService (Auth & Storage)
│   ├── testing/               # Tiện ích test
│   │
│   ├── common/
│   │   ├── decorators/        # @CurrentUser, @Roles, @Public
│   │   ├── guards/            # SupabaseAuthGuard, RolesGuard
│   │   ├── filters/           # HttpExceptionFilter
│   │   └── interceptors/      # LoggingInterceptor, TransformInterceptor
│   │
│   └── modules/
│       ├── auth/              # Đăng nhập, Google, phiên (kèm `hostRoles`), OTP Zalo (§4)
│       ├── field-hosts/       # Admin CRUD Field Host + vai Sale/Thẩm định (§1.5)
│       ├── property/          # Toà, căn hộ, All-in Cost
│       ├── matchmaker/        # AI Matchmaker & badge "Căn hời"
│       ├── booking/           # Lịch xem, check-in sảnh
│       ├── dispatch/          # DispatchAssignerService (chọn Sale), tầng 3 lớp tính lúc đọc — route `/dispatch/*` giả đã xoá (hồ sơ 15)
│       ├── host-viewings/     # Cổng Sale `/host/board|tickets|viewings` — ViewingFlowService là nguồn duy nhất chuyển trạng thái ca (hồ sơ 15)
│       ├── door/              # DoorCodeService: mã cửa `aes:<AES-256-GCM>` (`npm run rekey:door-codes`)
│       ├── deposit/           # VietQR cọc giữ chỗ, webhook, Conflict Resolver
│       ├── identity/          # eKYC CCCD
│       ├── contract/          # Mandate, gói chứng cứ
│       ├── landlord/          # Dashboard, audit trail, thoát uỷ quyền
│       ├── handover/          # Hộ chiếu bàn giao số
│       ├── admin/             # BI funnel, rổ hàng, SLA điều phối, biến phí
│       └── audit/             # Audit Service append-only
│
├── .env.example
├── docker-compose.yml         # PostgreSQL & Redis local dev
├── package.json
└── tsconfig.json
```

Các endpoint ⬜ ở §1 dự kiến thêm vào module sẵn có (`booking`, `dispatch`, `deposit`, `landlord`, `admin`); `/me/*`
và `/host/*` cần module mới (`account`, `host`).

---

## 3. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY

### Bước 1: Cài đặt thư viện dependencies

```bash
cd backend
npm install
```

### Bước 2: Cấu hình biến môi trường

```bash
cp .env.example .env
```

_(Nếu đã kết nối Supabase Cloud, điền `DATABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`. Nếu chạy local dev offline, khởi chạy Docker Compose)._

### Bước 3: Khởi chạy Database local (Tùy chọn nếu không dùng Supabase Cloud)

```bash
docker compose up -d
```

### Bước 4: Tạo Client & Seed dữ liệu mẫu

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### Bước 5: Khởi chạy Backend Server ở chế độ Development

```bash
npm run start:dev
```

- **Backend API Base URL:** `http://localhost:4000/api/v1`
- **Swagger UI Interactive Documentation:** `http://localhost:4000/api/docs`

### Bước 6: Tài khoản & đăng nhập

```bash
npm run create:admin -- you@example.com 'mat-khau-manh' "Ten"   # Admin (không có đăng ký trên UI)
npm run seed:auth                # admin dev (Field Host do Admin tạo ở /admin/hosts)
npm run seed:auth -- --demo      # thêm 4 tài khoản demo (Host demo có cả 2 vai); bật AUTH_DEMO_MODE=true để dùng nút 1-click
npm run smoke:sale-auth          # 17 bước đăng nhập Host + Admin CRUD Host (backend đang chạy, AUTH_DEMO_MODE=true; tự dọn dữ liệu sale.smoke+)
npm test                         # unit + HTTP test (Prisma/Supabase giả)
```

## 4. ĐĂNG NHẬP & PHÂN QUYỀN (`modules/auth`)

Toàn bộ đăng nhập nằm ở backend; `apps/web` chỉ có form và proxy `/api/v1/*` → backend.
Phiên là **cookie httpOnly** (`vs_access`, SameSite=Lax) do backend set — response không chứa token.
**Không dùng Supabase Auth** (bảng `auth.users` không liên quan): email + mật khẩu kiểm tra ngay trong bảng `public.profiles`
(`password_hash` = scrypt `scrypt$<salt>$<hash>`, NULL với tài khoản chỉ dùng Google; Prisma omit toàn cục nên cột này không
bao giờ lộ ra response của module khác). Cả hai cách đăng nhập (mật khẩu, Google/Passport) đều phát JWT phiên do backend tự ký
(HS256, `iss=vinstay-backend`, sống 7 ngày, không có refresh token — hết hạn thì đăng nhập lại). **Đăng ký không xác nhận email**:
tạo Profile rồi đăng nhập luôn; email đã có tài khoản (kể cả Google) → 409, không bao giờ đặt mật khẩu lên tài khoản có sẵn.
API client có thể dùng `Authorization: Bearer <token>`. Vai trò đọc từ DB (`profiles.role`). Supabase chỉ còn dùng cho
Postgres + Storage ảnh hồ sơ ký gửi.

Hai cổng đăng nhập trên UI: `/login` (Khách thuê / Chủ nhà) và `/admin/login` (Field Host – Sale / Thẩm định · Quản trị).

| Endpoint | Mô tả |
|---|---|
| `POST /auth/login` `{email,password,portal}` | portal = tenant / landlord / host / admin |
| `POST /auth/signup` | tenant / landlord — đăng ký xong đăng nhập luôn, không xác nhận email. Host/Admin ⇒ 403 `signup_not_allowed` |
| `POST /auth/demo-login` | đăng nhập 1-click tài khoản demo (chỉ khi `AUTH_DEMO_MODE=true`) |
| `GET /auth/google?portal=` → `GET /auth/google/callback` | Google OAuth (Passport; `state` = `portal.nonce`, nonce nằm trong cookie httpOnly `vs_oauth`; luôn hiện màn chọn tài khoản; nhận `login_hint=<email>` để chọn sẵn tài khoản; thành công thì set cookie không-httpOnly `vs_google_hint` {name,email} để FE hiện "Tiếp tục bằng tên …") |
| `GET /auth/session`, `POST /auth/logout` | phiên hiện tại, đăng xuất (xoá cookie) |
| `npm run set:password -- <email> <mật khẩu>` | script đặt/đặt lại mật khẩu cho Profile có sẵn (tài khoản cũ chưa có `password_hash`); `create:admin` / `seed:auth` chỉ tạo mới |
| `GET /host/me` | Field Host xem hồ sơ của chính mình (vai, phân khu, SĐT đã xác thực, ca trực). Không có số thẻ/mật khẩu |
| `POST /auth/otp/send`, `/otp/verify`, `/phone/verify` | OTP xác thực SĐT (không phải đăng nhập); Khách thuê nhận action token dùng một lần |
| `/admin/field-hosts` (ops_admin) | Admin CRUD Field Host — xem §1.5. Host chỉ đăng nhập (email+mật khẩu hoặc Google); Profile `field_host` chưa có hồ sơ Host ⇒ 403 `host_not_provisioned`. Vai con: `@HostRoles('sale' \| 'inspector')` (guard `RolesGuard`, lỗi `host_role_missing`) |

Portal `host` ↔ role `field_host`, `admin` ↔ `ops_admin`. Google: điền `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`JWT_SECRET` trong `.env`
và thêm `${WEB_APP_URL}/api/v1/auth/google/callback` vào *Authorized redirect URIs* của OAuth client (Google Cloud Console) — không cần
cấu hình gì ở Supabase Dashboard. Cùng email đã đăng ký bằng mật khẩu thì Google dùng chung Profile đó. Schema là nguồn chân lý duy nhất ở `prisma/schema.prisma`
(`prisma/legacy/drop_web_schema.sql` gỡ schema cũ của apps/web nếu DB từng áp migration đó).
