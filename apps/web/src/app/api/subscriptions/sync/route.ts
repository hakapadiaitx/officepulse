import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { getStripe, PLANS } from "@/lib/stripe";
import type Stripe from "stripe";

// Resolves a Stripe price ID to our plan definition.
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

// POST — fetch the live Stripe subscription and sync plan + maxEmployees to DB.
// Called after checkout success and from the "Sync with Stripe" button in Settings.
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripeSubscriptionId: true, stripeCustomerId: true, maxEmployees: true, currentPlan: true },
  });

  let sub: Stripe.Subscription | null = null;

  // Primary: use saved subscription ID.
  if (tenant?.stripeSubscriptionId) {
    try {
      sub = await getStripe().subscriptions.retrieve(tenant.stripeSubscriptionId, {
        expand: ["items.data.price"],
      });
    } catch (err: unknown) {
      return NextResponse.json({ error: `Stripe error: ${(err as Error).message}` }, { status: 502 });
    }
  }
  // Fallback: look up by customer ID when subscription ID was never saved
  // (e.g. webhook missed or failed during checkout).
  else if (tenant?.stripeCustomerId) {
    try {
      const list = await getStripe().subscriptions.list({
        customer: tenant.stripeCustomerId,
        status: "all",
        limit: 5,
        expand: ["data.items.data.price"],
      });
      // Prefer active → trialing → most recent canceled.
      sub =
        list.data.find((s) => s.status === "active") ??
        list.data.find((s) => s.status === "trialing") ??
        list.data[0] ??
        null;
    } catch (err: unknown) {
      return NextResponse.json({ error: `Stripe error: ${(err as Error).message}` }, { status: 502 });
    }
  }

  if (!sub) {
    return NextResponse.json(
      { error: "No Stripe subscription found. Please contact support if you have already paid." },
      { status: 400 }
    );
  }

  const rawPrice  = sub.items.data[0]?.price;
  const priceId   = typeof rawPrice === "string" ? rawPrice : rawPrice?.id;
  const stripeInt = typeof rawPrice === "string" ? undefined : rawPrice?.recurring?.interval;
  const resolved  = priceId ? planFromPriceId(priceId) : null;

  const billingInterval: "monthly" | "yearly" | undefined =
    resolved?.interval ?? (stripeInt === "year" ? "yearly" : stripeInt === "month" ? "monthly" : undefined);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: sub.id,
      subscriptionStatus:   (statusMap[sub.status] ?? "ACTIVE") as any,
      cancelAtPeriodEnd:    sub.cancel_at_period_end,
      currentPeriodEnd:     new Date(sub.current_period_end * 1000),
      ...(billingInterval && { billingInterval }),
      ...(resolved && {
        currentPlan:  resolved.plan.id,
        planId:       resolved.plan.id,
        maxEmployees: resolved.plan.maxEmployees,
      }),
    },
  });

  return NextResponse.json({
    plan:         resolved?.plan.name ?? tenant?.currentPlan ?? "Unknown",
    maxEmployees: resolved?.plan.maxEmployees ?? tenant?.maxEmployees,
    status:       statusMap[sub.status] ?? sub.status,
  });
}
