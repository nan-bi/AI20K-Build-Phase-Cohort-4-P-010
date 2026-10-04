# BUG-TC04-01 🔴 — `GET /host/earnings` không cần đăng nhập, lộ dữ liệu thu nhập Field Host theo `hostId`

- **Test case:** TC-04 bước 1 / M8 (truy cập không đăng nhập)
- **Môi trường:** local, backend NestJS `http://localhost:4000` (`backend/.env`, `NODE_ENV=development`, DB Supabase cloud), commit `9e9ad74` (main)
- **Ngày phát hiện:** 2026-10-04
- **Mức độ:** 🔴 NGHIÊM TRỌNG — hành động bị cấm (vô danh) vẫn thành công; lộ dữ liệu tài chính/cá nhân của Host thật

## Tái hiện

```
GET /api/v1/host/earnings?hostId=4fc12629-9bf4-4097-8f3c-5cb93c8c15b5
(không cookie, không Authorization)
```

## Expected

HTTP 401 (`unauthorized`). Phân quyền đích: chỉ `field_host` xem thu nhập của chính mình — `backend/README.md` §1.4 dòng 115.

## Actual (nguyên văn)

```
{"success":true,"statusCode":200,"data":{"hostId":"4fc12629-9bf4-4097-8f3c-5cb93c8c15b5","fullName":"Phương Nam","rating":4.9,"walletBalance":450000,"stats":{"totalViewings":18,"totalDeals":6,"dealCommissionTotal":2400000,"viewingFeeTotal":900000,"ratingBonus":360000,"totalEarnings":3660000},"currentPeriod":"Tuần 40 / 2026","payouts":[]},"timestamp":"2026-10-04T15:50:40.898Z"}
```

## Nguyên nhân (đọc code, chưa sửa)

- `backend/src/modules/host/host.controller.ts:39-44` — `@Public()` + `hostId` lấy từ query, không gắn với phiên.
- `backend/src/modules/host/host.service.ts:64-67` — `findFirst({ where: hostId ? { id: hostId } : undefined })`: bỏ `hostId` ⇒ trả Host đầu tiên trong DB [GIẢ ĐỊNH, chưa chạy].
- `backend/src/modules/host/host.service.ts:76-81` — `stats` là hằng số cứng (dữ liệu giả cho mọi Host); `fullName`, `rating`, `walletBalance`, `payouts` là dữ liệu thật.

## Hướng xử lý gợi ý (để dev quyết)

Bỏ `@Public()`, gắn `@Roles('field_host')`, lấy Host từ phiên (`@CurrentUser`) thay vì query `hostId`.

## Bằng chứng

`scratchpad/tc04/step1.log`, `scratchpad/tc04/step1_M8.json`.
