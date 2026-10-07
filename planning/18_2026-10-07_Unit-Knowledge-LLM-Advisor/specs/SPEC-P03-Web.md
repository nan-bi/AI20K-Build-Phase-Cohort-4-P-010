# SPEC-P03 — Web (WP3)

## 1. Form ký gửi (`apps/web/src/app/landlord/consign/page.tsx`)
- Thêm: **Số WC** (stepper 1–4, bắt buộc, mặc định theo layout: Studio/1PN → 1, 2PN → 2, 3PN → 2), **Hướng** (select 8 giá trị + "Chưa rõ").
- Khối mới **"Giới thiệu căn"**: Tiêu đề (≤ 80, placeholder `VD: 2PN góc view hồ, nội thất gỗ mới`), 3 ô "Điểm nổi bật" (≤ 60 mỗi ô, không bắt buộc), Mô tả (≤ 600, bộ đếm ký tự). Dòng gợi ý dưới khối: "Không ghi số điện thoại, link hay giá — giá lấy từ ô Giá thuê."
- Kiểm cùng quy tắc SPEC-P01 §4 phía client (`apps/web/src/lib/units/listing-text.ts`, test so khớp ca P1-3), server vẫn là chốt chặn. Lỗi 400 `LISTING_TEXT_FORBIDDEN` ⇒ tô đỏ đúng ô theo `field`.
- "Tiền cọc đề xuất" giữ ô cũ, nhãn đổi thành **"Tiền cọc bảo đảm"**, gợi ý "Để trống = 1 tháng tiền thuê".

## 2. Màn thẩm định (`apps/web/src/components/host/inspection/*`)
- `InfoBlocks`: khối **"Thông tin thực tế"** — 5 ô `facts` điền sẵn từ chủ khai, Inspector sửa; ô đã sửa có nhãn "Đã sửa (chủ khai: …)".
- `ConclusionBlock`: khối **"Giá & cọc"** — `rent`, `securityDeposit` điền sẵn; đổi ⇒ hiện ô "Lý do" (bắt buộc khi đổi, ≤ 200) và cảnh báo "Căn sẽ chờ chủ nhà đồng ý giá mới trước khi đăng". Không đổi ⇒ nút "Đạt — đăng ngay".
- Khối **"Giới thiệu căn"**: hiện bản chủ khai, cho sửa.
- Kết quả `awaiting_landlord` ⇒ màn kết thúc ghi "Đã gửi đề xuất giá cho chủ nhà".

## 3. Chủ duyệt giá (`apps/web/src/app/landlord/consignments/[id]/page.tsx`, `ConsignTimeline`)
- Timeline thêm bước "Chờ bạn đồng ý giá" giữa "Thẩm định" và "Đã đăng".
- Khi `pricingProposal != null`: thẻ so sánh 2 cột **Bạn khai** / **Thẩm định đề xuất** (giá thuê, cọc bảo đảm), lý do của Inspector, 2 nút **Đồng ý giá mới** / **Không đồng ý — đóng hồ sơ** (hộp xác nhận: "Căn sẽ không được đăng và hồ sơ ký gửi này đóng lại"). Bấm ⇒ hộp xác nhận ⇒ gọi API; 409 ⇒ tải lại.
- Dashboard chủ: hồ sơ `awaiting_landlord` lên đầu mục "Cần xử lý".

## 4. Trang căn (`apps/web/src/components/unit/UnitDetail.tsx`)
- Xoá section "Hộ chiếu bàn giao số" + câu "Lúc nhận nhà, Field Host…"; bỏ import `PASSPORT_ITEMS`.
- Section mới **"Nội thất chi tiết"**: nhóm theo `groupLabel`, mỗi dòng `name` · `×qty` (khi > 1) · `spec` (chữ nhỏ). `inventory` rỗng ⇒ một dòng "Danh mục nội thất sẽ cập nhật sau thẩm định." (KHÔNG hiện danh sách mẫu).
- Thông số: thêm **WC**, **Hướng** (null ⇒ ẩn ô, không ghi "Chưa rõ").
- `highlights` hiện dạng 3 chip dưới tiêu đề.
- Điều khoản thuê: "Tiền cọc bảo đảm" = `vnd(unit.securityDeposit)`; "Cọc giữ chỗ" = `vnd(unit.holdingDeposit)`. CẤM `RATES.holdingDeposit` và chuỗi "Tương đương 1 tháng" trong file.
- Cùng thay đổi đọc cọc ở mọi nơi web hiện số cọc giữ chỗ cho căn cụ thể (grep `RATES.holdingDeposit` trong `components/`, `app/` ⇒ 0 sau WP3; `lib/pricing/cost.ts` được giữ hằng làm fallback mock).

## 5. Admin vai Host (`AdminHosts.tsx`, `AdminHostDetail.tsx`)
- Thay checkbox vai bằng radio 2 lựa chọn: **Sale** · **Sale + Thẩm định**. Gửi `['sale']` hoặc `['sale','inspector']`.
- Hiển thị Host cũ chỉ có inspector (trước khi chạy script) là "Sale + Thẩm định".

## 6. Test (vitest)
| # | Ca |
| :-- | :-- |
| W1 | Validator text client = server (cùng bảng mẫu P1-3) |
| W2 | Adapter unit đọc `securityDeposit/holdingDeposit/highlights/inventory` |
| W3 | `UnitDetail` không còn chuỗi "Hộ chiếu bàn giao" / "Lúc nhận nhà" (test render) |
| W4 | Inventory rỗng ⇒ câu trạng thái rỗng |
| W5 | Màn thẩm định: đổi giá ⇒ payload có `pricing` mới + `reason`, nút đổi nhãn |
| W6 | Radio vai Admin → payload đúng 2 tập |
