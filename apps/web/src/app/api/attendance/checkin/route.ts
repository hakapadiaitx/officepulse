import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { verifyPin } from "@/lib/auth";

const schema = z.object({
  employeeId: z.string(),
  pin: z.string().length(4).regex(/^\d{4}$/),
  checkInTime: z.string().datetime(),
});

// Check IN — employee arrives or returns to office.
// Creates a new log with checkOutTime = null (open session).
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, tenantId, isActive: true },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const pinValid = await verifyPin(data.pin, employee.pinHash);
    if (!pinValid) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });

    // Block if employee already has an open session today (already checked in)
    const openSession = await prisma.attendanceLog.findFirst({
      where: {
        employeeId: data.employeeId,
        tenantId,
        checkInTime: { gte: startOfDay(new Date()) },
        checkOutTime: null,
      },
    });
    if (openSession) {
      return NextResponse.json({ error: "Employee is already in the office" }, { status: 409 });
    }

    const log = await prisma.attendanceLog.create({
      data: {
        tenantId,
        employeeId: data.employeeId,
        checkInTime: new Date(data.checkInTime),
        checkOutTime: null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    return NextResponse.json({ log, status: "in" }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
