import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;
  const localDate = req.nextUrl.searchParams.get("localDate");
  const dateStr = (localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate))
    ? localDate
    : new Date().toISOString().slice(0, 10);

  const todayStart = new Date(dateStr + "T00:00:00.000Z");

  const [employees, completedToday, approvedLeaves] = await Promise.all([
    prisma.employee.findMany({
      where: { tenantId, isActive: true },
      include: {
        attendanceLogs: {
          where: { checkInTime: { gte: todayStart } },
          orderBy: { checkInTime: "desc" },
          take: 1,
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.attendanceLog.findMany({
      where: { tenantId, checkInTime: { gte: todayStart }, checkOutTime: { not: null } },
      select: { checkInTime: true, checkOutTime: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        tenantId,
        status: "APPROVED",
        startDate: { lte: dateStr },
        endDate:   { gte: dateStr },
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

    if (!log) {
      status = onLeaveIds.has(emp.id) ? "on_leave" : "not_arrived";
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

    return { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, email: emp.email, status, lastAction, purpose, hasLocation: log?.checkInLat != null, checkInPlace: log?.checkInPlace ?? null, checkInLat: log?.checkInLat ?? null, checkInLng: log?.checkInLng ?? null, checkInLogId: log?.id ?? null };
  });

  const todayMinutes = completedToday.reduce((sum, log) => {
    if (!log.checkOutTime) return sum;
    return sum + Math.round((log.checkOutTime.getTime() - log.checkInTime.getTime()) / 60000);
  }, 0);

  return NextResponse.json({ employees: statusList, todayMinutes });
}
