import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth";

const schema = z.object({ pin: z.string().length(4).regex(/^\d{4}$/) });

// Public endpoint — validates the company kiosk PIN and returns employee list.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  if (!tenant.kioskPinHash) {
    return NextResponse.json({ error: "Kiosk PIN not configured. Please set it in Settings." }, { status: 403 });
  }

  try {
    const { pin } = schema.parse(await req.json());

    const valid = await verifyPin(pin, tenant.kioskPinHash);
    if (!valid) return NextResponse.json({ error: "Incorrect PIN. Please try again." }, { status: 401 });

    const todayStart = startOfDay(new Date());
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

    return NextResponse.json({
      tenantName: tenant.name,
      brandColor: tenant.brandColor,
      logoUrl: tenant.logoUrl ?? null,
      employees: list,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid PIN format." }, { status: 400 });
    console.error("[kiosk/unlock]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
