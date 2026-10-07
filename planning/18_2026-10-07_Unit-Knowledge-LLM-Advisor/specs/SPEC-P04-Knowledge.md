# SPEC-P04 — Tri thức cho LLM (WP4)

## 1. Bộ file (`ai-engine/knowledge/`)
| File | topic | Nguồn đối chiếu BẮT BUỘC (đọc code thật, không chỉ văn bản) |
| :-- | :-- | :-- |
| `op1-overview.md` | `op1` | Tiện ích chung OP1, đi lại vào nội thành, phân khu đang có căn (`GET /buildings`) — 🖐 người nắm thực địa duyệt |
| `all-in-cost.md` | `all_in` | `backend/src/modules/matchmaker/matchmaker.service.ts` (cách tính), `apps/web/src/lib/pricing/cost.ts` |
| `viewing-process.md` | `viewing` | `modules/booking`, `modules/host-viewings`, AGENTS.md (OTP Zalo, T-10m, nút "Tôi đã có mặt tại sảnh", mã cửa trong app, không lockbox) |
| `holding-deposit.md` | `holding_deposit` | `modules/deposit/deposit.service.ts` (`resolveHoldHours`, `expireIfDue`, nhánh `REFUNDED`/`FORFEITED`), `legal/tenant/02_HOLDING_DEPOSIT_AND_VIETQR_TERMS.md`, `legal/02_HOLDING_AND_SECURITY_DEPOSIT_AGREEMENT.md` |
| `holding-expiry.md` | `holding_expiry` | Như trên — **cọc hết hạn giữ chỗ thì sao**: viết đúng hành vi code hiện tại; chỗ code và văn bản lệch ⇒ ghi vào `knowledge/_conflicts.md`, KHÔNG tự chọn |
| `first-to-pay.md` | `first_to_pay` | AGENTS.md "First-to-Pay Wins", `deposit.service.ts` webhook |
| `security-deposit.md` | `security_deposit` | `legal/06_OFFICIAL_APARTMENT_LEASE_AGREEMENT.md`; cọc giữ chỗ chuyển 100%, KHÔNG trừ tiền thuê tháng đầu |
| `contract-ekyc.md` | `contract` | `modules/contract`, `modules/identity`; không ký thỏa thuận cọc riêng, OCR CCCD lúc ký HĐ thuê, AES-256, NĐ 13/2023 (sửa sai H2) |
| `bql-rules.md` | `bql_rules` | `legal/04_BQL_REGULATIONS_AND_LIABILITY.md` (ồn sau 22h, thú cưng, PCCC, phạt trừ cọc bảo đảm) |
| `maintenance.md` | `maintenance` | `legal/05_HANDYMAN_REFERRAL_DISCLAIMER.md` — chỉ giới thiệu thợ ngoài, khách tự thỏa thuận |
| `move-out.md` | `move_out` | `modules/handover` (Hộ chiếu bàn giao số khi nhận/trả nhà, chốt công tơ), hoàn cọc |
| `privacy.md` | `privacy` | `legal/03_PRIVACY_POLICY_AND_DATA_CONSENT.md` |

## 2. Định dạng mỗi file
```markdown
---
topic: holding_expiry
title: Cọc giữ chỗ hết hạn thì sao?
sources: [backend/src/modules/deposit/deposit.service.ts#expireIfDue, legal/tenant/02_HOLDING_DEPOSIT_AND_VIETQR_TERMS.md]
verified_at: 2026-10-07
verified_sha: <sha base>
---
- Gạch đầu dòng ngắn, ≤ 250 từ / file, giọng trung lập.
- Con số động CHỈ dùng biến: {holding_deposit}, {hold_hours}, {hold_hours_min}, {hold_hours_max}.
```
- Biến được `lookup_policy` thay từ `GET /api/v1/legal/deposit-terms` (đã có) lúc chạy. Biến không thay được ⇒ tool trả nguyên văn kèm `missing_params` và bot nói "mức cụ thể hiển thị ở bước đặt cọc" — CẤM đoán số.
- **BẮT BUỘC** không có số tiền/giờ cứng: test `ai-engine/tests/test_knowledge.py` quét regex `\d[\d.,]*\s*(đ|vnđ|vnd|triệu|tr|k|giờ|h)\b` ⇒ 0 khớp ngoài biến.
- **CẤM** chép nguyên văn điều khoản pháp lý dài; tóm tắt + trỏ nguồn.
- **Vùng cấm:** không viết tri thức về sản phẩm chưa có (Waitlist F2, Conflict Resolver gợi ý căn thay thế) như đã chạy — chỉ ghi "đang phát triển" nếu cần.

## 3. Nghiệm thu nội dung
- 🔴 người viết đối chiếu từng gạch đầu dòng với nguồn; `_conflicts.md` liệt kê mọi chỗ lệch (có thể rỗng nhưng phải tồn tại).
- Chủ tịch đọc duyệt `holding-expiry.md`, `holding-deposit.md`, `op1-overview.md` (rủi ro nói sai với khách cao nhất).
