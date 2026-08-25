import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, format } from "date-fns";

// Public endpoint — returns 7 days of schedule starting from ?date= (defaults to today)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = req.nextUrl;
  const startParam = searchParams.get("date");
  const start = startParam ?? format(new Date(), "yyyy-MM-dd");
  const end   = format(addDays(new Date(start + "T12:00:00Z"), 6), "yyyy-MM-dd");

  const entries = await prisma.schedule.findMany({
    where: { tenantId: tenant.id, date: { gte: start, lte: end } },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      label: true,
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Group by date
  const byDate: Record<string, { name: string; startTime: string; endTime: string; label: string | null }[]> = {};
  for (const e of entries) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push({
      name: `${e.employee.firstName} ${e.employee.lastName}`,
      startTime: e.startTime,
      endTime: e.endTime,
      label: e.label,
    });
  }

  return NextResponse.json({ start, end, byDate });
}
