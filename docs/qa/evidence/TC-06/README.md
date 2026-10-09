# Bằng chứng TC-06 — Cổng Admin (2026-10-09)

Output máy: ảnh chụp và `summary.json` do `admin-ui.mjs` sinh ra. **Không sửa tay.** Báo cáo: [TC-06](../../TC-06_admin-portal.md).

| Thư mục | Môi trường | Nhịp |
|---|---|---|
| [local/](local/) | `http://localhost:3000` + backend `:4000`, commit `4b00d24` | 1,5 giây/trang |
| [deploy-fast/](deploy-fast/) | `https://ai-20-k-build-phase-cohort-4-p-010.vercel.app` | 1,5 giây/trang |
| [deploy-slow/](deploy-slow/) | như trên | 7 giây/trang |

Tên ảnh: `anon_*` là lúc chưa đăng nhập; `admin_<trang>.png`; `__detail_` là trang chi tiết lấy từ link đầu tiên của trang danh sách. `summary.json` ghi HTTP, URL cuối, h1, các API trả ≥400, lỗi console và mọi request ghi (không phải GET) của từng trang.

Ảnh có tên và email của tài khoản demo cùng thành viên nhóm. Không đăng ảnh ra ngoài nhóm.

## Chạy lại

Cần Node ≥18 và Microsoft Edge. Cài `playwright-core` ở một thư mục **ngoài repo**, rồi chạy script từ đó:

```bash
npm i playwright-core@1.56.1
ADMIN_EMAIL=<email ops_admin> ADMIN_PASSWORD=<mật khẩu> \
BASE=http://localhost:3000 API=http://localhost:4000 DELAY=1500 \
node admin-ui.mjs <thư-mục-ra>
```

Không có `ADMIN_EMAIL`/`ADMIN_PASSWORD` thì script chỉ kiểm hành vi khi chưa đăng nhập. Script chỉ điều hướng và chụp ảnh, không bấm nút ghi.
