import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { sendLeaveStatusEmail } from "@/lib/email";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const updateSchema = z.object({
  startDate:  z.string().regex(dateRe).optional(),
  endDate:    z.string().regex(dateRe).optional(),
  type:       z.enum(["ANNUAL", "SICK", "PERSONAL", "OTHER"]).optional(),
  reason:     z.string().max(500).nullable().optional(),
  status:     z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  adminNote:  z.string().max(500).nullable().optional(),
});

const typeLabels: Record<string, string> = {
  ANNUAL: "Annual Leave", SICK: "Sick Leave", PERSONAL: "Personal", OTHER: "Other",
};

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
      employee: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Send status email to employee if status changed to APPROVED or REJECTED and they have an email
  const newStatus     = data.status;
  const statusChanged = newStatus && newStatus !== existing.status;
  const employeeEmail = updated.employee.email;

  if (statusChanged && (newStatus === "APPROVED" || newStatus === "REJECTED") && employeeEmail) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const start  = new Date(updated.startDate + "T12:00:00Z");
    const end    = new Date(updated.endDate   + "T12:00:00Z");
    const days   = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://officepulse.vercel.app";

    await sendLeaveStatusEmail({
      to:                employeeEmail,
      employeeFirstName: updated.employee.firstName,
      companyName:       tenant?.name ?? "Your company",
      status:            newStatus,
      leaveType:         typeLabels[updated.type] ?? updated.type,
      startDate:         updated.startDate,
      endDate:           updated.endDate,
      days,
      adminNote:         updated.adminNote ?? null,
      appUrl,
    }).catch((err) => console.error("[leaves/PATCH] Status email failed:", err));
  }

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
