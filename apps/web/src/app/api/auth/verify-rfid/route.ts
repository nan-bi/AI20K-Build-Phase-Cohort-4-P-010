import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ hostId: z.string().uuid(), rfid: z.string().min(1).max(100) });

/**
 * Field Host enters their RFID card number (given by Admin) to complete
 * their first login. This links the FieldHost row to their Profile.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const host = await prisma.fieldHost.findUnique({
    where: { id: parsed.data.hostId },
  });
  if (!host || host.email !== user.email || host.userId) {
    return NextResponse.json({ error: "invalid_host" }, { status: 400 });
  }

  // Case-insensitive comparison since RFIDs are usually entered by hand
  if (host.rfidCardNumber.toLowerCase() !== parsed.data.rfid.toLowerCase()) {
    return NextResponse.json({ error: "rfid_mismatch" }, { status: 403 });
  }

  await prisma.fieldHost.update({ where: { id: host.id }, data: { userId: user.id } });
  await prisma.profile.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return NextResponse.json({ ok: true });
}
