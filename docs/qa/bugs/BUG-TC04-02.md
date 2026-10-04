# BUG-TC04-02 🔴 — `GET /handovers/contracts/:contractId` không cần đăng nhập

- **Test case:** TC-04 bước 1 / M9 (truy cập không đăng nhập)
- **Môi trường:** local, backend NestJS `http://localhost:4000` (`backend/.env`, `NODE_ENV=development`, DB Supabase cloud), commit `9e9ad74` (main)
- **Ngày phát hiện:** 2026-10-04
- **Mức độ:** 🔴 NGHIÊM TRỌNG — hành động bị cấm (vô danh) vẫn thành công (HTTP 200). Hiện chưa lộ dữ liệu vì DB có 0 biên bản bàn giao; khi có dữ liệu thật, bất kỳ ai biết `contractId` sẽ đọc được Hộ chiếu bàn giao số (ảnh hiện trạng, chỉ số công tơ) [GIẢ ĐỊNH, suy từ code].

## Tái hiện

```
GET /api/v1/handovers/contracts/ce7dacb4-148c-4461-842a-8195c9cb0d82
(không cookie, không Authorization)
```

## Expected

HTTP 401 (`unauthorized`). Phân quyền đích: `field_host / tenant` — `backend/README.md` §1.4 dòng 114.

## Actual (nguyên văn)

```
{"success":true,"statusCode":200,"data":[],"timestamp":"2026-10-04T15:52:02.370Z"}
```

## Nguyên nhân (đọc code, chưa sửa)

- `backend/src/modules/handover/handover.controller.ts:22-27` — `@Public()`, không kiểm người gọi có thuộc hợp đồng hay không.
- Cùng controller, `POST /handovers` (`handover.controller.ts:12-20`) cũng `@Public()`. Kết quả TC-04 / M10 (vô danh, body rỗng `{}` để không tạo bản ghi) — request lọt qua lớp xác thực, chỉ bị chặn ở validation:

  ```
  HTTP 400 · {"success":false,"statusCode":400,"timestamp":"2026-10-04T15:56:15.524Z","path":"/api/v1/handovers","code":"invalid_request","message":["contractId must be a UUID","items must be an array","utilityReadings must be an array"],"errors":null}
  ```

  Với body hợp lệ, người vô danh có thể lập biên bản bàn giao [GIẢ ĐỊNH, không thử để tránh tạo dữ liệu].

## Hướng xử lý gợi ý (để dev quyết)

Bỏ `@Public()`, gắn `@Roles('field_host', 'tenant')`, và kiểm người gọi là tenant của hợp đồng / Host phụ trách trước khi trả dữ liệu.

## Bằng chứng

`scratchpad/tc04/step1.log` (dòng `[1/M9]`), `scratchpad/tc04/ids.txt` (`digitalHandover count: 0`).
