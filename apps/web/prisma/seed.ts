/**
 * Dev seed: a default Admin account, 2 invited Field Hosts and 3 mock
 * Units — same unit data shape as the old schema.sql seed, minus
 * landlord_name/landlord_phone (units start unowned, landlordId: null).
 *
 * Hosts are only invited here (a field_hosts row with no account yet); they sign up
 * themselves at /admin/login with Google or email + password using that email.
 * The Admin is a real account (email + SEED_ADMIN_PASSWORD, default below —
 * dev only) since admins can't sign up from the UI.
 *
 * Requires real Supabase project credentials in apps/web/.env
 * (SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL) — this will fail
 * against placeholder values.
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

// Inlined rather than importing src/lib/supabase/admin.ts: that module
// `import`s "server-only", which throws when loaded outside Next.js's
// react-server bundler condition (i.e. from this plain tsx script).
function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@vinstay.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "123456!";

const FIELD_HOSTS = [
  {
    email: "host1@vinstay.test",
    assignedBlock: "Vinhomes Ocean Park - The Sapphire 1",
    rfidCardNumber: "RFID-S1-0001",
  },
  {
    email: "host2@vinstay.test",
    assignedBlock: "Vinhomes Ocean Park - The Sapphire 2",
    rfidCardNumber: "RFID-S2-0001",
  },
];

const UNITS = [
  {
    unitCode: "VHOP-S1.02-12A08",
    blockName: "S1.02",
    floorNumber: 12,
    layoutType: "TwoPn1Wc" as const,
    netAreaSqm: "52.30",
    baseRentPrice: "9500000",
    managementFee: "496850",
    marketAvgPrice: "10800000",
    verifiedImages: [],
  },
  {
    unitCode: "VHOP-S1.05-0804",
    blockName: "S1.05",
    floorNumber: 8,
    layoutType: "Studio" as const,
    netAreaSqm: "32.10",
    baseRentPrice: "6800000",
    managementFee: "304950",
    marketAvgPrice: "7500000",
    verifiedImages: [],
  },
  {
    unitCode: "VHOP-S2.01-1812",
    blockName: "S2.01",
    floorNumber: 18,
    layoutType: "ThreePn" as const,
    netAreaSqm: "78.60",
    baseRentPrice: "14500000",
    managementFee: "746700",
    marketAvgPrice: "15200000",
    verifiedImages: [],
  },
];

async function main() {
  const supabaseAdmin = createSupabaseAdminClient();

  if (await prisma.profile.findUnique({ where: { email: ADMIN_EMAIL } })) {
    console.log(`skip existing admin ${ADMIN_EMAIL}`);
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("Failed to create Supabase admin user.");
    await prisma.profile.create({
      data: { id: data.user.id, email: ADMIN_EMAIL, role: "admin", fullName: "Admin", status: "active" },
    });
    console.log(`created admin ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  for (const host of FIELD_HOSTS) {
    await prisma.fieldHost.upsert({ where: { email: host.email }, update: {}, create: host });
    console.log(`ensured field host ${host.email}`);
  }

  for (const unit of UNITS) {
    await prisma.unit.upsert({
      where: { unitCode: unit.unitCode },
      update: {},
      create: unit,
    });
    console.log(`ensured unit ${unit.unitCode}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
