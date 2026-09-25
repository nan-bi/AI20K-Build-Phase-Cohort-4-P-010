-- Custom Access Token Hook: mirrors profiles.role into the JWT as
-- `user_role`, so RLS policies (auth.jwt() ->> 'user_role') and client-side
-- code can read the role cheaply without an extra DB round trip.
--
-- This function alone does nothing until it is registered as a hook in the
-- Supabase Dashboard: Authentication -> Hooks (Beta) -> "Customize Access
-- Token (JWT) Claims" -> select this function ("public.custom_access_token_hook").
-- That registration step cannot be done via SQL migration and must be done
-- once per Supabase project (dev/staging/prod each need it set).

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role public."UserRole";
begin
  select role into user_role from public.profiles where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Supabase's auth service (role `supabase_auth_admin`) must be able to call
-- this function and read `profiles` to compute the claim.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
grant select on public.profiles to supabase_auth_admin;

revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
