import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendLateAlert } from "@/lib/email";

// Runs every 15 minutes via Vercel Cron.
// Fires an alert for any tenant whose lateAlertTime falls within the current
// 15-minute window, and hasn't already been alerted today.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const todayUtc = now.toISOString().slice(0, 10);
  const dateLabel = format(new Date(todayUtc + "T12:00:00.000Z"), "EEEE, MMM d yyyy");
  const todayStart = new Date(todayUtc + "T00:00:00.000Z");

  // Fetch tenants with alert enabled that haven't been notified today
  const tenants = await prisma.tenant.findMany({
    where: {
      lateAlertEnabled: true,
      OR: [
        { lateAlertSentDate: null },
        { lateAlertSentDate: { not: todayUtc } },
      ],
    },
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
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const tenant of tenants) {
    // Check if current time is within the 15-minute window after alert time
    const [h, m] = tenant.lateAlertTime.split(":").map(Number);
    const alertMinutes = h * 60 + m;
    if (nowMinutes < alertMinutes || nowMinutes >= alertMinutes + 15) {
      skipped++;
      continue;
    }

    const owner = tenant.users[0];
    if (!owner) { skipped++; continue; }

    const lateEmployees = tenant.employees
      .filter((e) => e.attendanceLogs.length === 0)
      .map((e) => ({ name: `${e.firstName} ${e.lastName}` }));

    if (lateEmployees.length === 0) {
      // Everyone arrived — mark as sent so we don't re-check
      await prisma.tenant.update({ where: { id: tenant.id }, data: { lateAlertSentDate: todayUtc } });
      skipped++;
      continue;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://officepulse.vercel.app";

    try {
      await sendLateAlert({
        to: owner.email,
        adminFirstName: owner.firstName,
        companyName: tenant.name,
        date: dateLabel,
        alertTime: tenant.lateAlertTime,
        lateEmployees,
        dashboardUrl: appUrl,
      });
      await prisma.tenant.update({ where: { id: tenant.id }, data: { lateAlertSentDate: todayUtc } });
      sent++;
    } catch (err) {
      console.error(`[cron/late-alert] Failed for tenant ${tenant.id}:`, err);
      errors++;
    }
  }

  console.log(`[cron/late-alert] Done — ${sent} sent, ${skipped} skipped, ${errors} errors`);
  return NextResponse.json({ sent, skipped, errors, nowUtc: `${String(now.getUTCHours()).padStart(2,"0")}:${String(now.getUTCMinutes()).padStart(2,"0")}` });
}
