import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendLateAlert } from "@/lib/email";

// Runs once daily at 09:00 UTC via Vercel Cron.
// Sends a late-arrival alert for every tenant that has it enabled
// and has at least one employee who hasn't arrived today.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayUtc = new Date().toISOString().slice(0, 10);
  const dateLabel = format(new Date(todayUtc + "T12:00:00.000Z"), "EEEE, MMM d yyyy");
  const todayStart = new Date(todayUtc + "T00:00:00.000Z");

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
    const owner = tenant.users[0];
    if (!owner) { skipped++; continue; }

    const lateEmployees = tenant.employees
      .filter((e) => e.attendanceLogs.length === 0)
      .map((e) => ({ name: `${e.firstName} ${e.lastName}` }));

    // Mark as sent even if everyone arrived, to prevent double-sends
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { lateAlertSentDate: todayUtc },
    });

    if (lateEmployees.length === 0) { skipped++; continue; }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://officepulse.vercel.app";

    try {
      await sendLateAlert({
        to: owner.email,
        adminFirstName: owner.firstName,
        companyName: tenant.name,
        date: dateLabel,
        alertTime: "09:00 UTC",
        lateEmployees,
        dashboardUrl: appUrl,
      });
      sent++;
    } catch (err) {
      console.error(`[cron/late-alert] Failed for tenant ${tenant.id}:`, err);
      errors++;
    }
  }

  console.log(`[cron/late-alert] Done — ${sent} sent, ${skipped} skipped, ${errors} errors`);
  return NextResponse.json({ sent, skipped, errors, date: todayUtc });
}
