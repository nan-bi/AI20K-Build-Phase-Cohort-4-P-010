# Kế hoạch Bước 6 — Test luồng xuyên vai trò (mock Prisma)

## Metadata

- ID: P06 · Ngày: 2026-10-04 · Loại: MINOR / SPEC PACKAGE
- Trạng thái: Chờ người dùng duyệt; chưa thi công.
- Nhánh nền: `feat/admin-flows` @ `46c8232`.
- Mục tiêu: kiểm thử sáu luồng tenant/host/landlord/admin/deposit trên Prisma mock dùng chung, tập trung giữ phòng, điều phối, payout, quyền dữ liệu và mã khóa.
- Ràng buộc: không sửa schema/API để làm vừa test; lỗi liên module ghi vào `orchestration/CROSS_MODULE_FIXES.md`.
- Tiêu chí nghiệm thu bổ sung do người dùng cung cấp: guard + test 401/403/200 cho mọi `/admin/*`; không rename/delete route hoặc đổi response; AuditLog cho mutation và sensitive read; giữ nguyên baseline test; không đổi file ngoài scope đã duyệt. Chi tiết tại `specs/TESTING-ACCEPTANCE.md`.
- Bước 0: `node ../brain4agent.release/.agents/skills/.xay-dung-nao-bo/scripts/init_brain.js --check` thoát 1, `MODULE_NOT_FOUND` tại `D:\brain4agent.release\...\init_brain.js`. `orchestration/ADMIN_AUDIT.md` cũng ghi engine hub không có trong môi trường. Không chạy chế độ ghi.

## Nhật ký quyết định

| Thời điểm | Quyết định | Quyết định bị thay thế |
|---|---|---|
| 2026-10-04 | Theo SAD_v2 làm oracle mặc định; liệt kê bất nhất và trạng thái trong `orchestration/ADMIN_OPEN_QUESTIONS.md`. | PRD 24h/3p/4 số/10s không dùng làm oracle khi mâu thuẫn. |
| 2026-10-04 | Giữ scenario eKYC nhưng đặt cổng quyết định vì compliance backlog; không giả lập API/role. | Không mặc định ops_admin có quyền duyệt eKYC. |
| 2026-10-04 | Test xuyên module trong một spec với Prisma mock chung; unit specs hiện hữu không thay bằng chứng tích hợp. | Không coi file nháp `admin-flows.spec.ts` chưa theo dõi là nghiệm thu. |

## Work Packages

| WP | Công việc | Tầng | Hoàn tất khi |
|---|---|---|---|
| WP1 | Đóng contract mock và oracle theo `specs/01-CONTRACTS.md` | 🟠 | Mock collaborator và scenarios chạy được qua Jest, không thay schema/API |
| WP2 | Hoàn thiện sáu scenario theo `specs/SPEC-P06-Admin-Role-Flows.md` | 🟠 | Lệnh Jest mục tiêu pass; 6 scenario có trạng thái và assertion |
| WP3 | Đo nghiệm thu, diff/phạm vi và hồ sơ | 🟠 | Gate local trong `specs/TESTING-ACCEPTANCE.md` ✅; report có exit code/diff SHA |

## Checklist thực thi

- [ ] Duyệt kế hoạch và các câu hỏi eKYC, payout sweep, rotate PIN.
- [ ] Thi công WP1–WP3 theo thứ tự; đọc source liên quan trước khi sửa.
- [ ] Chạy lệnh Jest mục tiêu/tổng thể, build, `git diff --check`; lưu output máy.
- [ ] Ghi lỗi ngoài module Admin vào `orchestration/CROSS_MODULE_FIXES.md`, không tự sửa.
- [ ] Đo lại phạm vi và SHA; đóng hồ sơ chỉ khi mọi gate cần thiết ✅.

## Router SPEC

- Kiến trúc/bất biến: [`specs/00-ARCHITECTURE.md`](specs/00-ARCHITECTURE.md)
- Contract mock/oracle: [`specs/01-CONTRACTS.md`](specs/01-CONTRACTS.md)
- Sáu scenario: [`specs/SPEC-P06-Admin-Role-Flows.md`](specs/SPEC-P06-Admin-Role-Flows.md)
- Vận hành/rollback: [`specs/OPERATIONS.md`](specs/OPERATIONS.md)
- Test/nghiệm thu: [`specs/TESTING-ACCEPTANCE.md`](specs/TESTING-ACCEPTANCE.md)
