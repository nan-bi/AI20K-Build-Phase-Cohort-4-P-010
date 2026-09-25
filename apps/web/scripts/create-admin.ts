/**
 * Creates an Admin account (email + password). Admins can't sign up from the
 * UI — this is the only way one comes into existence. Run locally:
 *
 *   pnpm create:admin you@example.com 'a-strong-password' ["Full Name"]
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

async function main() {
  const [email, password, fullName] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: pnpm create:admin <email> <password> [full name]");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  }
  const supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("Failed to create Supabase user.");

  await prisma.profile.create({
    data: {
      id: data.user.id,
      email: email.toLowerCase(),
      role: "admin",
      fullName: fullName ?? null,
      status: "active",
    },
  });
  console.log(`created admin ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
