---
topic: move_out
title: Nhận nhà, trả phòng và hoàn cọc
sources: [backend/src/modules/handover/handover.service.ts, backend/prisma/schema.prisma#DigitalHandover, legal/06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md#Điều 4, legal/02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md#Điều 8, legal/04_BQL_REGULATIONS_AND_LIABILITY.md#4]
verified_at: 2026-10-07
verified_sha: e17afa7
---
- Hộ chiếu bàn giao số được lập hai lần: lúc nhận nhà và lúc trả nhà, do Field Host có vai thẩm định thực hiện.
- Biên bản bắt buộc đủ 10 hạng mục, mỗi hạng mục một lần: tường, sàn, khoá cửa, điều hoà, tủ lạnh, bếp, thiết bị vệ sinh, sofa, giường, hệ thống điện.
- Mỗi hạng mục có ảnh, ghi chú hiện trạng và đánh dấu hao mòn tự nhiên hay không. Ảnh lưu kho riêng tư, có mã băm SHA-256 và thời điểm ghi nhận.
- Chụp ảnh chỉ số công tơ điện và nước ở cả hai lần bàn giao.
- Khách và chủ nhà xem lại được biên bản trong app.
- Khi trả nhà, theo hợp đồng: đối soát Hộ chiếu bàn giao và chỉ số công tơ, rồi trừ cọc theo thứ tự: nợ điện, nước, phí dịch vụ, gửi xe → tiền phạt BQL do lỗi của khách → hư hỏng do bất cẩn. Hao mòn tự nhiên không bị trừ.
- Phần Tiền cọc bảo đảm còn lại được hoàn cho khách trong ba ngày làm việc sau khi hoàn tất biên bản thanh lý và đối soát điện nước.
- Bước quyết toán và hoàn cọc tự động trong app đang phát triển; hiện bộ phận vận hành xử lý theo hợp đồng.
