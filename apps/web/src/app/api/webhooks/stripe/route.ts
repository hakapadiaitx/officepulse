import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

function planFromPriceId(priceId: string) {
  for (const plan of PLANS) {
    if (plan.stripePriceMonthlyId === priceId) return { plan, interval: "monthly" as const };
    if (plan.stripePriceYearlyId  === priceId) return { plan, interval: "yearly"  as const };
  }
  return null;
}

const statusMap: Record<string, string> = {
  active:   "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid:   "UNPAID",
  trialing: "TRIALING",
};

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
        const planIdMeta = session.metadata?.planId;
        if (!tenantId) break;

        // Prefer plan derived from the actual Stripe price ID — metadata planId is
        // a secondary fallback in case the price lookup fails.
        const subscription = session.subscription
          ? await getStripe().subscriptions.retrieve(session.subscription as string, {
              expand: ["items.data.price"],
            })
          : null;

        const priceId = subscription?.items?.data[0]?.price?.id;
        const resolved = priceId ? planFromPriceId(priceId) : null;
        const fallbackPlan = PLANS.find((p) => p.id === planIdMeta);
        const plan = resolved?.plan ?? fallbackPlan;
        const interval = resolved?.interval ?? (session.metadata?.interval === "yearly" ? "yearly" : "monthly");

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            stripeSubscriptionId: subscription?.id ?? null,
            subscriptionStatus: "ACTIVE",
            currentPlan: plan?.id ?? planIdMeta ?? null,
            planId:      plan?.id ?? planIdMeta ?? null,
            billingInterval: interval,
            maxEmployees: plan?.maxEmployees ?? 5,
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

        const priceId = sub.items?.data[0]?.price?.id;
        const resolved = priceId ? planFromPriceId(priceId) : null;
        const priceInterval = sub.items?.data[0]?.price?.recurring?.interval;
        const billingInterval = resolved?.interval ?? (priceInterval === "year" ? "yearly" : "monthly");

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            subscriptionStatus: (statusMap[sub.status] ?? "ACTIVE") as any,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            billingInterval,
            ...(resolved && {
              currentPlan:  resolved.plan.id,
              planId:       resolved.plan.id,
              maxEmployees: resolved.plan.maxEmployees,
            }),
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
            maxEmployees: 5,
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
