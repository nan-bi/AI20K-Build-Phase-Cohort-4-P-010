-- DESTRUCTIVE. Gỡ schema cũ của apps/web (Prisma ở FE đã bị bỏ; backend/prisma/schema.prisma là nguồn chân lý duy nhất).
-- Chạy MỘT LẦN trên project Supabase từng áp migration của apps/web, trước `npx prisma db push`.
-- Các tên bảng trùng backend (profiles, field_hosts, units, viewings, holding_deposits) nhưng khác cột nên không thể push đè.

DROP TABLE IF EXISTS public.viewings, public.holding_deposits, public.otp_codes, public.auth_audit_log,
  public.field_hosts, public.landlords, public.units, public.profiles, public._prisma_migrations CASCADE;

DROP TYPE IF EXISTS public."UserRole", public."ProfileStatus", public."HostOperationalStatus", public."LandlordStatus",
  public."OtpPurpose", public."OtpChannel", public."OtpStatus", public."LayoutType", public."UnitStatus",
  public."ViewingStatus", public."DepositStatus" CASCADE;

-- Hook JWT cũ đọc profiles.role. Hook vẫn được đăng ký trong Dashboard nên KHÔNG drop hàm (sẽ làm hỏng cấp token);
-- thay bằng bản passthrough. Backend đọc vai trò từ DB, không cần claim user_role. Có thể gỡ hook ở
-- Dashboard → Authentication → Hooks rồi drop hàm sau.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb) RETURNS jsonb
LANGUAGE sql STABLE AS $$ SELECT event $$;
