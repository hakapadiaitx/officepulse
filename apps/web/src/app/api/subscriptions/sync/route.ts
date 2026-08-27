import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { getStripe, PLANS } from "@/lib/stripe";

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
    select: { stripeSubscriptionId: true, maxEmployees: true, currentPlan: true },
  });

  if (!tenant?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active Stripe subscription found for this workspace." }, { status: 400 });
  }

  let sub;
  try {
    sub = await getStripe().subscriptions.retrieve(tenant.stripeSubscriptionId, {
      expand: ["items.data.price"],
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: `Stripe error: ${(err as Error).message}` }, { status: 502 });
  }

  const priceId = sub.items.data[0]?.price?.id;
  const resolved = priceId ? planFromPriceId(priceId) : null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      subscriptionStatus: (statusMap[sub.status] ?? "ACTIVE") as any,
      cancelAtPeriodEnd:  sub.cancel_at_period_end,
      currentPeriodEnd:   new Date(sub.current_period_end * 1000),
      ...(resolved && {
        currentPlan:    resolved.plan.id,
        planId:         resolved.plan.id,
        maxEmployees:   resolved.plan.maxEmployees,
        billingInterval: resolved.interval,
      }),
    },
  });

  return NextResponse.json({
    plan:         resolved?.plan.name ?? tenant.currentPlan ?? "Unknown",
    maxEmployees: resolved?.plan.maxEmployees ?? tenant.maxEmployees,
    status:       statusMap[sub.status] ?? sub.status,
  });
}
