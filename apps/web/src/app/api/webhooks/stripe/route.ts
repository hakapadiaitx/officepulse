import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret === "whsec_placeholder") {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const planId = session.metadata?.planId;
        const interval = session.metadata?.interval === "yearly" ? "yearly" : "monthly";
        if (!tenantId) break;

        const plan = PLANS.find((p) => p.id === planId);
        const subscription = session.subscription
          ? await getStripe().subscriptions.retrieve(session.subscription as string)
          : null;

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            stripeSubscriptionId: subscription?.id,
            subscriptionStatus: "ACTIVE",
            currentPlan: planId ?? null,
            planId: planId ?? null,
            billingInterval: interval,
            maxEmployees: plan?.maxEmployees ?? 10,
            currentPeriodEnd: subscription?.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : null,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;
        if (!tenantId) break;

        const statusMap: Record<string, string> = {
          active: "ACTIVE",
          past_due: "PAST_DUE",
          canceled: "CANCELED",
          unpaid: "UNPAID",
          trialing: "TRIALING",
        };

        const priceInterval = sub.items?.data[0]?.price?.recurring?.interval;
        const billingInterval = priceInterval === "year" ? "yearly" : "monthly";

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            subscriptionStatus: (statusMap[sub.status] || "ACTIVE") as any,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            billingInterval,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;
        if (!tenantId) break;

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            subscriptionStatus: "CANCELED",
            cancelAtPeriodEnd: false,
            currentPlan: null,
            planId: null,
            billingInterval: "monthly",
            stripeSubscriptionId: null,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        await prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "PAST_DUE" },
        });
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
