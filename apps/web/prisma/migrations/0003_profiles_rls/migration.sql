-- Row-Level Security for `profiles`.
--
-- IMPORTANT: Prisma (used by all our Route Handlers via lib/prisma.ts)
-- connects with the Postgres role behind DATABASE_URL, which has BYPASSRLS
-- for the Supabase service role — so RLS is NOT the enforcement mechanism
-- for app code going through Prisma. RLS matters only for code paths that
-- use the Supabase JS client directly with the anon/authenticated key (e.g.
-- a future Realtime subscription on the landlord dashboard). Primary
-- enforcement for everything else is the app-level RBAC in
-- src/lib/auth/rbac.ts + src/middleware.ts.

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using (
  auth.uid() = id
  or (auth.jwt() ->> 'user_role') = 'admin'
);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);
