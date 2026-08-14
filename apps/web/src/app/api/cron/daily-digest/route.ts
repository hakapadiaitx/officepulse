import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendDailyDigest } from "@/lib/email";

// Vercel Cron calls this at 18:00 UTC every day.
// Secured with CRON_SECRET — Vercel injects this automatically when crons are configured.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayUtc = new Date().toISOString().slice(0, 10); // "2026-08-13"
  const todayStart = new Date(todayUtc + "T00:00:00.000Z");
  const dateLabel = format(new Date(todayUtc + "T12:00:00.000Z"), "EEEE, MMM d yyyy");

  // Fetch all tenants that have digest enabled, with their OWNER user + active employees
  const tenants = await prisma.tenant.findMany({
    where: { digestEnabled: true },
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

  let sent = 0;
  let errors = 0;

  for (const tenant of tenants) {
    const owner = tenant.users[0];
    if (!owner) continue;

    // Build status list
    const employees = tenant.employees.map((emp) => {
      const log = emp.attendanceLogs[0] ?? null;
      let status: "in" | "out" | "not_arrived" | "left" = "not_arrived";
      let lastAction: string | null = null;
      let purpose: string | null = null;

      if (log) {
        if (!log.checkOutTime) {
          status = "in";
          lastAction = log.checkInTime.toISOString();
        } else if (log.isEndOfDay) {
          status = "left";
          lastAction = log.checkOutTime.toISOString();
        } else {
          status = "out";
          lastAction = log.checkOutTime.toISOString();
          purpose = log.purpose;
        }
      }

      return { name: `${emp.firstName} ${emp.lastName}`, status, lastAction, purpose };
    }).sort((a, b) => {
      const order = ["in", "out", "not_arrived", "left"];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });

    // Compute hours tracked today (completed sessions only) — quick query per tenant
    const completedLogs = await prisma.attendanceLog.findMany({
      where: { tenantId: tenant.id, checkInTime: { gte: todayStart }, checkOutTime: { not: null } },
      select: { checkInTime: true, checkOutTime: true },
    });
    const totalMinutes = completedLogs.reduce((sum, log) => {
      if (!log.checkOutTime) return sum;
      return sum + Math.round((log.checkOutTime.getTime() - log.checkInTime.getTime()) / 60000);
    }, 0);

    const stats = {
      inCount:          employees.filter((e) => e.status === "in").length,
      outCount:         employees.filter((e) => e.status === "out").length,
      notArrivedCount:  employees.filter((e) => e.status === "not_arrived").length,
      leftCount:        employees.filter((e) => e.status === "left").length,
      totalMinutes,
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://officepulse.vercel.app";

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
      sent++;
    } catch (err) {
      console.error(`[cron/daily-digest] Failed for tenant ${tenant.id}:`, err);
      errors++;
    }
  }

  console.log(`[cron/daily-digest] Done — ${sent} sent, ${errors} errors`);
  return NextResponse.json({ sent, errors, date: todayUtc });
}
