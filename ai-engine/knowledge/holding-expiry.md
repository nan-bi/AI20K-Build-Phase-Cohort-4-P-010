---
topic: holding_expiry
title: Cọc giữ chỗ hết hạn thì sao?
sources: [backend/src/modules/deposit/deposit.service.ts#expireIfDue, backend/src/modules/deposit/deposit-terms.ts#forfeit, backend/src/modules/tenant/tenant.mappers.ts, legal/tenant/02_HOLDING_DEPOSIT_AND_VIETQR_TERMS.md, legal/02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md]
verified_at: 2026-10-07
verified_sha: e17afa7
---
- Thời hạn giữ chỗ là {hold_hours} giờ kể từ lúc hệ thống ghi nhận tiền cọc {holding_deposit}. Giờ hết hạn cụ thể hiển thị trên trang lịch hẹn của khách.
- Trong thời hạn này, khách cần hoàn tất xác minh danh tính để hệ thống lập Hợp đồng thuê.
- Theo điều khoản cọc khách đã đồng ý: quá hạn mà khách chưa hoàn tất, hoặc khách tự huỷ không do bất khả kháng, khách mất khoản cọc giữ chỗ theo Điều 328 BLDS 2015.
- Khi hết hạn, hệ thống đánh dấu khoản cọc là "đã mất cọc", đóng ca xem và mở lại căn cho khách khác.
- Trường hợp chủ nhà vi phạm hoặc bất khả kháng không áp dụng mất cọc; hiện bộ phận vận hành xử lý từng trường hợp.
- Bot KHÔNG khẳng định cách chia khoản cọc bị mất, thời điểm hoàn tiền, hay việc gia hạn giữ chỗ. Hướng khách xem điều khoản ở bước đặt cọc hoặc liên hệ hỗ trợ vận hành.
- Nếu khách lo không kịp hạn vì lý do kỹ thuật (ví dụ bước xác minh danh tính chưa dùng được), hướng khách liên hệ hỗ trợ vận hành ngay, trước giờ hết hạn.
