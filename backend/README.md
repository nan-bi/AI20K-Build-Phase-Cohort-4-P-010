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

### 1.1. 👤 Công khai & Khách thuê

Màn: trang chủ chat AI, danh sách/chi tiết căn, đặt lịch & theo dõi lịch hẹn, tài khoản (lịch hẹn, căn đã lưu, hợp đồng).

| Endpoint | Vai | Màn hình / bước nghiệp vụ | TT |
|---|---|---|---|
| `GET /properties/buildings` | công khai | bộ lọc toà | ✅ |
| `GET /properties/units` | công khai | danh sách căn — lọc, All-in Cost, badge "Căn hời" | ✅ |
| `GET /properties/units/:id` | công khai | chi tiết căn | ✅ |
| `POST /matchmaker/recommend` | công khai | chat AI: nhu cầu (ngân sách trần, layout, phân khu, tầng, nội thất, thú cưng, số người/xe) → gợi ý căn | ✅ |
| `POST /auth/otp/send` · `POST /auth/otp/verify` | công khai | xác thực SĐT trước khi đặt lịch | ✅ |
| `POST /bookings` `{unitId, slot, name, phone, persons, note}` | tenant | form đặt lịch xem — tạo lịch và điều phối Host | ⬜ |
| `GET /bookings/:id` · `GET /bookings/by-ref/:ref` | tenant | màn theo dõi lịch hẹn (tra theo mã lịch) | ✅ / ⬜ |
| `POST /bookings/:id/cancel` `{reason}` · `POST /bookings/:id/reschedule` `{slot}` | tenant | huỷ / đổi lịch | ⬜ |
| `POST /bookings/:id/lobby-checkin` | tenant | nút 1-chạm "Tôi đã có mặt tại sảnh" | ✅ |
| `POST /bookings/:id/rating` `{stars}` | tenant | đánh giá Host sau buổi xem | ⬜ |
| `GET /deposits/:id` | tenant | trạng thái cọc, đếm ngược giữ chỗ | ✅ |
| `POST /identity/ekyc/verify` | tenant | chụp CCCD 2 mặt + chân dung; trường có độ tin cậy < 85% chuyển nhập tay | ⚠️ cần trả độ tin cậy theo từng trường |
| `GET /me/bookings` · `GET /me/contracts` | tenant | tài khoản: lịch hẹn, hợp đồng + Hộ chiếu bàn giao | ⬜ |
| `GET /me/favorites` · `PUT/DELETE /me/favorites/:unitId` | tenant | căn đã lưu | ⬜ |
| `PATCH /me/profile` | mọi vai | hồ sơ tài khoản | ⬜ |
| `GET /me/notifications` | mọi vai | thông báo trong app | ⬜ |

### 1.2. 💳 Thanh toán (VietQR)

| Endpoint | Vai | Màn hình / bước nghiệp vụ | TT |
|---|---|---|---|
| `POST /deposits/generate-vietqr` | field_host | Host bấm [Khách chốt] → sinh VietQR động `COC [Mã căn] [SĐT]` | ⚠️ đổi caller thành Host |
| `POST /deposits/webhook-vietqr` | ngân hàng | gạch nợ cọc → khoá `holding`, Conflict Resolver huỷ lịch trùng + gợi ý căn thay thế | ⚠️ thời hạn theo cấu hình giữ chỗ |
| `POST /deposits/:id/host-receipt` | field_host | Host tải ủy nhiệm chi khi webhook chậm (giữ tạm) | ⬜ |

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
| `POST /landlord/consignments/:id/sign` `{ownershipWarranted, otp, phone?}` | landlord | ký ủy quyền bằng OTP (PHONE_VERIFY); hồ sơ chưa có SĐT thì OTP đúng đồng thời gắn SĐT; → giao Host phân khu, SLA 48h | ✅ |
| `GET /landlord/finance` | landlord | khoản thu: tháng này, 6 tháng, theo căn, cọc giữ hộ; phí dịch vụ đọc từ FeeConfig `landlord_service_fee_rate` (chưa có ⇒ 5% tạm, `feeSource: "default"`) | ✅ tính từ hợp đồng |
| `POST /landlord/mandates/request-exit` `{mandateId, reason}` · `POST /landlord/mandates/cancel-exit` `{mandateId}` | landlord | thoát ủy quyền: chỉ khi căn `AVAILABLE`, báo trước 15 ngày | ✅ (chưa có job thu hồi mã cửa khi hết hạn) |

Mọi route `/landlord/*` có `@Roles('landlord')`; `landlordId` lấy từ phiên, căn của người khác trả 404.
Hồ sơ ký gửi lưu phần mở rộng (giá cọc đề xuất, nội thất, hạn thẩm định, báo cáo…) trong `ExclusiveMandate.doorAccessConfig.consignment`; mã cửa lưu mã hóa ở `DoorAccessKey.vaultSecretRef` (`aes:` + AES-256-GCM), không trả lại qua API.

### 1.4. 🚶 Field Host (Sale / Inspector)

Màn: bảng điều phối, buổi xem phòng, thẩm định căn ký gửi, thu nhập, cẩm nang, tài khoản.

| Endpoint | Vai | Màn hình / bước nghiệp vụ | TT |
|---|---|---|---|
| `GET /dispatch/tickets` | field_host | bảng điều phối: ticket được giao + ticket mở | ⚠️ thêm ticket mở |
| `POST /dispatch/tickets/:id/accept` · `/reject` `{reason}` | field_host | nhận / từ chối ticket (từ chối → điều phối lại) | ✅ / ⬜ |
| `POST /dispatch/tickets/:id/claim` | field_host | nhận ticket mở trong Open Pool | ⬜ |
| `POST /dispatch/tickets/:id/elevator-rfid` | field_host | đón khách ở sảnh, quẹt thẻ thang máy | ✅ |
| `POST /dispatch/tickets/:id/reveal-key` | field_host | [Xác nhận xem phòng] tại cửa → nhận mã cửa, báo chủ nhà | ✅ |
| `POST /dispatch/tickets/:id/emergency` `{kind: smart_lock \| physical_key}` | field_host | hỗ trợ khẩn cấp khi khoá lỗi / mất chìa | ⬜ |
| `POST /dispatch/tickets/:id/no-show` · `/not-interested` `{reason}` | field_host | khách không đến / xem xong chưa thuê | ⬜ |
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
| `GET /admin/field-hosts` | ops_admin | danh sách Field Host | ✅ |
| `POST /admin/field-hosts` `{email, phone, name, assignedZone, roles[], rfidCardNumber?}` | ops_admin | Admin tạo thẳng tài khoản Field Host (không qua lời mời) → hệ thống gửi thông tin đăng nhập + mật khẩu tạm cho Sale qua email; lần đầu đăng nhập bắt buộc đổi mật khẩu | ⚠️ đang là cơ chế mời — phải viết lại |
| `GET /admin/field-hosts/:id` | ops_admin | chi tiết Host: ticket, thẩm định, thu nhập, đánh giá | ⬜ |
| `PATCH /admin/field-hosts/:id` `{name?, phone?, assignedZone?, roles?: (sale \| inspector)[], rfidCardNumber?}` | ops_admin | sửa thông tin, đổi phân khu, phân vai, thay thẻ RFID | ⬜ |
| `DELETE /admin/field-hosts/:id` | ops_admin | khoá Host (xoá mềm — giữ lịch sử ticket, cọc, chi trả) | ⬜ |
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
│       ├── auth/              # Đăng nhập, Google, phiên, OTP Zalo, xác thực RFID, tài khoản Field Host (§4)
│       ├── property/          # Toà, căn hộ, All-in Cost
│       ├── matchmaker/        # AI Matchmaker & badge "Căn hời"
│       ├── booking/           # Lịch xem, check-in sảnh
│       ├── dispatch/          # Ticket điều phối Host, RFID thang máy, cấp mã cửa
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
npm run seed:auth                # admin dev + 2 lời mời Field Host (host1/host2@vinstay.test, RFID-S1-0001/RFID-S2-0001)
npm run seed:auth -- --demo      # thêm 4 tài khoản demo (bật AUTH_DEMO_MODE=true để dùng nút 1-click)
npm test                         # unit + HTTP test (Prisma/Supabase giả)
```

## 4. ĐĂNG NHẬP & PHÂN QUYỀN (`modules/auth`)

Toàn bộ đăng nhập nằm ở backend; `apps/web` chỉ có form và proxy `/api/v1/*` → backend.
Phiên là **cookie httpOnly** (`vs_access`, `vs_refresh`, SameSite=Lax) do backend set — response không chứa token.
Email + mật khẩu dùng token Supabase; **đăng nhập Google chạy bằng Passport, không qua Supabase** và phát JWT phiên do backend
tự ký (HS256, `iss=vinstay-backend`, sống 1 ngày, không có refresh token — hết hạn thì đăng nhập lại). `AuthSessionService` nhận cả hai
loại token. API client có thể dùng `Authorization: Bearer <token>`. Vai trò đọc từ DB (`profiles.role`), không cần Auth Hook.

Hai cổng đăng nhập trên UI: `/login` (Khách thuê / Chủ nhà) và `/admin/login` (Sale – Field Host / Quản trị).

| Endpoint | Mô tả |
|---|---|
| `POST /auth/login` `{email,password,portal}` | portal = tenant / landlord / host / admin |
| `POST /auth/signup` | tenant / landlord — Supabase gửi email xác nhận. Field Host không tự đăng ký: Admin tạo tài khoản (§1.5) |
| `POST /auth/demo-login` | đăng nhập 1-click tài khoản demo (chỉ khi `AUTH_DEMO_MODE=true`) |
| `GET /auth/google?portal=` → `GET /auth/google/callback` | Google OAuth (Passport; `state` = `portal.nonce`, nonce nằm trong cookie httpOnly `vs_oauth`; luôn hiện màn chọn tài khoản) |
| `GET /auth/session`, `POST /auth/refresh`, `POST /auth/logout` | phiên hiện tại (tự refresh), làm mới, đăng xuất |
| `POST /auth/verify-rfid` | Field Host nhập RFID lần đầu; chưa xong thì bị chặn mọi quyền Host |
| `POST /auth/otp/send`, `/otp/verify`, `/phone/verify` | OTP xác thực SĐT (không phải đăng nhập); Khách thuê nhận action token dùng một lần |
| `/admin/field-hosts` (ops_admin) | quản lý Field Host — xem §1.5 |

Portal `host` ↔ role `field_host`, `admin` ↔ `ops_admin`. Google: điền `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`JWT_SECRET` trong `.env`
và thêm `${WEB_APP_URL}/api/v1/auth/google/callback` vào *Authorized redirect URIs* của OAuth client (Google Cloud Console) — không cần
cấu hình gì ở Supabase Dashboard. Cùng email đã đăng ký bằng mật khẩu thì Google dùng chung Profile đó. Schema là nguồn chân lý duy nhất ở `prisma/schema.prisma`
(`prisma/legacy/drop_web_schema.sql` gỡ schema cũ của apps/web nếu DB từng áp migration đó).
