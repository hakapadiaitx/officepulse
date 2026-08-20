import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth";

const schema = z.object({
  employeeId: z.string(),
  pin:        z.string().length(4).regex(/^\d{4}$/),
});

const LEAVE_TYPES = ["ANNUAL", "SICK", "PERSONAL", "OTHER"] as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const data = schema.parse(await req.json());

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, tenantId: tenant.id, isActive: true },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const pinValid = await verifyPin(data.pin, employee.pinHash);
    if (!pinValid) return NextResponse.json({ error: "Incorrect PIN. Please try again." }, { status: 401 });

    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd   = `${year}-12-31`;

    const [leaves, policies, empAllowances, approvedLeaves] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { employeeId: employee.id, tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.leavePolicy.findMany({ where: { tenantId: tenant.id, year } }),
      prisma.leaveAllowance.findMany({ where: { tenantId: tenant.id, employeeId: employee.id, year } }),
      prisma.leaveRequest.findMany({
        where: {
          tenantId: tenant.id,
          employeeId: employee.id,
          status: "APPROVED",
          startDate: { lte: yearEnd },
          endDate:   { gte: yearStart },
        },
        select: { startDate: true, endDate: true, type: true },
      }),
    ]);

    // Build allowed days: employee override takes priority over policy default
    const allowed: Record<string, number> = { ANNUAL: 0, SICK: 0, PERSONAL: 0, OTHER: 0 };
    for (const p of policies) allowed[p.leaveType] = p.allowedDays;
    for (const a of empAllowances) allowed[a.leaveType] = a.allowedDays;

    // Calculate used days this year per type
    const used: Record<string, number> = { ANNUAL: 0, SICK: 0, PERSONAL: 0, OTHER: 0 };
    for (const leave of approvedLeaves) {
      const effectiveStart = leave.startDate < yearStart ? yearStart : leave.startDate;
      const effectiveEnd   = leave.endDate   > yearEnd   ? yearEnd   : leave.endDate;
      const days = Math.round(
        (new Date(effectiveEnd + "T12:00:00Z").getTime() - new Date(effectiveStart + "T12:00:00Z").getTime()) / 86400000
      ) + 1;
      if (days > 0) used[leave.type] = (used[leave.type] ?? 0) + days;
    }

    const balance: Record<string, { used: number; allowed: number }> = {};
    for (const type of LEAVE_TYPES) {
      balance[type] = { used: used[type] ?? 0, allowed: allowed[type] ?? 0 };
    }

    return NextResponse.json({ leaves, balance, year });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Validation error" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
