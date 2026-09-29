# VinStay AI — Web (Next.js)

Giao diện 4 cổng (Khách thuê, Chủ nhà, Field Host, Admin). **Bản MVP hiện chạy hoàn toàn bằng dữ liệu mock**: không gọi
backend, không cần Supabase. Backend NestJS (`../../backend`) đang tạm dừng.

## Chạy

```bash
pnpm install && pnpm dev   # http://localhost:3000
```

| Lệnh | Mục đích |
|---|---|
| `pnpm dev` / `build` / `start` | chạy / build |
| `pnpm lint` / `typecheck` / `test` | ESLint / tsc / Vitest |

## Cách demo hoạt động

- **Đăng nhập (mock)**: hai cổng duy nhất — `/login` có tab Khách thuê/Chủ nhà; `/admin/login` có tab Sale (Field Host)/Quản trị. `/host/login` chỉ chuyển hướng về `/admin/login` (tab Sale mặc định), không còn là lối vào riêng. Tài khoản thử trong `src/lib/mock/auth.ts` (`DEMO_CREDENTIALS`): `minhanh@vinstay.demo` / `hung.nguyen@vinstay.demo` / `0934556201` (mật khẩu `demo1234`, RFID `VS-0412`) / `ops@vinstay.vn` (`admin1234`). Phiên dùng cookie `vs_role=v2.<role>`; `src/proxy.ts` chặn `/account`, `/booking`, `/booking/*`, `/landlord`, `/host`, `/admin` và đưa về đúng trang đăng nhập của cổng. Nút "Demo" ở góc màn hình đổi vai trò tức thì và đặt lại dữ liệu.
- **Một store dùng chung** (`src/lib/mock/store.ts`, localStorage): khách đặt lịch (điều phối tự động 3 tầng) → Host nhận (hoặc claim ticket mở) → khách bấm 'Tôi đã tới sảnh' → Host dẫn, lấy mã cửa → Host báo khách cọc → khách đồng ý điều khoản cọc + VietQR (giữ 7 ngày) → khách eKYC + ký HĐ thuê điện tử (không OTP), mọi vai trò cùng thấy một dòng sự kiện.
  Dữ liệu seed gắn với ngày hiện tại; qua ngày mới sẽ tự dựng lại.
- **Zalo / OTP / VietQR / OCR đều là mô phỏng**: mã OTP hiện ngay trong khung "tin Zalo mô phỏng"; nút "Demo" trong màn Host/khách
  cho phép tua (T-10 phút, ngân hàng báo có, khách bấm có mặt).
- Căn hộ mẫu ở `src/lib/mock/units.ts`, ảnh ở `public/units/` (lấy từ `tech data/caodata`, giá/mã căn đã chuẩn hoá cho demo).
- Logic thuần (All-in Cost, Matchmaker, luồng nghiệp vụ) có test ở `src/tests/`.

## Route

| Cổng | Route |
|---|---|
| Công khai | `/` (chat AI), `/units`, `/units/[id]` |
| Xác thực | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/admin/login` (`/host/login` → chuyển hướng `/admin/login`) |
| Khách thuê (yêu cầu vai `tenant`) | `/booking`, `/booking/[ref]`, `/account`, `/account/bookings`, `/account/saved`, `/account/contracts` |
| Chủ nhà | `/landlord/dashboard`, `/landlord/units`, `/landlord/units/[id]`, `/landlord/consign`, `/landlord/consignments/[id]`, `/landlord/finance`, `/landlord/exit-request`, `/landlord/account` |
| Field Host | `/host/dispatch`, `/host/viewing/[id]`, `/host/inspections`, `/host/inspections/[id]`, `/host/earnings`, `/host/handbook`, `/host/account` (trang cổng nằm trong route group `app/host/(portal)/`) |
| Admin | `/admin/dashboard`, `/admin/inventory`, `/admin/inventory/[id]`, `/admin/bookings`, `/admin/contracts`, `/admin/contracts/[key]`, `/admin/contracts/templates`, `/admin/contracts/templates/[id]`, `/admin/contracts/parties`, `/admin/contracts/parties/[key]`, `/admin/hosts`, `/admin/hosts/[id]`, `/admin/commission`, `/admin/settings` (route group `app/admin/(portal)/`) |

Giao diện dùng hệ token "kinh doanh tối giản" trong `src/app/globals.css` và các primitive ở `src/components/ui/` (`AuthLayout`, `PageHeader`, `Section`, `DataTable`, `StatusBadge`, `EmptyState`, `Field`, `PasswordInput`, `KeyValue`).

## Khôi phục đăng nhập thật qua backend

Mã cũ vẫn còn: `src/lib/auth/*`, `src/components/auth/*`, `src/app/login/LoginTabs.tsx`, `src/app/admin/login/AdminLoginTabs.tsx`
và cấu hình rewrite `/api/v1/*` → `BACKEND_URL` trong `next.config.ts`. Muốn dùng lại: thay `src/proxy.ts` bằng bản gọi
`GET /api/v1/auth/session` (xem lịch sử git) và gắn lại các trang `/login`, `/admin/login`.
