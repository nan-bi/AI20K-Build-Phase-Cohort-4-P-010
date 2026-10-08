---
topic: contract
title: Ký Hợp đồng thuê và xác minh CCCD (eKYC)
sources: [backend/src/modules/identity/identity.service.ts, backend/src/modules/identity/identity.controller.ts, backend/src/modules/contract/lease-template.ts, backend/src/modules/deposit/deposit-terms.ts#obligation, legal/06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md, AGENTS.md#Chủ nhà 3]
verified_at: 2026-10-07
verified_sha: e17afa7
---
- Không có bước ký thỏa thuận cọc riêng. Khi đặt cọc giữ chỗ, khách chỉ tick ô đồng ý điều khoản cọc trước khi quét VietQR.
- Bóc tách CCCD chỉ diễn ra ở bước lập Hợp đồng thuê chính thức, sau khi đã cọc giữ chỗ và trong thời hạn {hold_hours} giờ.
- Quy trình dự kiến: chụp CCCD gắn chip hai mặt → AI bóc tách thông tin → khách kiểm tra, sửa nếu sai → hệ thống lập Hợp đồng thuê → khách ký điện tử trên số điện thoại đã xác thực OTP.
- Hợp đồng thuê gồm: thông tin căn, kỳ hạn thuê, giá thuê, chu kỳ thanh toán, Tiền cọc bảo đảm, khoản cọc giữ chỗ được chuyển đổi, phần cọc nộp bổ sung và tổng tiền kỳ đầu.
- Dữ liệu cá nhân được mã hoá AES-256 và xử lý theo Nghị định 13/2023/NĐ-CP.
- Hiện trạng: kết nối nhà cung cấp eKYC đang hoàn thiện; bước quét CCCD trong app có thể báo "chưa sẵn sàng". Khi gặp lỗi này, hướng khách liên hệ hỗ trợ vận hành ngay, nhất là khi đang trong thời hạn giữ chỗ.
- Bot không tự nhận ảnh CCCD hay số CCCD trong khung chat; chỉ hướng dẫn sang đúng bước trong app.
