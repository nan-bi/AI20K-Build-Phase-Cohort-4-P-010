import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email().max(120),
  assignedBlock: z.string().min(1).optional(),
  rfidCardNumber: z.string().min(1),
});

async function guardAdmin() {
  try {
    return { user: await requireRole(["admin"]), response: undefined };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }), user: undefined };
    }
    if (err instanceof ForbiddenError) {
      return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }), user: undefined };
    }
    throw err;
  }
}

/** Admin's Field Host list; `registered` = the host has signed up and claimed the row. */
export async function GET() {
  const guard = await guardAdmin();
  if (guard.response) return guard.response;

  const hosts = await prisma.fieldHost.findMany({
    orderBy: { createdAt: "desc" },
    include: { profile: { select: { fullName: true, phone: true } } },
  });
  return NextResponse.json({ hosts: hosts.map((h) => ({ ...h, registered: h.userId !== null })) });
}

/**
 * Admin adds a Field Host by email (PRD: hosts are added by Admin). The host
 * then signs up themselves at /admin/login with Google or email + password;
 * lib/auth/profile.ts links this row to their new Profile.
 */
export async function POST(request: NextRequest) {
  const guard = await guardAdmin();
  if (guard.response) return guard.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  if (await prisma.fieldHost.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "email_already_registered" }, { status: 409 });
  }

  const host = await prisma.fieldHost.create({
    data: { email, assignedBlock: parsed.data.assignedBlock, rfidCardNumber: parsed.data.rfidCardNumber },
  });
  return NextResponse.json({ ok: true, host }, { status: 201 });
}
