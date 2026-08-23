import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { sendDailyDigest } from "@/lib/email";

// Manual "send digest now" — called from Settings, uses session auth (no CRON_SECRET needed)
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_placeholder") {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured. Add it in Vercel → Settings → Environment Variables." }, { status: 400 });
  }

  const todayUtc   = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(todayUtc + "T00:00:00.000Z");
  const dateLabel  = format(new Date(todayUtc + "T12:00:00.000Z"), "EEEE, MMM d yyyy");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: { where: { role: "OWNER" }, select: { email: true, firstName: true } },
      employees: {
        where: { isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          attendanceLogs: {
            where: { checkInTime: { gte: todayStart } },
            orderBy: { checkInTime: "desc" },
            take: 1,
            select: { checkInTime: true, checkOutTime: true, isEndOfDay: true, purpose: true },
          },
        },
      },
    },
  });

  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const owner = tenant.users[0];
  if (!owner) return NextResponse.json({ error: "No owner user found for this workspace" }, { status: 400 });

  const employees = tenant.employees.map((emp) => {
    const log = emp.attendanceLogs[0] ?? null;
    let status: "in" | "out" | "not_arrived" | "left" = "not_arrived";
    let lastAction: string | null = null;
    let purpose: string | null = null;

    if (log) {
      if (!log.checkOutTime) {
        status = "in"; lastAction = log.checkInTime.toISOString();
      } else if (log.isEndOfDay) {
        status = "left"; lastAction = log.checkOutTime.toISOString();
      } else {
        status = "out"; lastAction = log.checkOutTime.toISOString(); purpose = log.purpose;
      }
    }
    return { name: `${emp.firstName} ${emp.lastName}`, status, lastAction, purpose };
  }).sort((a, b) => ["in", "out", "not_arrived", "left"].indexOf(a.status) - ["in", "out", "not_arrived", "left"].indexOf(b.status));

  const completedLogs = await prisma.attendanceLog.findMany({
    where: { tenantId, checkInTime: { gte: todayStart }, checkOutTime: { not: null } },
    select: { checkInTime: true, checkOutTime: true },
  });
  const totalMinutes = completedLogs.reduce((sum, log) => {
    if (!log.checkOutTime) return sum;
    return sum + Math.round((log.checkOutTime.getTime() - log.checkInTime.getTime()) / 60000);
  }, 0);

  const stats = {
    inCount:         employees.filter((e) => e.status === "in").length,
    outCount:        employees.filter((e) => e.status === "out").length,
    notArrivedCount: employees.filter((e) => e.status === "not_arrived").length,
    leftCount:       employees.filter((e) => e.status === "left").length,
    totalMinutes,
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://officepulse.us";

  try {
    await sendDailyDigest({
      to: owner.email,
      adminFirstName: owner.firstName,
      companyName: tenant.name,
      date: dateLabel,
      stats,
      employees,
      dashboardUrl: appUrl,
    });
    return NextResponse.json({ success: true, sentTo: owner.email, date: todayUtc });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
