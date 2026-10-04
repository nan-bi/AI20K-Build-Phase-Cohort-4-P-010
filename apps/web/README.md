# VinStay AI — Web (Next.js)

Giao diện 4 cổng (Khách thuê, Chủ nhà, Field Host, Admin). **Cổng Chủ nhà và Khách thuê đã nối backend NestJS thật** (`/api/v1/*`); cổng Field Host và Admin tiếp tục dùng mock phục vụ demo vận hành.

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
- **Field Host**: Nhận ticket điều phối tự động 3 tầng (`/host/dispatch`), dẫn khách xem phòng và cấp mã cửa tức thì (`/host/viewing/[id]`), kiểm định bàn giao 10 hạng mục (`/host/inspections`), theo dõi thu nhập biến phí (`/host/earnings`).
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
| Field Host | `/host/dispatch`, `/host/viewing/[id]`, `/host/inspections`, `/host/earnings`, `/host/handbook`, `/host/account` | Mock hỗ trợ demo |
| Admin | `/admin/dashboard`, `/admin/inventory`, `/admin/bookings`, `/admin/contracts`, `/admin/commission`, `/admin/settings` | Mock hỗ trợ demo |
