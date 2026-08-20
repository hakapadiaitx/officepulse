import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const LEAVE_TYPES = ["ANNUAL", "SICK", "PERSONAL", "OTHER"] as const;

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const yearStart = `${year}-01-01`;
  const yearEnd   = `${year}-12-31`;

  const [employees, policies, empAllowances, approvedLeaves] = await Promise.all([
    prisma.employee.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.leavePolicy.findMany({ where: { tenantId, year } }),
    prisma.leaveAllowance.findMany({ where: { tenantId, year } }),
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

  // Policy defaults
  const policyDefaults: Record<string, number> = { ANNUAL: 0, SICK: 0, PERSONAL: 0, OTHER: 0 };
  for (const p of policies) policyDefaults[p.leaveType] = p.allowedDays;

  // Per-employee overrides: { employeeId -> { leaveType -> days } }
  const overridesByEmployee: Record<string, Record<string, number>> = {};
  for (const a of empAllowances) {
    if (!overridesByEmployee[a.employeeId]) overridesByEmployee[a.employeeId] = {};
    overridesByEmployee[a.employeeId][a.leaveType] = a.allowedDays;
  }

  // Used days per employee per type
  const usedByEmployee: Record<string, Record<string, number>> = {};
  for (const leave of approvedLeaves) {
    const effectiveStart = leave.startDate < yearStart ? yearStart : leave.startDate;
    const effectiveEnd   = leave.endDate   > yearEnd   ? yearEnd   : leave.endDate;
    const days = Math.round(
      (new Date(effectiveEnd + "T12:00:00Z").getTime() - new Date(effectiveStart + "T12:00:00Z").getTime()) / 86400000
    ) + 1;
    if (days <= 0) continue;
    if (!usedByEmployee[leave.employeeId]) usedByEmployee[leave.employeeId] = {};
    usedByEmployee[leave.employeeId][leave.type] = (usedByEmployee[leave.employeeId][leave.type] ?? 0) + days;
  }

  const balances = employees.map((emp) => {
    const overrides = overridesByEmployee[emp.id] ?? {};
    const allowed: Record<string, number> = {};
    const isCustom: Record<string, boolean> = {};

    for (const type of LEAVE_TYPES) {
      if (type in overrides) {
        allowed[type] = overrides[type];
        isCustom[type] = true;
      } else {
        allowed[type] = policyDefaults[type];
        isCustom[type] = false;
      }
    }

    return {
      employeeId: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      used: { ANNUAL: 0, SICK: 0, PERSONAL: 0, OTHER: 0, ...(usedByEmployee[emp.id] ?? {}) },
      allowed,
      isCustom,
      // Raw overrides so the UI can pre-fill the editor
      overrides,
    };
  });

  return NextResponse.json({ year, policyDefaults, balances });
}
