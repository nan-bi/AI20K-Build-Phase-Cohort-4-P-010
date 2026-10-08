---
topic: viewing
title: Quy trình đặt lịch và đi xem căn
sources: [backend/src/modules/booking/booking.service.ts, backend/src/modules/host-viewings/viewing-flow.service.ts, backend/src/modules/dispatch/dispatch.constants.ts, legal/tenant/01_TERMS_OF_SEARCH_AND_BOOKING.md, AGENTS.md]
verified_at: 2026-10-07
verified_sha: e17afa7
---
- Chỉ đặt lịch được với căn đã xác minh, có ảnh và đang trống. Căn đang giữ chỗ không nhận lịch.
- Khách xác thực số điện thoại bằng mã OTP (gửi qua Zalo, dự phòng SMS) trước khi đặt lịch.
- Chọn khung giờ hiển thị trên trang đặt lịch: đặt trước giờ xem ít nhất ba mươi phút, tối đa mười bốn ngày tới. Mỗi khung giờ một căn nhận một lịch.
- Hệ thống giao ca cho Field Host trực đúng phân khu; không nhận trong vài phút thì ca mở cho Host khác.
- Huỷ hoặc đổi lịch: làm trên trang lịch hẹn, chậm nhất hai tiếng trước giờ xem.
- Từ mười phút trước giờ hẹn, Host có thể gửi nhắc hẹn. Trên trang lịch hẹn, khách bấm "Tôi đã có mặt tại sảnh" khi tới, hoặc "xin trễ" nếu đến muộn.
- Host có thẻ cư dân đón khách tại sảnh, dẫn lên căn; không dùng mã QR ở sảnh.
- Tại cửa, Host bấm xác nhận xem phòng trên app; mã cửa điện tử hiện trên app của Host (hoặc Host nhận chìa cơ từ nhân sự phân khu). Không dùng lockbox, không khoá IoT.
- Khách không đến sau mười lăm phút ân hạn: Host có thể đóng ca.
- Xem xong, nếu ưng ý, Host chuyển ca sang bước chốt cọc giữ chỗ ({holding_deposit}).
- Bot chỉ dẫn link sang trang đặt lịch, không đặt thay khách.
