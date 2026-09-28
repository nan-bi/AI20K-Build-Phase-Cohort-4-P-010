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

- **Đăng nhập (mock)**: `/login` có tab Khách thuê/Chủ nhà; `/admin/login` có tab Sale (Field Host)/Quản trị (dùng lại đúng form `/host/login` cho tab Sale — `/host/login` vẫn là lối vào riêng, không đổi). Tài khoản thử trong `src/lib/mock/auth.ts` (`DEMO_CREDENTIALS`): `minhanh@vinstay.demo` / `hung.nguyen@vinstay.demo` / `0934556201` (mật khẩu `demo1234`, RFID `VS-0412`) / `ops@vinstay.vn` (`admin1234`). Phiên vẫn là cookie `vs_role`; `src/proxy.ts` chặn `/account`, `/landlord`, `/host`, `/admin` và đưa về đúng trang đăng nhập của cổng. Nút "Demo" ở góc màn hình đổi vai trò tức thì và đặt lại dữ liệu.
- **Một store dùng chung** (`src/lib/mock/store.ts`, localStorage): khách đặt lịch → Host thấy ticket → duyệt → Zalo → đón khách →
  mở cửa (báo chủ nhà + Admin) → cọc VietQR → eKYC CCCD → ký cọc → ký hợp đồng, mọi vai trò cùng thấy một dòng sự kiện.
  Dữ liệu seed gắn với ngày hiện tại; qua ngày mới sẽ tự dựng lại.
- **Zalo / OTP / VietQR / OCR đều là mô phỏng**: mã OTP hiện ngay trong khung "tin Zalo mô phỏng"; nút "Demo" trong màn Host/khách
  cho phép tua (T-10 phút, ngân hàng báo có, khách bấm có mặt).
- Căn hộ mẫu ở `src/lib/mock/units.ts`, ảnh ở `public/units/` (lấy từ `tech data/caodata`, giá/mã căn đã chuẩn hoá cho demo).
- Logic thuần (All-in Cost, Matchmaker, luồng nghiệp vụ) có test ở `src/tests/`.

## Route

| Cổng | Route |
|---|---|
| Công khai | `/` (chat AI), `/units`, `/units/[id]`, `/booking`, `/booking/[ref]` |
| Xác thực | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/host/login`, `/admin/login` |
| Khách thuê | `/account`, `/account/bookings`, `/account/saved`, `/account/contracts` |
| Chủ nhà | `/landlord/dashboard`, `/landlord/units`, `/landlord/units/[id]`, `/landlord/consign`, `/landlord/finance`, `/landlord/exit-request`, `/landlord/account` |
| Field Host | `/host/dispatch`, `/host/viewing/[id]`, `/host/earnings`, `/host/handbook`, `/host/account` (trang cổng nằm trong route group `app/host/(portal)/`) |
| Admin | `/admin/dashboard`, `/admin/inventory`, `/admin/inventory/[id]`, `/admin/bookings`, `/admin/hosts`, `/admin/hosts/[id]`, `/admin/commission`, `/admin/settings` (route group `app/admin/(portal)/`) |

Giao diện dùng hệ token "kinh doanh tối giản" trong `src/app/globals.css` và các primitive ở `src/components/ui/` (`AuthLayout`, `PageHeader`, `Section`, `DataTable`, `StatusBadge`, `EmptyState`, `Field`, `PasswordInput`, `KeyValue`).

## Khôi phục đăng nhập thật qua backend

Mã cũ vẫn còn: `src/lib/auth/*`, `src/components/auth/*`, `src/app/login/LoginTabs.tsx`, `src/app/admin/login/AdminLoginTabs.tsx`
và cấu hình rewrite `/api/v1/*` → `BACKEND_URL` trong `next.config.ts`. Muốn dùng lại: thay `src/proxy.ts` bằng bản gọi
`GET /api/v1/auth/session` (xem lịch sử git) và gắn lại các trang `/login`, `/admin/login`.
