import { NextRequest, NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;
  const todayStart = startOfDay(new Date());

  const employees = await prisma.employee.findMany({
    where: { tenantId, isActive: true },
    include: {
      attendanceLogs: {
        where: { checkInTime: { gte: todayStart } },
        orderBy: { checkInTime: "desc" },
        take: 1,
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  type EmpWithLogs = (typeof employees)[number];
  const statusList = employees.map((emp: EmpWithLogs) => {
    const log = emp.attendanceLogs[0] ?? null;
    let status: "not_arrived" | "in" | "out" | "left";
    let lastAction: Date | null = null;
    let purpose: string | null = null;

    if (!log) {
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

    return { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, email: emp.email, status, lastAction, purpose };
  });

  return NextResponse.json(statusList);
}
