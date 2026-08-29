import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { verifyPin } from "@/lib/auth";

const checkOutSchema = z.object({
  employeeId: z.string(),
  pin: z.string().length(4).regex(/^\d{4}$/),
  checkOutTime: z.string().datetime(),
  isEndOfDay: z.boolean().default(false),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  purpose: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
}).refine((d) => d.isEndOfDay || (d.purpose && d.purpose.trim().length > 0), {
  message: "Purpose is required when checking out temporarily",
  path: ["purpose"],
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = { tenantId };
  if (status === "out") {
    where.checkOutTime = { not: null };
  } else if (status === "in") {
    where.checkOutTime = null;
  }

  const logs = await prisma.attendanceLog.findMany({
    where,
    orderBy: { checkInTime: "desc" },
    take: 100,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(logs);
}

// Check OUT — employee leaves the office.
// Finds the open session (checkOutTime = null) and closes it.
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;

  try {
    const body = await req.json();
    const data = checkOutSchema.parse(body);

    const [employee, tenant] = await Promise.all([
      prisma.employee.findFirst({ where: { id: data.employeeId, tenantId, isActive: true } }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { requireGeolocation: true } }),
    ]);
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    if (tenant?.requireGeolocation && (data.lat == null || data.lng == null)) {
      return NextResponse.json(
        { error: "Location is required for check-out. Please allow location access and try again." },
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
      orderBy: { checkInTime: "desc" },
    });

    if (!openSession) {
      return NextResponse.json(
        { error: "Employee has not checked in yet. Please check in first." },
        { status: 409 }
      );
    }

    const log = await prisma.attendanceLog.update({
      where: { id: openSession.id },
      data: {
        checkOutTime: new Date(data.checkOutTime),
        isEndOfDay: data.isEndOfDay,
        purpose: data.purpose ?? null,
        notes: data.notes ?? null,
        checkOutLat: data.lat ?? null,
        checkOutLng: data.lng ?? null,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });

    return NextResponse.json({ log, status: "out" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
