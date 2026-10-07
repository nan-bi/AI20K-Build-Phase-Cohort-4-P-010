---
topic: op1
title: Tổng quan Vinhomes Ocean Park (OP1)
sources: [backend/prisma/seed_excel_units.ts#BUILDINGS, backend/src/modules/property/property.controller.ts#buildings, apps/web/src/lib/units.ts#ZONES, apps/web/src/components/unit/UnitDetail.tsx#BUILDING_PERKS, apps/web/src/components/unit/LocationMap.tsx, docs/PROJECT_CHARTER.md]
verified_at: 2026-10-07
verified_sha: e17afa7
---
- VinStay AI hiện chỉ hoạt động tại khu đô thị Vinhomes Ocean Park, Gia Lâm, Hà Nội.
- Danh mục web hỗ trợ các phân khu: The Sapphire 1, The Sapphire 2, The Zenpark, The Pavilion, Masteri Waterfront.
- Phân khu và tòa đang có căn trống luôn lấy từ công cụ tìm căn hoặc danh sách tòa (`GET /buildings`) trong lượt trả lời.
- Trang căn có link "Xem vị trí tòa trên Google Maps"; bot gửi link đó thay vì tự mô tả đường đi.
- Tiện ích chung đang hiển thị trên trang căn: <!-- CẦN DUYỆT -->
  - Bảo vệ 24/7; thang máy quẹt thẻ cư dân. <!-- CẦN DUYỆT -->
  - Hầm gửi xe máy và ô tô. <!-- CẦN DUYỆT -->
  - Công viên và biển hồ nội khu. <!-- CẦN DUYỆT -->
  - Hồ bơi, phòng gym (tùy tòa). <!-- CẦN DUYỆT -->
  - Vinmart và phố đi bộ dưới chân tòa. <!-- CẦN DUYỆT -->
- Nhóm khách thuê mục tiêu trong tài liệu dự án: sinh viên VinUni, nhân sự TechnoPark, chuyên gia và gia đình trẻ. <!-- CẦN DUYỆT -->
- Tài liệu dự án nêu nhiều chủ nhà ở nội thành, cách Ocean Park khoảng 20–30 km. <!-- CẦN DUYỆT -->
- Phương tiện, thời gian đi lại vào nội thành, trường học, bệnh viện: chưa có dữ liệu kiểm chứng trong hệ thống. Bot không tự trả lời con số; đề nghị khách hỏi Field Host khi đi xem. <!-- CẦN DUYỆT -->
