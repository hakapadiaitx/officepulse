import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { hashPassword } from "@/lib/auth";

const createSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName:  z.string().min(1).max(50),
  email:     z.string().email(),
  password:  z.string().min(8),
});

// GET — list all HR users for this tenant
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const users = await prisma.user.findMany({
    where: { tenantId, role: "MANAGER" },
    select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}

// POST — create a new HR user (OWNER/ADMIN only)
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const role = (session!.user as any).role as string;
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can grant HR access." }, { status: 403 });
  }

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.errors[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const { firstName, lastName, email, password } = body.data;

  const existing = await prisma.user.findFirst({ where: { email: email.toLowerCase(), tenantId } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists in your workspace." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      tenantId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "MANAGER",
    },
    select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
