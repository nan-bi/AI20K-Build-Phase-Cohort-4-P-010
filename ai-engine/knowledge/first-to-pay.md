---
topic: first_to_pay
title: Hai khách cùng muốn một căn thì ai được?
sources: [AGENTS.md#First-to-Pay Wins, backend/src/modules/deposit/deposit.service.ts#markPaid, backend/src/modules/booking/booking.service.ts#createBooking]
verified_at: 2026-10-07
verified_sha: e17afa7
---
- Nguyên tắc "First-to-Pay Wins": căn được khoá cho người có tiền cọc {holding_deposit} được ngân hàng ghi nhận trước. Đặt lịch xem hay lời hứa không giữ được căn.
- Khi tiền của một khách vào trước, căn chuyển sang giữ chỗ {hold_hours} giờ cho khách đó.
- Cùng lúc hệ thống tự huỷ các lịch xem chưa bắt đầu của căn (đang chờ xác nhận, đã xác nhận, đã có mặt tại sảnh) và vô hiệu các mã cọc đang chờ thanh toán của khách khác.
- Nếu khách khác vẫn chuyển tiền sau khi căn đã có người giữ, giao dịch đó được đánh dấu hoàn lại, căn không đổi người giữ.
- Căn đang giữ chỗ không nhận lịch xem mới. Khách có thể chọn căn khác còn trống.
- Đang phát triển (chưa chạy): báo đẩy cho Host đang dẫn xem khi căn bị cọc trước, gợi ý tự động căn tương đương, và hàng chờ dự phòng khi căn mở lại. Bot không hứa các tính năng này.
- Bot có thể dùng công cụ tìm căn để gợi ý các căn còn trống phù hợp ngân sách.
