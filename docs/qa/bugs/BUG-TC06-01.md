# BUG-TC06-01 — Admin xoay mã cửa ⇒ Host không lấy được mã (`door_code_missing`)

- **Test case:** TC-06 / biên bản Admin F15 (`POST /api/v1/admin/door-keys/:id/rotate`)
- **Môi trường:** đọc code tại commit `4b00d24` (main); chưa tái hiện trên DB (sẽ làm đổi mã cửa thật của căn)
- **Ngày phát hiện:** 2026-10-09 (rà soát lần 1, người lập đã tự đo lại trên code)
- **Mức độ (đề xuất):** Cao — chạm CN2 "Chủ nhà ở nhà 100%": Host đứng trước cửa mà không có mã. Hiện **chưa có nút trên UI** nên chỉ xảy ra khi gọi API trực tiếp

## Tái hiện (chưa chạy, theo code)

1. Admin gọi `POST /api/v1/admin/door-keys/<id khóa ELECTRONIC_PIN>/rotate` body `{"reason":"..."}`.
2. Field Host Sale mở cửa ca xem của căn đó (luồng `host-viewings` → `DoorCodeService`).

## Expected

Host nhận PIN mới vừa xoay.

## Actual (theo code)

Host nhận `door_code_missing`.

## Nguyên nhân (đọc code, chưa sửa)

- `backend/src/modules/admin/admin-key.service.ts:45` ghi `vaultSecretRef: this.crypto.encrypt(pin)`. `crypto` là `PhoneService` (`admin.module.ts:30`), hàm `encrypt` trả `v1:<iv>:<tag>:<ct>` (`auth/phone/phone.service.ts:36-41`), **không có tiền tố `aes:`**.
- `backend/src/modules/door/door-code.service.ts:34` chỉ đọc khi `classifyDoorRef(ref) === 'aes'`, tức chuỗi phải bắt đầu bằng `aes:` (`door/door-code.util.ts:8,15`). Không có tiền tố ⇒ `'missing'` ⇒ `null`.
- Luồng ký gửi ghi đúng định dạng: `` `aes:${this.phones.encrypt(dto.doorCode)}` `` (`landlord/landlord-consignment.service.ts:183`).
- Test `admin-key.service.spec.ts:35,52` mock crypto thành `ENC(...)` nên không bắt được lỗi.

## Đề xuất sửa

Bọc bằng `withAesPrefix(...)` từ `door/door-code.util.ts` ở `admin-key.service.ts:45`. Thêm test dùng `PhoneService` thật: xoay mã xong, `DoorCodeService` đọc ra đúng PIN.
