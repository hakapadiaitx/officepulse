import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { hashPin } from "@/lib/auth";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const tenantId = getTenantId(session)!;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { kioskPinHash: true } });

  return NextResponse.json({ hasPin: !!tenant?.kioskPinHash });
}

const schema = z.object({ pin: z.string().length(4).regex(/^\d{4}$/) });

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const tenantId = getTenantId(session)!;

  try {
    const { pin } = schema.parse(await req.json());
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { kioskPinHash: await hashPin(pin) },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });
    console.error("[kiosk-pin PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const tenantId = getTenantId(session)!;
  await prisma.tenant.update({ where: { id: tenantId }, data: { kioskPinHash: null } });
  return NextResponse.json({ ok: true });
}
