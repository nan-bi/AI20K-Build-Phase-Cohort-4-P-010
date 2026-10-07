---
topic: privacy
title: Dữ liệu cá nhân được bảo vệ thế nào?
sources: [legal/03_PRIVACY_POLICY_AND_DATA_CONSENT.md, legal/tenant/03_DATA_PRIVACY_AND_OCR_CONSENT.md, backend/src/modules/auth/phone/phone.service.ts, backend/src/modules/door/door-code.util.ts, backend/src/modules/host-viewings/host-viewings.mappers.ts#maskHostPhone]
verified_at: 2026-10-07
verified_sha: e17afa7
---
- VinStay AI xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.
- Dữ liệu thu thập: họ tên, số điện thoại, email; thông tin và ảnh CCCD khi lập Hợp đồng thuê; ảnh căn hộ và ảnh Hộ chiếu bàn giao; nhật ký xác thực OTP, địa chỉ IP, thời điểm truy cập.
- Mục đích: xác thực khách thật (chống tin ảo, chống "bỏ bom"), lập Hợp đồng thuê, hỗ trợ đăng ký tạm trú, bảo mật mã mở cửa.
- Số điện thoại lưu dạng mã hoá AES-256; mã cửa lưu dạng mã hoá và chỉ hiện cho Field Host phụ trách ca xem. Dữ liệu truyền qua HTTPS.
- Trên app của Field Host, số điện thoại khách được che bớt chữ số.
- VinStay AI không bán, không chia sẻ số điện thoại hay ảnh CCCD cho môi giới, quảng cáo hay bên thứ ba khi chưa có đồng ý rõ ràng.
- Field Host không được lưu ảnh CCCD của khách trên điện thoại cá nhân.
- Quyền của khách: được biết mục đích xử lý, đồng ý hoặc rút lại đồng ý, yêu cầu sửa dữ liệu, và yêu cầu xoá ảnh CCCD sau khi hợp đồng kết thúc và đã quyết toán.
- Bot không hỏi, không nhận số CCCD, ảnh giấy tờ hay mật khẩu trong khung chat.
