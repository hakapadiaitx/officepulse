import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth";
import { addDays, format } from "date-fns";

const schema = z.object({
  pin:   z.string().length(4).regex(/^\d{4}$/),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// POST — verify employee PIN then return their personal schedule for the week.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { pin, start: startParam } = body.data;

  // Verify PIN
  const employees = await prisma.employee.findMany({
    where: { tenantId: tenant.id, isActive: true },
    select: { id: true, firstName: true, lastName: true, pinHash: true },
  });

  let matched: (typeof employees)[number] | null = null;
  for (const emp of employees) {
    if (emp.pinHash && (await verifyPin(pin, emp.pinHash))) { matched = emp; break; }
  }
  if (!matched) return NextResponse.json({ error: "Invalid PIN. Please try again." }, { status: 401 });

  const start = startParam ?? format(new Date(), "yyyy-MM-dd");
  const end   = format(addDays(new Date(start + "T12:00:00Z"), 6), "yyyy-MM-dd");

  const entries = await prisma.schedule.findMany({
    where: { tenantId: tenant.id, employeeId: matched.id, date: { gte: start, lte: end } },
    select: { date: true, startTime: true, endTime: true, label: true, notes: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // Group by date
  const byDate: Record<string, { startTime: string; endTime: string; label: string | null; notes: string | null }[]> = {};
  for (const e of entries) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push({ startTime: e.startTime, endTime: e.endTime, label: e.label, notes: e.notes });
  }

  return NextResponse.json({
    employee: { id: matched.id, name: `${matched.firstName} ${matched.lastName}` },
    start,
    end,
    byDate,
  });
}
