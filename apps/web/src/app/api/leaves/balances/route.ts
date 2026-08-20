import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const yearStart = `${year}-01-01`;
  const yearEnd   = `${year}-12-31`;

  const [employees, policies, approvedLeaves] = await Promise.all([
    prisma.employee.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.leavePolicy.findMany({
      where: { tenantId, year },
    }),
    prisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: "APPROVED",
        startDate: { lte: yearEnd },
        endDate:   { gte: yearStart },
      },
      select: { employeeId: true, startDate: true, endDate: true, type: true },
    }),
  ]);

  // Build allowances map
  const allowances: Record<string, number> = { ANNUAL: 0, SICK: 0, PERSONAL: 0, OTHER: 0 };
  for (const p of policies) allowances[p.leaveType] = p.allowedDays;

  // Calculate used days per employee per type (clipped to the year)
  type UsedMap = Record<string, number>;
  const usedByEmployee: Record<string, UsedMap> = {};

  for (const leave of approvedLeaves) {
    const effectiveStart = leave.startDate < yearStart ? yearStart : leave.startDate;
    const effectiveEnd   = leave.endDate   > yearEnd   ? yearEnd   : leave.endDate;
    const days = Math.round(
      (new Date(effectiveEnd + "T12:00:00Z").getTime() - new Date(effectiveStart + "T12:00:00Z").getTime()) / 86400000
    ) + 1;
    if (days <= 0) continue;

    if (!usedByEmployee[leave.employeeId]) {
      usedByEmployee[leave.employeeId] = { ANNUAL: 0, SICK: 0, PERSONAL: 0, OTHER: 0 };
    }
    usedByEmployee[leave.employeeId][leave.type] =
      (usedByEmployee[leave.employeeId][leave.type] ?? 0) + days;
  }

  const balances = employees.map((emp) => ({
    employeeId: emp.id,
    name: `${emp.firstName} ${emp.lastName}`,
    used: usedByEmployee[emp.id] ?? { ANNUAL: 0, SICK: 0, PERSONAL: 0, OTHER: 0 },
    allowed: allowances,
  }));

  return NextResponse.json({ year, allowances, balances });
}
