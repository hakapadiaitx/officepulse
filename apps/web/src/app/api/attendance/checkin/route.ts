import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { verifyPin } from "@/lib/auth";

const schema = z.object({
  employeeId: z.string(),
  pin: z.string().length(4).regex(/^\d{4}$/),
  checkInTime: z.string().datetime(),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
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

    const [employee, tenant] = await Promise.all([
      prisma.employee.findFirst({ where: { id: data.employeeId, tenantId, isActive: true } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { requireGeolocation: true } }),
    ]);
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    if (tenant?.requireGeolocation && (data.lat == null || data.lng == null)) {
      return NextResponse.json(
        { error: "Location is required for check-in. Please allow location access and try again." },
        { status: 422 }
      );
    }

    const pinValid = await verifyPin(data.pin, employee.pinHash);
    if (!pinValid) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });

    const todayStart = data.localDate
      ? new Date(data.localDate + "T00:00:00.000Z")
      : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");

    const openSession = await prisma.attendanceLog.findFirst({
      where: {
        employeeId: data.employeeId,
        tenantId,
        checkInTime: { gte: todayStart },
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
        checkInLat: data.lat ?? null,
        checkInLng: data.lng ?? null,
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
