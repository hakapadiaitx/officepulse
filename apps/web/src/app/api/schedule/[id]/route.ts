import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;
  const { id } = await params;

  const entry = await prisma.schedule.findFirst({ where: { id, tenantId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.schedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;
  const { id } = await params;

  const entry = await prisma.schedule.findFirst({ where: { id, tenantId } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { startTime, endTime, label, notes } = await req.json();
  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      ...(startTime !== undefined && { startTime }),
      ...(endTime   !== undefined && { endTime }),
      ...(label     !== undefined && { label }),
      ...(notes     !== undefined && { notes }),
    },
  });

  return NextResponse.json(updated);
}
