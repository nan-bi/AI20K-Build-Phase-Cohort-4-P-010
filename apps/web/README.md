# VinStay AI — Core Service (Next.js)

Next.js + Prisma + Supabase backend replacing the FastAPI "Core Service" in
`docs/SAD.md`. The Python/FastAPI+LangGraph skeleton at the repo root (`src/`)
stays as-is for the future AI Engine service (Matchmaker/OCR/Dispatcher) —
unrelated to this app.

**Current scope: Auth only** (login/session/RBAC for Landlord, Field Host,
Admin, plus OTP infra for Tenant actions). See
`/Users/namdev/.claude/plans/t-i-ang-c-nhi-m-tidy-quokka.md` for the full
design writeup and rationale.

## Setup

> Only testing Admin's Google login? You don't need `OTP_PEPPER` /
> `OTP_TOKEN_SECRET` or Zalo/SMS for that — those are only read by the
> Landlord/Host phone-OTP flow, which is separate code. Steps 1–5 below are
> the whole path to a working Google login.

1. `pnpm install`
2. Copy `.env.example` to `.env` and fill in:
   - A Supabase project's `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).
   - `DATABASE_URL` (pooled, port 6543, `?pgbouncer=true`) and `DIRECT_URL`
     (direct, port 5432) — Project Settings → Database → Connection string.
   - `OTP_PEPPER` / `OTP_TOKEN_SECRET` — only needed once you test
     Landlord/Host phone login; any long random string works
     (e.g. `openssl rand -hex 32`). Leave blank for now if you're only
     testing Google login.
   - Leave `ZALO_ZNS_*` / `SMS_FALLBACK_*` blank for now (`ZaloZnsSender`/
     `SmsFallbackSender` throw until real credentials exist — see
     `src/lib/notifications/`). With `APP_ENV=development`, OTP codes are
     logged to the server console and echoed back in the API response
     instead (`ConsoleOtpSender`), so the whole flow is testable without them.
3. Run migrations against your Supabase project:
   ```
   pnpm prisma:deploy
   ```
   (`prisma migrate deploy` applies the migrations already committed under
   `prisma/migrations/` — don't use `prisma:migrate`/`migrate dev` against a
   shared project, it will try to create a new migration from schema drift.)
4. Two one-time manual steps in the Supabase Dashboard (can't be done via
   SQL migration):
   - **Auth Hooks (Beta)** → "Customize Access Token (JWT) Claims" → select
     `public.custom_access_token_hook` (created by migration `0002`). This is
     what stamps `profiles.role` onto the JWT as `user_role`, which
     `src/lib/auth/role.ts` / `src/middleware.ts` read for RBAC.
   - **Authentication → Providers → Google**: enable it. Under
     **URL Configuration** add `${NEXT_PUBLIC_APP_URL}/auth/callback**` to the
     redirect URLs (e.g. `http://localhost:3000/auth/callback**`). Google
     sign-in and the email-confirmation link both land there.
   - **Authentication → Providers → Email**: keep "Confirm email" on. Hosts
     are matched to the Admin's invite by email, so the email must be proven.
5. Create your Admin account (admins can't sign up from the UI):
   ```
   pnpm create:admin you@example.com 'a-strong-password' "Your Name"
   ```
6. Seed a dev Admin (`admin@vinstay.test`), 2 invited Field Hosts and 3
   mock Units:
   ```
   pnpm prisma:seed
   ```
   The seeded host emails are fake; add your own real email as a host (as Admin,
   `POST /api/admin/field-hosts`) to test host signup.
7. `pnpm dev` and try the flows. Every login is Google or email + password:
   - `/login` — Khách thuê / Chủ nhà tabs, login and signup.
   - `/admin/login` — Field Host tab (signup only for emails the Admin added) and
     Quản trị tab (email + password, no signup).
   - Phone numbers are not part of login; they are verified by a separate
     Zalo OTP flow when needed (dev mode shows the code on screen).

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Run locally |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest — currently only pure logic (`src/lib/auth/otpCrypto.ts`, `phone.ts`, `actionToken.ts`, `role.ts`) is unit-tested; anything touching Prisma/Supabase directly needs a real project and isn't covered by `pnpm test` yet |
| `pnpm prisma:migrate` | `prisma migrate dev` — only for evolving the schema locally against your own dev project |
| `pnpm prisma:deploy` | `prisma migrate deploy` — apply committed migrations to a shared project |
| `pnpm prisma:seed` | Run `prisma/seed.ts` |
| `pnpm create:admin <email> <password> [name]` | Create an Admin account |

## Known follow-ups (not part of the auth phase)

- `src/lib/notifications/zaloZnsSender.ts` / `smsFallbackSender.ts` are stubs
  that throw — need real credentials + API wiring once available.
- The tenant action-token single-use check (`src/lib/auth/session.ts`,
  `usedActionTokenIds`) is an in-memory `Set` — fine for one dev process, but
  must move to a shared store before a multi-instance deploy.
- RLS is only written for `profiles` so far
  (`prisma/migrations/0003_profiles_rls`). `units`/`viewings`/`holding_deposits`
  need their own policies once those features are built — in particular,
  hiding `units.door_access_code` needs a view/`SECURITY DEFINER` function,
  not a plain row-level policy (RLS is row-level, not column-level).
- `.github/workflows/ci.yml` at the repo root only lints/tests the Python
  `src/` — this app doesn't have a CI job yet.
