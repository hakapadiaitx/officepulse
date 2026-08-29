import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const updateSchema = z.object({
  checkInTime:  z.string().datetime().optional(),
  checkOutTime: z.string().datetime().nullable().optional(),
  isEndOfDay:   z.boolean().optional(),
  purpose:      z.string().max(500).nullable().optional(),
  notes:        z.string().max(1000).nullable().optional(),
  checkInPlace: z.string().max(500).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;
  const { id } = await params;

  const data = updateSchema.parse(await req.json());

  const existing = await prisma.attendanceLog.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  const updated = await prisma.attendanceLog.update({
    where: { id },
    data: {
      ...(data.checkInTime !== undefined  && { checkInTime: new Date(data.checkInTime) }),
      ...(data.checkOutTime !== undefined && { checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : null }),
      ...(data.isEndOfDay !== undefined   && { isEndOfDay: data.isEndOfDay }),
      ...(data.purpose !== undefined      && { purpose: data.purpose }),
      ...(data.notes !== undefined        && { notes: data.notes }),
      ...(data.checkInPlace !== undefined && { checkInPlace: data.checkInPlace }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;
  const { id } = await params;

  const existing = await prisma.attendanceLog.findFirst({ where: { id, tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  await prisma.attendanceLog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
