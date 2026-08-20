import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no session required. Reads status for all employees in a tenant.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  // Use the client's local date so UTC midnight on the server never resets statuses
  // mid-business-day for users in non-UTC timezones.
  const localDate = req.nextUrl.searchParams.get("localDate");
  const todayStr = localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate)
    ? localDate
    : new Date().toISOString().slice(0, 10);
  const todayStart = new Date(todayStr + "T00:00:00.000Z");

  const [employees, approvedLeaves] = await Promise.all([
    prisma.employee.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: {
        attendanceLogs: {
          where: { checkInTime: { gte: todayStart } },
          orderBy: { checkInTime: "desc" },
          take: 1,
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.leaveRequest.findMany({
      where: {
        tenantId: tenant.id,
        status: "APPROVED",
        startDate: { lte: todayStr },
        endDate:   { gte: todayStr },
      },
      select: { employeeId: true },
    }),
  ]);

  const onLeaveIds = new Set(approvedLeaves.map((l) => l.employeeId));

  type EmpWithLogs = (typeof employees)[number];
  const statusList = employees.map((emp: EmpWithLogs) => {
    const log = emp.attendanceLogs[0] ?? null;
    let status: "not_arrived" | "in" | "out" | "left" | "on_leave";
    let lastAction: Date | null = null;
    let purpose: string | null = null;

    if (!log && onLeaveIds.has(emp.id)) {
      status = "on_leave";
    } else if (!log) {
      status = "not_arrived";
    } else if (!log.checkOutTime) {
      status = "in";
      lastAction = log.checkInTime;
    } else if (log.isEndOfDay) {
      status = "left";
      lastAction = log.checkOutTime;
    } else {
      status = "out";
      lastAction = log.checkOutTime;
      purpose = log.purpose;
    }

    return { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, status, lastAction, purpose };
  });

  return NextResponse.json({
    tenantName: tenant.name,
    brandColor: tenant.brandColor,
    logoUrl: tenant.logoUrl ?? null,
    employees: statusList,
  });
}
