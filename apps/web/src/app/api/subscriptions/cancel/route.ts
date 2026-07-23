import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { sendCancellationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try { getStripe(); } catch {
    return NextResponse.json({ error: "Payments not configured." }, { status: 503 });
  }

  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: "OWNER" }, take: 1 } },
    });

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    if (!tenant.stripeSubscriptionId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }
    if (tenant.cancelAtPeriodEnd) {
      return NextResponse.json({ error: "Subscription is already scheduled for cancellation" }, { status: 400 });
    }

    // Cancel at period end — customer keeps access until billing cycle ends
    const subscription = await getStripe().subscriptions.update(tenant.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    const accessEndsAt = new Date(subscription.current_period_end * 1000);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { cancelAtPeriodEnd: true },
    });

    // Send cancellation email to the owner
    const owner = tenant.users[0];
    if (owner) {
      const planId = (session!.user as any).planId as string | undefined;
      const plan = PLANS.find((p) => p.id === planId);
      let appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "https://officepulse.app";
      if (!appUrl.startsWith("http")) appUrl = `https://${appUrl}`;
      const baseUrl = new URL(appUrl).origin;

      await sendCancellationEmail({
        to: owner.email,
        firstName: owner.firstName,
        companyName: tenant.name,
        planName: plan?.name ?? "paid",
        accessEndsAt,
        loginUrl: `${baseUrl}/pricing`,
      });
    }

    return NextResponse.json({
      cancelled: true,
      accessEndsAt: accessEndsAt.toISOString(),
    });
  } catch (err) {
    console.error("[cancel subscription]", err);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
