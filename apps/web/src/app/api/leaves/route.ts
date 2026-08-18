import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { sendLeaveRequestNotification } from "@/lib/email";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  employeeId: z.string(),
  startDate:  z.string().regex(dateRe),
  endDate:    z.string().regex(dateRe),
  type:       z.enum(["ANNUAL", "SICK", "PERSONAL", "OTHER"]).default("ANNUAL"),
  reason:     z.string().max(500).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const statusFilter = req.nextUrl.searchParams.get("status");

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      ...(statusFilter && statusFilter !== "ALL" && { status: statusFilter as "PENDING" | "APPROVED" | "REJECTED" }),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leaves);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const data = createSchema.parse(await req.json());

  if (data.endDate < data.startDate) {
    return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 });
  }

  const [employee, tenant] = await Promise.all([
    prisma.employee.findFirst({
      where: { id: data.employeeId, tenantId, isActive: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: "OWNER" }, select: { email: true, firstName: true } } },
    }),
  ]);

  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  // Always create as PENDING — admin approves/rejects via the list
  const leave = await prisma.leaveRequest.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      startDate:  data.startDate,
      endDate:    data.endDate,
      type:       data.type,
      reason:     data.reason ?? null,
      status:     "PENDING",
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  // Notify the tenant owner by email
  const owner = tenant?.users[0];
  if (owner) {
    const start = new Date(data.startDate + "T12:00:00Z");
    const end   = new Date(data.endDate   + "T12:00:00Z");
    const days  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    const typeLabels: Record<string, string> = {
      ANNUAL: "Annual Leave", SICK: "Sick Leave", PERSONAL: "Personal", OTHER: "Other",
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://officepulse.vercel.app";

    sendLeaveRequestNotification({
      to:              owner.email,
      adminFirstName:  owner.firstName,
      companyName:     tenant!.name,
      employeeName:    `${employee.firstName} ${employee.lastName}`,
      leaveType:       typeLabels[data.type] ?? data.type,
      startDate:       data.startDate,
      endDate:         data.endDate,
      days,
      reason:          data.reason ?? null,
      appUrl,
    }).catch((err) => console.error("[leaves/POST] Email notification failed:", err));
  }

  return NextResponse.json(leave, { status: 201 });
}
