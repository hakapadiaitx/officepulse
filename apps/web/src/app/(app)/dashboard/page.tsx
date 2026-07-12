import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { EmployeeStatusList } from "@/components/dashboard/EmployeeStatusList";
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const tenantId = (session?.user as any)?.tenantId as string;

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [totalEmployees, employees, completedToday] = await Promise.all([
    prisma.employee.count({ where: { tenantId, isActive: true } }),
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
      where: { tenantId, checkInTime: { gte: todayStart, lte: todayEnd }, checkOutTime: { not: null } },
    }),
  ]);

  type Emp = (typeof employees)[number];

  const statusList = employees.map((emp: Emp) => {
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

  const todayMinutes = completedToday.reduce((sum: number, log: (typeof completedToday)[number]) => {
    if (!log.checkOutTime) return sum;
    return sum + Math.round((log.checkOutTime.getTime() - log.checkInTime.getTime()) / 60000);
  }, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <DashboardStats
        totalEmployees={totalEmployees}
        inCount={statusList.filter((e) => e.status === "in").length}
        outCount={statusList.filter((e) => e.status === "out").length}
        notArrivedCount={statusList.filter((e) => e.status === "not_arrived").length}
        leftCount={statusList.filter((e) => e.status === "left").length}
        todayMinutes={todayMinutes}
      />
      <EmployeeStatusList employees={statusList} />
    </div>
  );
}
