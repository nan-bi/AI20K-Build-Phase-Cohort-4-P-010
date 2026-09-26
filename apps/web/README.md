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

- **Đăng nhập demo**: `/login` chọn một trong 4 vai trò (đặt cookie `vs_role`). `src/proxy.ts` chặn `/host`, `/landlord`, `/admin`
  theo cookie đó. Nút "Demo" ở góc phải màn hình đổi vai trò tức thì và đặt lại dữ liệu.
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
| Khách thuê | `/` (landing + chat AI), `/units`, `/units/[id]` (đặt lịch OTP), `/booking`, `/booking/[ref]` |
| Field Host | `/host/dispatch`, `/host/viewing/[id]`, `/host/earnings`, `/host/handbook` |
| Chủ nhà | `/landlord/dashboard`, `/landlord/units/[id]`, `/landlord/consign`, `/landlord/finance` |
| Admin | `/admin/dashboard`, `/admin/hosts`, `/admin/inventory`, `/admin/bookings`, `/admin/commission` |

## Khôi phục đăng nhập thật qua backend

Mã cũ vẫn còn: `src/lib/auth/*`, `src/components/auth/*`, `src/app/login/LoginTabs.tsx`, `src/app/admin/login/AdminLoginTabs.tsx`
và cấu hình rewrite `/api/v1/*` → `BACKEND_URL` trong `next.config.ts`. Muốn dùng lại: thay `src/proxy.ts` bằng bản gọi
`GET /api/v1/auth/session` (xem lịch sử git) và gắn lại các trang `/login`, `/admin/login`.
