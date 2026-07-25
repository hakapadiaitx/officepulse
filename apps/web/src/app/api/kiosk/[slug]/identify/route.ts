import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth";

const schema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/),
});

// Public endpoint — identifies an employee by PIN within a tenant.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const { pin } = schema.parse(await req.json());
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
    });

    let matched: (typeof employees)[number] | null = null;
    for (const emp of employees) {
      if (await verifyPin(pin, emp.pinHash)) { matched = emp; break; }
    }

    if (!matched) {
      return NextResponse.json({ error: "Invalid PIN. Please try again." }, { status: 401 });
    }

    const log = matched.attendanceLogs[0] ?? null;
    let status: "not_arrived" | "in" | "out" | "left";
    if (!log) status = "not_arrived";
    else if (!log.checkOutTime) status = "in";
    else if (log.isEndOfDay) status = "left";
    else status = "out";

    return NextResponse.json({
      employee: { id: matched.id, firstName: matched.firstName, lastName: matched.lastName },
      status,
      lastAction: log ? (log.checkOutTime ?? log.checkInTime)?.toISOString() ?? null : null,
      purpose: log?.purpose ?? null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 });
    }
    console.error("[kiosk/identify]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
