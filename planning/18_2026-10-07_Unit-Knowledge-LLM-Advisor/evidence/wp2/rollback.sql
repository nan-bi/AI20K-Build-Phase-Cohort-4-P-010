-- WP2 rollback (KHÔNG chạy tự động; xem xét thủ công). WP2 không đổi schema nên rollback chỉ là dữ liệu.
-- 1) Hồ sơ đang chờ chủ duyệt giá: đưa về `inspecting` để Inspector nộp lại (bỏ proposal).
UPDATE exclusive_mandates
SET door_access_config = jsonb_set(
      (door_access_config #- '{consignment,pricingProposal}') #- '{consignment,pricingDecision}',
      '{consignment,stage}', '"inspecting"')
WHERE door_access_config -> 'consignment' ->> 'stage' = 'awaiting_landlord';

-- 2) Hồ sơ bị chủ từ chối giá (decline) — chỉ liệt kê, KHÔNG tự mở lại (Q5: ký gửi lại ngoài phạm vi).
SELECT id, contract_number FROM exclusive_mandates
WHERE door_access_config -> 'consignment' -> 'pricingDecision' ->> 'decision' = 'decline';

-- 3) Dữ liệu vai Host đã sửa bởi scripts/fix-host-roles.ts (khôi phục SALE-thừa -> chỉ INSPECTOR).
--    Tra danh sách từ audit; đặt lại roles = old_value.roles cho từng dòng cần khôi phục.
SELECT entity_id AS host_id, old_value, created_at
FROM audit_logs
WHERE action_type = 'HOST_ROLES_UPDATE' AND actor_role = 'system';
-- UPDATE field_hosts SET roles = ARRAY['INSPECTOR']::"HostRole"[] WHERE id = '<host_id>';

-- 4) Căn đã niêm yết qua nhánh accept: không có thao tác tự động (đổi về UNLISTED cần quyết định người).
-- Code rollback: git revert các file trong báo cáo R02 (không có migration).
