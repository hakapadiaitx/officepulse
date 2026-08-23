import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const entrySchema = z.object({
  employeeId: z.string().min(1),
  date:       z.string().regex(dateRe),
  startTime:  z.string().regex(timeRe),
  endTime:    z.string().regex(timeRe),
  label:      z.string().max(80).optional().nullable(),
  notes:      z.string().max(300).optional().nullable(),
});

const createSchema = z.object({
  entries: z.array(entrySchema).min(1).max(500),
});

// GET /api/schedule?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const { searchParams } = req.nextUrl;
  const start = searchParams.get("start");
  const end   = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "start and end query params required" }, { status: 400 });
  }

  const entries = await prisma.schedule.findMany({
    where: { tenantId, date: { gte: start, lte: end } },
    select: {
      id: true,
      employeeId: true,
      date: true,
      startTime: true,
      endTime: true,
      label: true,
      notes: true,
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(
    entries.map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      name: `${e.employee.firstName} ${e.employee.lastName}`,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      label: e.label,
      notes: e.notes,
    }))
  );
}

// POST /api/schedule — bulk create
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.errors[0]?.message ?? "Invalid data" }, { status: 400 });
  }

  const { entries } = body.data;

  // Verify all employees belong to this tenant
  const empIds = [...new Set(entries.map((e) => e.employeeId))];
  const emps = await prisma.employee.findMany({
    where: { id: { in: empIds }, tenantId },
    select: { id: true },
  });
  const validIds = new Set(emps.map((e) => e.id));
  if (empIds.some((id) => !validIds.has(id))) {
    return NextResponse.json({ error: "One or more employees not found" }, { status: 400 });
  }

  const created = await prisma.schedule.createMany({
    data: entries.map((e) => ({
      tenantId,
      employeeId: e.employeeId,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      label: e.label ?? null,
      notes: e.notes ?? null,
    })),
    skipDuplicates: false,
  });

  return NextResponse.json({ created: created.count });
}
