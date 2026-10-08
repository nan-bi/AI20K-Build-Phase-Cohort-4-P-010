---
topic: conflicts
title: Chỗ lệch giữa code và văn bản pháp lý (chờ người quyết)
sources: [backend/src/modules/deposit/deposit.service.ts, backend/src/modules/deposit/deposit-terms.ts, backend/src/modules/identity/identity.service.ts, backend/src/modules/admin/admin-deposit.service.ts, backend/src/modules/host-viewings/viewing-flow.service.ts, backend/src/modules/handover/handover.service.ts, legal/02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md, legal/tenant/02_HOLDING_DEPOSIT_AND_VIETQR_TERMS.md, legal/tenant/01_TERMS_OF_SEARCH_AND_BOOKING.md, legal/03_PRIVACY_POLICY_AND_DATA_CONSENT.md, legal/06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md]
verified_at: 2026-10-07
verified_sha: e17afa7
---
<!-- File nội bộ: loader bỏ qua file bắt đầu bằng "_". KHÔNG đưa nội dung này cho khách. Con số viết bằng chữ để qua bộ quét số cứng. -->

Mỗi mục: câu hỏi · code nói gì · legal nói gì · đề xuất. Số dòng `file:dòng` tính theo base `e17afa7` (cây làm việc có thể lệch vài dòng do WP song song; hành vi không đổi). Các file topic chỉ viết phần chắc chắn; phần dưới đây bot KHÔNG được khẳng định.

## C1. Thời hạn giữ chỗ mặc định bao lâu?
- Code: `resolveHoldHours` lấy `unit.holdHoursOverride` → `FeeConfig.hold_hours_default` → mặc định bốn mươi tám, kẹp [mười hai, bảy mươi hai] (deposit.service.ts:55-62; deposit-terms.ts:45; apps/web/src/lib/pricing/cost.ts:2). AGENTS.md cũng ghi mặc định bốn mươi tám.
- Legal: tenant/02 §3 ghi cố định hai mươi bốn giờ (cả tiêu đề); legal/02 Điều 2 ghi mặc định hai mươi bốn giờ, khoảng mười hai đến bảy mươi hai.
- Đề xuất: sửa tenant/02 và legal/02 theo AGENTS.md + code, dùng chỗ trống `[SỐ GIỜ GIỮ CHỖ]`. Topic đã dùng biến {hold_hours}.

## C2. Hết hạn giữ chỗ có luôn mất cọc không?
- Code: `expireIfDue` (deposit.service.ts:462-523) chuyển MỌI cọc `PAID_HOLDING` quá `expiresAt` sang `FORFEITED`, đóng ca (`hold_expired`), mở lại căn — không xét lý do (lỗi khách, lỗi chủ nhà, bất khả kháng, lỗi hệ thống).
- Legal: legal/02 Điều 6.1 và tenant/02 §5.1: chỉ mất cọc khi lỗi của khách, không thuộc bất khả kháng.
- Đề xuất: chủ tịch chốt — hoặc thêm bước Admin xác nhận trước khi `FORFEITED`, hoặc chấp nhận tự động và ghi rõ trong điều khoản.

## C3. eKYC chưa chạy ⇒ khách không thể hoàn tất nghĩa vụ trong hạn
- Code: `IdentityService.scan` và `submit` luôn ném `ekyc_provider_unavailable` (identity.service.ts:17-35). Không có đường nào khác để lập Hợp đồng thuê trong app.
- Hệ quả: theo C2, mọi cọc đã trả sẽ thành `FORFEITED` khi quá hạn dù khách không có lỗi.
- Legal: mất cọc chỉ khi khách không hoàn tất do lỗi của mình (legal/02 Điều 6.1).
- Đề xuất: trước khi mở thanh toán thật, chặn tự động mất cọc hoặc gia hạn giữ chỗ khi eKYC lỗi; topic contract-ekyc.md đã dặn khách liên hệ vận hành.

## C4. Không chỗ nào chuyển cọc sang `CONVERTED_TO_CONTRACT`
- Code: grep `CONVERTED_TO_CONTRACT` chỉ thấy chỗ ĐỌC (tenant.mappers.ts:219, landlord-units.service.ts:205, admin-bi.service.ts:17, admin-payout.service.ts:67). Nếu sau này lập hợp đồng mà cọc vẫn `PAID_HOLDING`, `expireIfDue` sẽ đánh `FORFEITED` cọc của khách đã ký.
- Legal: legal/02 Điều 4.2 — ký hợp đồng thì cọc tự động chuyển 100% sang Tiền cọc bảo đảm.
- Đề xuất: luồng lập Hợp đồng thuê phải đổi trạng thái cọc trong cùng transaction.

## C5. Khoản cọc bị mất chia cho ai?
- Code: không tạo `EscrowTransaction` phân bổ khi `FORFEITED` (deposit.service.ts:476-506). Văn bản hiển thị cho khách (deposit-terms.ts:69) ghi chia đôi chủ nhà và nền tảng.
- Legal: legal/02 Điều 6.1 chia đôi; tenant/02 §5.1 chuyển toàn bộ cho chủ nhà.
- Đề xuất: chốt một phương án, sửa văn bản còn lại. Topic holding-expiry.md cấm bot nêu cách chia.

## C6. Hết hạn được xử lý ngay hay "lười"?
- Code: không có cron; `expireIfDue` chỉ chạy khi có người tạo lịch (booking.service.ts:113), tạo cọc (deposit.service.ts:149), báo có (:330) hoặc Host tải UNC (:554). Trong lúc chờ, API khách trả `outcome: expired` (tenant.mappers.ts:216-218) nhưng DB vẫn `PAID_HOLDING`, căn vẫn `HOLDING`, Admin payout vẫn tính (admin-payout.service.ts:67).
- Legal: legal/02 Điều 6.1 "căn hộ lập tức được mở lại".
- Đề xuất: thêm job định kỳ hoặc chấp nhận và sửa câu chữ.

## C7. Khách thua First-to-Pay được hoàn tiền khi nào?
- Code: `markPaid` đặt `REFUNDED` và ghi bút toán `REFUND` ngay (deposit.service.ts:338-380); không có tích hợp chi tiền ngân hàng, nên thời điểm tiền về tài khoản khách không xác minh được.
- Legal: tenant/02 không nêu trường hợp này; legal/02 chỉ nêu hạn hoàn cho chủ nhà vi phạm/bất khả kháng.
- Đề xuất: ghi SLA hoàn tiền vào tenant/02; topic first-to-pay.md chỉ nói "được đánh dấu hoàn lại".

## C8. Khách chuyển sai số tiền thì sao?
- Code: sai số tiền ⇒ `ignored`, chỉ ghi audit `DEPOSIT_AMOUNT_MISMATCH` (deposit.service.ts:310-327); không giữ căn, không có luồng hoàn.
- Legal: không đề cập.
- Đề xuất: thêm điều khoản và quy trình hoàn thủ công.

## C9. Chủ nhà vi phạm hoặc bất khả kháng
- Code: `voidHold` chỉ ghi audit `DEPOSIT_VOID_REQUESTED`, trạng thái giữ nguyên, thông điệp "chờ Ops quyết định" (admin-deposit.service.ts:177-198).
- Legal: legal/02 Điều 6.2–6.3 và deposit-terms.ts:74 — hoàn toàn bộ cọc và phạt cọc bằng đúng số cọc; bất khả kháng hoàn toàn bộ, không phạt; hoàn trong một hạn ngày làm việc.
- Đề xuất: chốt quy trình Ops; topic chỉ nói "bộ phận vận hành xử lý từng trường hợp".

## C10. Nội dung chuyển khoản VietQR
- Code: `COC <mã căn> <mã lịch hẹn>` (deposit.service.ts:179).
- Văn bản: deposit-terms.ts:54 và tenant/02 §2.2 ghi `COC <mã căn> <SĐT>`.
- Đề xuất: sửa văn bản theo code (không lộ SĐT trong sao kê). Topic chỉ nói "đúng nội dung hiển thị".

## C11. Còn văn bản nhắc "Thỏa thuận cọc" riêng
- AGENTS.md: không ký thỏa thuận cọc riêng, chỉ tick đồng ý; OCR CCCD lúc ký Hợp đồng thuê.
- Legal: legal/02 tự gọi là "Thỏa thuận đặt cọc" có điều ký số; legal/03 §3.2 "điền dữ liệu OCR vào Thỏa thuận cọc"; legal/06 Điều 4.2 "theo Thỏa thuận số VSA-HOLD"; docs/PRD.md:352 "Thỏa thuận cọc điện tử".
- Đề xuất: đổi các câu này thành "điều khoản cọc đã chấp thuận". Topic theo AGENTS.md.

## C12. Nhắc hẹn mười phút trước, nút Zalo, tự đóng no-show
- Legal: tenant/01 §4 — hệ thống tự gửi nhắc cho cả khách và Host qua Zalo, có nút "Tôi đã có mặt tại sảnh", tự đóng lịch khi khách không đến sau mười lăm phút.
- Code: nhắc hẹn là Host bấm tay từ mười phút trước giờ hẹn, chỉ ghi `reminderSentAt` (viewing-flow.service.ts:178-189); không thấy gửi Zalo; nút có mặt tại sảnh là API trên web (booking.service.ts:525); no-show do Host bấm tay sau ân hạn (viewing-flow.service.ts:249-262). Copy web vẫn hứa "mình nhắn Zalo" (apps/web/src/components/booking/status.ts:18).
- Đề xuất: làm ZNS thật hoặc sửa copy + tenant/01. Topic viewing-process.md tả đúng code.

## C13. Geofence trong Hộ chiếu bàn giao
- Legal: legal/02 Điều 8.1, legal/04 §4, tenant/01 nói ảnh có Timestamp + GPS Geofence.
- Code: handover.service.ts:83-94 chỉ ghi SHA-256 và thời điểm máy chủ; không lưu toạ độ (schema chỉ có comment `lat, lng`).
- Đề xuất: bổ sung hoặc bỏ chữ Geofence khỏi văn bản. Topic move-out.md không nhắc Geofence.

## C14. Ai hoàn Tiền cọc bảo đảm khi trả nhà?
- Legal: legal/06 Điều 4.4 — Bên A (chủ nhà) hoàn trong ba ngày làm việc; legal/02 Điều 8.3 — nền tảng giải tỏa từ tài khoản ký quỹ.
- Code: chưa có luồng quyết toán; không chỗ nào đặt `TERMINATED_SETTLED`.
- Đề xuất: chốt bên chi trả; topic move-out.md ghi "bộ phận vận hành xử lý theo hợp đồng".

## C15. Mức Tiền cọc bảo đảm
- Legal: legal/06 Điều 4.1, legal/02 Điều 4.1 — một đến hai tháng tiền thuê.
- Code/UI: UnitDetail.tsx:286 ghi cứng "Tương đương 1 tháng" (H6); tenant/02 §4.2 "thông thường bằng một tháng".
- Đề xuất: WP3 hiển thị số từ dữ liệu căn; topic security-deposit.md nói "theo từng căn".

## C16. Badge "Căn hời" gần như không bao giờ bật
- Code: `marketAvgPrice` = giá chủ chào khi ký gửi (00-ARCHITECTURE H9) ⇒ mức tiết kiệm bằng không (matchmaker.service.ts).
- Đề xuất: hồ sơ riêng về giá tham chiếu; topic all-in-cost.md ghi "đang phát triển".

## C17. Dữ liệu OP1 chưa kiểm chứng
- Seed có phân khu The Beverly (backend/prisma/seed_excel_units.ts) nhưng danh mục web không có (apps/web/src/lib/units.ts:28-34).
- `BUILDING_PERKS` (UnitDetail.tsx:33) là hằng số giao diện, không có nguồn dữ liệu; khoảng cách nội thành chỉ có trong docs.
- Đề xuất: người nắm thực địa duyệt các dòng `CẦN DUYỆT` trong op1-overview.md.

## C18. Đường dẫn thư mục tri thức
- SPEC-P04 §1: `ai-engine/knowledge/`; SPEC-P05 cây thư mục: `ai-engine/app/knowledge/`.
- Đề xuất: WP5 loader thống nhất một đường dẫn (file `_sample.md` của WP5 đang ở `ai-engine/knowledge/`).
