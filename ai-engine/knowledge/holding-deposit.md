---
topic: holding_deposit
title: Cọc giữ chỗ hoạt động thế nào?
sources: [backend/src/modules/deposit/deposit.service.ts#createDeposit, backend/src/modules/deposit/deposit.service.ts#markPaid, backend/src/modules/deposit/deposit.service.ts#resolveHoldHours, backend/src/modules/deposit/deposit-terms.ts, legal/tenant/02_HOLDING_DEPOSIT_AND_VIETQR_TERMS.md, legal/02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md]
verified_at: 2026-10-07
verified_sha: e17afa7
---
- Cọc giữ chỗ chỉ mở sau khi khách đã xem căn cùng Field Host và Host chuyển ca sang bước chốt cọc.
- Số tiền: {holding_deposit}, do hệ thống đặt sẵn.
- Khách đọc điều khoản cọc và tick ô đồng ý (Điều 328 BLDS 2015, Nghị định 13/2023/NĐ-CP) trước khi quét mã. Không ký thỏa thuận cọc riêng.
- Thanh toán bằng VietQR động vào tài khoản định danh của nền tảng; không chuyển cho Field Host hay chủ nhà.
- Chuyển đúng số tiền và đúng nội dung hiển thị trên màn hình cọc; giao dịch sai số tiền không được khớp.
- Ngân hàng báo có ⇒ căn được giữ chỗ {hold_hours} giờ cho khách, từ chối lịch xem mới và cọc của người khác.
- Thời lượng do Quản trị viên cài cho từng căn, trong khoảng {hold_hours_min} đến {hold_hours_max} giờ; con số của căn hiển thị ở bước đặt cọc.
- Trong thời hạn giữ chỗ, khách hoàn tất xác minh CCCD để hệ thống lập Hợp đồng thuê.
- Khi ký Hợp đồng thuê, cọc giữ chỗ chuyển 100% thành một phần Tiền cọc bảo đảm; không bao giờ trừ vào tiền thuê tháng đầu.
- Chủ nhà vi phạm hoặc bất khả kháng: quyền lợi của khách theo điều khoản cọc; hiện bộ phận vận hành xử lý từng trường hợp.
