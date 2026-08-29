import { NextRequest, NextResponse } from "next/server";
import { getStripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

// Safely extracts the price ID from a string | Stripe.Price union.
function extractPriceId(price: string | Stripe.Price | null | undefined): string | undefined {
  if (!price) return undefined;
  if (typeof price === "string") return price;
  return price.id;
}

// Safely extracts the recurring interval ("month" | "year") from a price union.
function extractInterval(price: string | Stripe.Price | null | undefined): string | undefined {
  if (!price || typeof price === "string") return undefined;
  return price.recurring?.interval ?? undefined;
}

// Resolves a Stripe price ID to our plan definition.
function planFromPriceId(priceId: string | undefined) {
  if (!priceId) return null;
  for (const plan of PLANS) {
    if (plan.stripePriceMonthlyId && plan.stripePriceMonthlyId === priceId)
      return { plan, interval: "monthly" as const };
    if (plan.stripePriceYearlyId && plan.stripePriceYearlyId === priceId)
      return { plan, interval: "yearly" as const };
  }
  return null;
}

// Converts Stripe's "month"/"year" to our "monthly"/"yearly".
// Returns undefined (not "monthly") when the interval is unknown so callers
// never silently overwrite a correct yearly value with a wrong monthly default.
function toInterval(stripeInterval: string | undefined): "monthly" | "yearly" | undefined {
  if (stripeInterval === "year") return "yearly";
  if (stripeInterval === "month") return "monthly";
  return undefined;
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

        // Retrieve subscription with expanded price so we get full price objects.
        const subscription = session.subscription
          ? await getStripe().subscriptions.retrieve(session.subscription as string, {
              expand: ["items.data.price"],
            })
          : null;

        const rawPrice = subscription?.items?.data[0]?.price;
        const priceId  = extractPriceId(rawPrice);
        const resolved = planFromPriceId(priceId);

        // billingInterval: price lookup → metadata fallback → safe default from metadata
        const metaInterval = session.metadata?.interval === "yearly" ? "yearly" : "monthly";
        const billingInterval = resolved?.interval ?? metaInterval;

        const fallbackPlan = PLANS.find((p) => p.id === planIdMeta);
        const plan = resolved?.plan ?? fallbackPlan;

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            stripeSubscriptionId: subscription?.id ?? null,
            subscriptionStatus: "ACTIVE",
            currentPlan:     plan?.id ?? planIdMeta ?? null,
            planId:          plan?.id ?? planIdMeta ?? null,
            billingInterval,
            maxEmployees:    plan?.maxEmployees ?? 5,
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

        // Re-fetch with expansion — the webhook payload price field is typed as
        // string | Stripe.Price and may arrive unexpanded. Explicit retrieval
        // guarantees we get the full recurring.interval.
        const freshSub = await getStripe().subscriptions.retrieve(sub.id, {
          expand: ["items.data.price"],
        });

        const rawPrice     = freshSub.items.data[0]?.price;
        const priceId      = extractPriceId(rawPrice);
        const stripeInt    = extractInterval(rawPrice);
        const resolved     = planFromPriceId(priceId);

        // Never default to "monthly" when we can't determine the interval —
        // omit the field so the value from checkout.session.completed is preserved.
        const billingInterval = resolved?.interval ?? toInterval(stripeInt);

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            subscriptionStatus: (statusMap[freshSub.status] ?? "ACTIVE") as any,
            cancelAtPeriodEnd:  freshSub.cancel_at_period_end,
            currentPeriodEnd:   new Date(freshSub.current_period_end * 1000),
            ...(billingInterval && { billingInterval }),
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
            subscriptionStatus:   "CANCELED",
            cancelAtPeriodEnd:    false,
            currentPlan:          null,
            planId:               null,
            billingInterval:      "monthly",
            stripeSubscriptionId: null,
            maxEmployees:         5,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice   = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        await prisma.tenant.updateMany({
          where: { stripeCustomerId: customerId },
          data:  { subscriptionStatus: "PAST_DUE" },
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
