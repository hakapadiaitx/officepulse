import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth";

const schema = z.object({
  action: z.enum(["arrive", "checkout", "return", "leave"]),
  employeeId: z.string(),
  pin: z.string().length(4).regex(/^\d{4}$/),
  timestamp: z.string().datetime(),
  purpose: z.string().min(1).max(500).optional(),
  notes: z.string().max(1000).optional(),
});

// Public endpoint — authenticated only by employee PIN.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, tenantId: tenant.id, isActive: true },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const pinValid = await verifyPin(data.pin, employee.pinHash);
    if (!pinValid) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });

    const todayStart = startOfDay(new Date());
    const ts = new Date(data.timestamp);

    // ARRIVE or RETURN — open a new session
    if (data.action === "arrive" || data.action === "return") {
      const openSession = await prisma.attendanceLog.findFirst({
        where: { employeeId: employee.id, tenantId: tenant.id, checkInTime: { gte: todayStart }, checkOutTime: null },
      });
      if (openSession) {
        return NextResponse.json({ error: "Already checked in" }, { status: 409 });
      }
      const log = await prisma.attendanceLog.create({
        data: { tenantId: tenant.id, employeeId: employee.id, checkInTime: ts },
      });
      return NextResponse.json({ log, status: "in" });
    }

    // CHECKOUT or LEAVE — close the open session
    if (data.action === "checkout" || data.action === "leave") {
      if (data.action === "checkout" && !data.purpose?.trim()) {
        return NextResponse.json({ error: "Purpose is required when checking out" }, { status: 400 });
      }
      const openSession = await prisma.attendanceLog.findFirst({
        where: { employeeId: employee.id, tenantId: tenant.id, checkInTime: { gte: todayStart }, checkOutTime: null },
        orderBy: { checkInTime: "desc" },
      });
      if (!openSession) {
        return NextResponse.json({ error: "No active session — please arrive first" }, { status: 409 });
      }
      const log = await prisma.attendanceLog.update({
        where: { id: openSession.id },
        data: {
          checkOutTime: ts,
          isEndOfDay: data.action === "leave",
          purpose: data.purpose ?? null,
          notes: data.notes ?? null,
        },
      });
      return NextResponse.json({ log, status: data.action === "leave" ? "left" : "out" });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Validation error" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
