import { NextRequest, NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

// Public endpoint — no session required. Reads status for all employees in a tenant.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const todayStart = startOfDay(new Date());

  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id, isActive: true },
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

    return { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, status, lastAction, purpose };
  });

  return NextResponse.json({
    tenantName: tenant.name,
    brandColor: tenant.brandColor,
    logoUrl: tenant.logoUrl ?? null,
    employees: statusList,
  });
}
