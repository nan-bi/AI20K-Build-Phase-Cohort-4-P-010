-- The Custom Access Token Hook runs as `supabase_auth_admin`. `profiles` has
-- RLS enabled (0003) and no policy matched that role, so the hook saw zero
-- rows and never stamped `user_role` into the JWT (=> 403 on every guarded
-- route). Let the auth service read profiles.
create policy "profiles_select_auth_admin"
on public.profiles for select
to supabase_auth_admin
using (true);
