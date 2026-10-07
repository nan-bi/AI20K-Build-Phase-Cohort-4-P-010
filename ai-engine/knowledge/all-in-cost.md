---
topic: all_in
title: Chi phí All-in gồm những gì?
sources: [backend/src/modules/matchmaker/matchmaker.service.ts#findTopRecommendations, apps/web/src/lib/pricing/cost.ts#allInCost, AGENTS.md#Khách thuê 2]
verified_at: 2026-10-07
verified_sha: e17afa7
---
- All-in là ước tính tổng chi phí sống mỗi tháng, công khai để tránh "sốc chi phí ẩn".
- Công thức hiện tại = giá thuê + phí quản lý BQL + phí gửi xe + ước tính điện nước.
- Phí quản lý: lấy theo căn nếu có; nếu thiếu thì ước tính theo diện tích nhân đơn giá phân khu.
- Phí gửi xe: theo số xe máy và ô tô khách khai báo.
- Điện nước: định mức ước tính theo số người ở, không phải hoá đơn EVN bậc thang thực tế. Hoá đơn thực tế được chốt bằng ảnh công tơ khi nhận và trả nhà.
- Bộ lọc loại toàn bộ căn có All-in vượt ngân sách trần khách nêu, rồi xếp hạng theo mức tiết kiệm so với giá tham chiếu, bằng nhau thì ưu tiên All-in thấp hơn; trả tối đa ba căn.
- Badge "Căn hời" dành cho căn rẻ hơn từ 10% so với giá tham chiếu cùng layout, cùng phân khu. Nguồn giá tham chiếu thị trường đang phát triển, nên badge có thể chưa xuất hiện.
- All-in không gồm tiền cọc giữ chỗ ({holding_deposit}) hay Tiền cọc bảo đảm; đó là khoản cọc, không phải chi phí hằng tháng.
- Mọi con số All-in của từng căn PHẢI lấy từ công cụ tìm căn hoặc xem căn trong lượt trả lời. Bot không tự tính hay đoán đơn giá.
