import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth";

const schema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Public endpoint — validates the company kiosk PIN and returns employee list.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  if (!tenant.kioskPinHash) {
    return NextResponse.json({ error: "Kiosk PIN not configured. Please set it in Settings." }, { status: 403 });
  }

  try {
    const { pin, localDate } = schema.parse(await req.json());

    const valid = await verifyPin(pin, tenant.kioskPinHash);
    if (!valid) return NextResponse.json({ error: "Incorrect PIN. Please try again." }, { status: 401 });

    const todayStart = localDate
      ? new Date(localDate + "T00:00:00.000Z")
      : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    const employees = await prisma.employee.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: {
        attendanceLogs: {
          where: { checkInTime: { gte: todayStart } },
          orderBy: { checkInTime: "desc" },
          take: 1,
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    const list = employees.map((emp) => {
      const log = emp.attendanceLogs[0] ?? null;
      let status: "not_arrived" | "in" | "out" | "left";
      if (!log) status = "not_arrived";
      else if (!log.checkOutTime) status = "in";
      else if (log.isEndOfDay) status = "left";
      else status = "out";

      return {
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        status,
        lastAction: log ? (log.checkOutTime ?? log.checkInTime)?.toISOString() ?? null : null,
        purpose: log?.purpose ?? null,
      };
    });

    // Issue a short-lived token so the kiosk can call admin correction routes
    // without a NextAuth session. requireAuth() accepts this same JWT format.
    const kioskToken = jwt.sign(
      { tenantId: tenant.id, tenantSlug: slug, role: "OWNER" },
      process.env.NEXTAUTH_SECRET!,
      { subject: tenant.id, expiresIn: "12h" }
    );

    return NextResponse.json({
      tenantName: tenant.name,
      brandColor: tenant.brandColor,
      logoUrl: tenant.logoUrl ?? null,
      employees: list,
      kioskToken,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid PIN format." }, { status: 400 });
    console.error("[kiosk/unlock]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
