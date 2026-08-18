import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const updateSchema = z.object({
  startDate:  z.string().regex(dateRe).optional(),
  endDate:    z.string().regex(dateRe).optional(),
  type:       z.enum(["ANNUAL", "SICK", "PERSONAL", "OTHER"]).optional(),
  reason:     z.string().max(500).nullable().optional(),
  status:     z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  adminNote:  z.string().max(500).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;
  const { id } = await params;

  const existing = await prisma.leaveRequest.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });

  const data = updateSchema.parse(await req.json());

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
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

  const existing = await prisma.leaveRequest.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Leave request not found" }, { status: 404 });

  await prisma.leaveRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
