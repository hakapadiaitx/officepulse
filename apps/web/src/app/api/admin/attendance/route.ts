import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

// GET ?employeeId=X&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const employeeId = req.nextUrl.searchParams.get("employeeId");
  const date = req.nextUrl.searchParams.get("date");
  if (!employeeId || !date) {
    return NextResponse.json({ error: "employeeId and date required" }, { status: 400 });
  }

  const dayStart = new Date(date + "T00:00:00.000Z");
  const dayEnd   = new Date(date + "T23:59:59.999Z");

  const logs = await prisma.attendanceLog.findMany({
    where: {
      tenantId,
      employeeId,
      checkInTime: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { checkInTime: "asc" },
  });

  return NextResponse.json(logs);
}

const createSchema = z.object({
  employeeId:  z.string(),
  checkInTime: z.string().datetime(),
  checkOutTime: z.string().datetime().optional().nullable(),
  isEndOfDay:  z.boolean().default(false),
  purpose:     z.string().max(500).optional().nullable(),
  notes:       z.string().max(1000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const data = createSchema.parse(await req.json());

  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, tenantId, isActive: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const log = await prisma.attendanceLog.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      checkInTime:  new Date(data.checkInTime),
      checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : null,
      isEndOfDay:   data.isEndOfDay,
      purpose:      data.purpose ?? null,
      notes:        data.notes ?? null,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
