import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const daysAhead = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const endDate  = new Date(today);
  endDate.setDate(endDate.getDate() + daysAhead - 1);
  const endStr = endDate.toISOString().slice(0, 10);

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      tenantId: tenant.id,
      status: "APPROVED",
      startDate: { lte: endStr },
      endDate:   { gte: todayStr },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      type: true,
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startDate: "asc" },
  });

  // Expand each leave into individual days within our window
  const dayMap: Record<string, { name: string; type: string; startDate: string; endDate: string }[]> = {};

  for (const leave of leaves) {
    const start = leave.startDate < todayStr ? todayStr : leave.startDate;
    const end   = leave.endDate   > endStr   ? endStr   : leave.endDate;

    const cur = new Date(start + "T12:00:00Z");
    const fin = new Date(end   + "T12:00:00Z");

    while (cur <= fin) {
      const d = cur.toISOString().slice(0, 10);
      if (!dayMap[d]) dayMap[d] = [];
      dayMap[d].push({
        name: `${leave.employee.firstName} ${leave.employee.lastName}`,
        type: leave.type,
        startDate: leave.startDate,
        endDate: leave.endDate,
      });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  const result = Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, employees]) => ({ date, employees }));

  return NextResponse.json({ days: result, today: todayStr });
}
