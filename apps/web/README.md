# VinStay AI Web

Giao diện Next.js cho khách thuê, chủ nhà, Field Host và Admin. Dữ liệu nghiệp vụ tải qua NestJS API; backend đọc và ghi PostgreSQL trên Supabase bằng Prisma. Frontend không dùng store localStorage để tạo căn, lịch xem, hồ sơ, hợp đồng hoặc số liệu giả.

## Chạy ứng dụng

```bash
pnpm install
pnpm dev
```

Web mặc định chạy tại `http://localhost:3000` và cần backend ở `http://localhost:4000`. Đặt `BACKEND_URL` trong `apps/web/.env.local` nếu backend dùng địa chỉ khác.

```env
BACKEND_URL=http://localhost:4000
```

## Nguồn dữ liệu

- Trang chủ, tìm căn và chi tiết căn dùng catalog API; giá thuê, phí quản lý, trạng thái, hình ảnh, phân khu, lượt quan tâm và khung giờ bận lấy từ Supabase.
- Khách thuê dùng API cho đăng nhập, hồ sơ, yêu thích, lịch xem, hợp đồng và PDF.
- Chủ nhà, Field Host và Admin đọc/ghi qua các API theo vai trò; dữ liệu mẫu trong thư mục cũ `lib/mock` không được import vào luồng production.
- Chat tìm căn lọc catalog thật đang tải từ API. Lịch trống được đối chiếu với endpoint busy-slots và được backend kiểm tra lại khi đặt.

## Tích hợp cần cấu hình trước khi dùng

- OTP cần thông tin provider Zalo/SMS thật.
- VietQR chỉ cho tạo giao dịch khi có cấu hình tài khoản nhận và webhook đối soát thật.
- eKYC và lập hợp đồng thuê bị khóa cho đến khi có provider eKYC thật; ứng dụng không giả kết quả xác minh.

Backend dùng `.env` riêng. Chỉ chạy Prisma Client generation cho cấu hình Supabase hiện hữu; không nạp seed mẫu vào database thật.

## Kiểm tra mã

```bash
pnpm typecheck
pnpm build
```
