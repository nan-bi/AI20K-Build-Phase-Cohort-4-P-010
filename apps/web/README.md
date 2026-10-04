# VinStay AI — Web (Next.js)

Giao diện 4 cổng (Khách thuê, Chủ nhà, Field Host, Admin). **Cổng Chủ nhà và Khách thuê đã nối backend NestJS thật** (`/api/v1/*`); cổng Field Host và Admin vẫn dùng mock cho dữ liệu nghiệp vụ (thu nhập, hợp đồng, màn Admin ký gửi…), nhưng **đăng nhập Field Host, vai Sale/Thẩm định, `/host/account` và `/admin/hosts` đã dùng API thật** (hồ sơ 14).

## Chạy

```bash
pnpm install && pnpm dev   # http://localhost:3000 (yêu cầu backend NestJS chạy tại :4000)
```

| Lệnh | Mục đích |
|---|---|
| `pnpm dev` / `build` / `start` | Chạy dev / Build Turbopack / Chạy production |
| `pnpm lint` / `typecheck` / `test` | ESLint (0 lỗi) / TypeScript typecheck / Vitest (201/201 tests pass) |

## Kiến trúc 4 cổng

### 1. Cổng Khách thuê (Tenant Portal) — Đã nối backend thật 100%
- **Catalog căn hộ (`/units`, `/units/[id]`)**: Nối API A1 và A2 (`/properties/units`), tính toán All-in Cost thời gian thực và tự động gắn huy hiệu "Căn hời phân khu" (tiết kiệm $\ge 10\%$). Mã căn không có trong DB trả 404 (không còn rơi về danh sách mock); căn tương tự, nhãn HOT/FOMO, thời hạn giữ chỗ đều đọc từ DB.
- **Chat AI, trang chủ, bộ lọc**: Matchmaker, "Căn hời tuần này", thống kê phân khu và căn minh hoạ All-in chạy trên catalog thật qua hook `useCatalog` (`src/lib/tenant/catalog.ts`). Chỉ nội dung hội thoại chat còn lưu ở trình duyệt.
- **Căn đã lưu (tim)**: lưu theo tài khoản trong DB (`/me/favorites`, hook `useFavorites`); khách chưa đăng nhập bấm tim được chuyển sang đăng nhập.
- **Đặt lịch xem phòng (`BookingSheet`, `SlotPicker`)**: Khung giờ bận đọc từ A3 (`/properties/units/:code/busy-slots`, nguồn duy nhất để khoá giờ), xác thực OTP SĐT qua Zalo A4/A5 (`/auth/otp/send`, `/auth/otp/verify`), tạo lịch xem A6 (`/bookings`).
- **Trạng thái lịch hẹn (`/booking/[ref]`)**:
  - Timeline tiến trình 7 bước A8 (`/bookings/:ref`).
  - Đổi giờ A10, Huỷ lịch A9, Báo trễ 10′ A11, Có mặt tại sảnh A12, Đánh giá Host A13.
  - Công cụ Demo Host A21 (`NEXT_PUBLIC_DEMO_TOOLS=true`): host nhận lịch, gửi nhắc hẹn Zalo, đón tại sảnh, mở cửa xem phòng, chốt cọc.
  - **Điều khoản cọc & VietQR**: Đọc điều khoản A14 (`/legal/deposit-terms`), khách tick đồng ý Điều 328 BLDS $\rightarrow$ sinh VietQR động 2.000.000đ A15 (`/bookings/:ref/deposit`).
  - **eKYC 1 bước (Zero-Storage)**: Chụp 2 mặt CCCD và chân dung xử lý tại chỗ trên trình duyệt (tuyệt đối không upload ảnh CCCD lên server). Gọi A17 (`/identity/ekyc/scan`), xác nhận thông tin CCCD và 3 trường điều khoản thuê (ngày dọn vào, số tháng $\ge$ tối thiểu, kỳ thanh toán 1/3/6 tháng) $\rightarrow$ A18 (`/identity/ekyc`) xác lập HĐ thuê chính thức và chuyển trạng thái căn sang `leased`.
  - **Hợp đồng & PDF**: Xem tóm tắt hợp đồng, số tiền kỳ 1 cần thanh toán (tiền thuê kỳ 1 + bù cọc bảo đảm, khoản 2 triệu chuyển đổi 100% vào cọc bảo đảm tài sản). Nút tải PDF A20 (`/api/v1/me/contracts/:id/pdf`).
- **Tra cứu & Tài khoản**:
  - Tra cứu lịch hẹn `/booking`: Danh sách lịch xem từ A7 (`/me/bookings`), tìm kiếm theo mã `VS-XXXXX` qua A8.
  - Lịch xem của tôi `/account/bookings`: Phân tách tab "Sắp tới" / "Đã qua" bằng hàm thuần `splitTenantBookings`.
  - Hợp đồng & tiền cọc `/account/contracts`: Danh sách hợp đồng A19 (`/me/contracts`), trạng thái `active/expiring/ended`, link tải PDF A20, danh bạ thợ kỹ thuật ngoài.
  - Hồ sơ cá nhân `/account`: Đồng bộ hồ sơ qua `/me/profile`, hiển thị trạng thái eKYC gần nhất từ A7.

### 2. Cổng Chủ nhà (Landlord Portal) — Đã nối backend thật
- Quản lý danh sách căn hộ (`/landlord/units`), chi tiết căn (`/landlord/units/[id]`).
- Quy trình ký gửi căn hộ độc quyền 12 tháng (`/landlord/consign`): nhập thông tin $\rightarrow$ nén và tải ảnh $\rightarrow$ xác thực OTP Zalo $\rightarrow$ ký số thỏa thuận ký gửi.
- Hồ sơ ký gửi (`/landlord/consignments/[id]`), tài chính (`/landlord/finance`), yêu cầu thoát ủy quyền (`/landlord/exit-request`).

### 3. Cổng Field Host & Admin — Mock hỗ trợ demo
- **Field Host — phần đã thật (hồ sơ 14)**: tab Field Host ở `/admin/login` chỉ có đăng nhập (email + mật khẩu hoặc Google; tài khoản do Admin tạo, không có đăng ký/nhập RFID); menu và RoleGate theo vai Sale/Thẩm định lấy từ `GET /auth/session`; `/host/account` đọc `GET /host/me` và Host tự xác thực SĐT bằng OTP; Host chưa có hồ sơ bị `proxy.ts` đưa về trang đăng nhập (`host_not_provisioned`).
- **Admin — phần đã thật (hồ sơ 14)**: `/admin/hosts` (danh sách, lọc, thêm Host, không có ô SĐT/thẻ RFID) và `/admin/hosts/[id]` (đổi vai, sửa tên/phân khu, đặt lại mật khẩu, khoá/mở khoá, thống kê ticket) gọi `/api/v1/admin/field-hosts*`.
- **Field Host — Lịch & yêu cầu (thật, hồ sơ 15)**: `/host/dispatch` đọc `GET /host/board` (poll 15 giây; ticket được giao có đồng hồ 3 phút theo giờ máy chủ, ticket Open Pool nhận bằng "Nhận ticket"; tự ghi nhắc T-10 đúng một lần/ca) và `/host/viewing/[ref]` đọc `GET /host/viewings/:ref` (poll 5 giây): đón khách → mở cửa (mã cửa chỉ nằm trong state, tự ẩn sau 10 phút, "Xem lại mã" ghi audit) → khách muốn cọc / chưa quyết. Host KHÔNG xác nhận thanh toán (khách tự quét VietQR). Công tắc trực gọi `PATCH /host/me/duty`; badge menu lấy từ `kpis.pending`. Chuông thông báo còn là mock (nhãn demo).
- **Field Host — Thẩm định ký gửi (thật, hồ sơ 16)**: `/host/inspections` đọc `GET /host/inspections` (poll 30 giây: Cần làm / Ticket mở / Đã nộp), `/host/inspections/[id]` là phiếu 32 hạng mục + tối đa 10 dòng thêm: lấy mã cửa (tự ẩn 10 phút), mỗi hạng mục 1–4 ảnh (đo độ nét/độ sáng trên máy, nén ≤1600px, tải 3 ảnh song song), bộ 4–12 ảnh niêm yết theo phòng, nháp ở `localStorage`. Nộp Đạt ⇒ căn lên danh sách NGAY, không qua Admin. Chủ nhà xem tiến độ 4 mốc + phiếu có ảnh ở `/landlord/consignments/[id]`. Màn Admin ký gửi (`/admin/inventory`) vẫn mock.
- **Field Host (mock)**: theo dõi thu nhập biến phí (`/host/earnings`).
- **Admin**: Bảng điều khiển rổ hàng (`/admin/inventory`), quản lý lịch hẹn (`/admin/bookings`), quản lý hợp đồng và tranh chấp cọc (`/admin/contracts`), cài đặt hoa hồng biến phí (`/admin/commission`).

## Biến môi trường (`apps/web/.env.local`)

```env
BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_DEMO_TOOLS=true
```

## Route

| Cổng | Route | Trạng thái |
|---|---|---|
| Công khai | `/` (chat AI), `/units`, `/units/[id]` | Đã nối API backend A1–A2 |
| Xác thực | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/admin/login` | Đã nối Auth backend |
| Khách thuê | `/booking`, `/booking/[ref]`, `/account`, `/account/bookings`, `/account/saved`, `/account/contracts` | Đã nối API backend A6–A21 |
| Chủ nhà | `/landlord/dashboard`, `/landlord/units`, `/landlord/units/[id]`, `/landlord/consign`, `/landlord/consignments/[id]`, `/landlord/finance`, `/landlord/exit-request`, `/landlord/account` | Đã nối API backend Landlord |
| Field Host | `/host/dispatch`, `/host/viewing/[id]`, `/host/inspections`, `/host/earnings`, `/host/handbook` | `/host/dispatch`, `/host/viewing/[ref]` đã thật (hồ sơ 15); `/host/inspections*` đã thật (hồ sơ 16); thu nhập/sổ tay còn mock; đăng nhập + vai + `/host/account` đã thật |
| Admin | `/admin/dashboard`, `/admin/inventory`, `/admin/bookings`, `/admin/contracts`, `/admin/commission`, `/admin/settings` | Mock hỗ trợ demo; `/admin/hosts` đã nối API thật |
