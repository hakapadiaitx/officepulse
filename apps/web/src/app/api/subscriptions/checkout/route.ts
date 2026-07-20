import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe, PLANS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const schema = z.object({
  planId: z.enum(["starter", "professional", "enterprise"]),
  interval: z.enum(["monthly", "yearly"]),
});

export async function POST(req: NextRequest) {
  try { getStripe(); } catch {
    return NextResponse.json({ error: "Payments not configured. Add STRIPE_SECRET_KEY to .env." }, { status: 503 });
  }

  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;

  try {
    const body = await req.json();
    const { planId, interval } = schema.parse(body);

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const priceId = interval === "monthly" ? plan.stripePriceMonthlyId : plan.stripePriceYearlyId;

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: (session!.user as any).email,
        name: tenant.name,
        metadata: { tenantId },
      });
      customerId = customer.id;
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { stripeCustomerId: customer.id },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const authUrl = process.env.NEXTAUTH_URL;
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = req.headers.get("host");
    console.log("[checkout] NEXT_PUBLIC_APP_URL:", appUrl);
    console.log("[checkout] NEXTAUTH_URL:", authUrl);
    console.log("[checkout] host header:", host);
    console.log("[checkout] x-forwarded-host:", forwardedHost);

    let rawBase = appUrl || authUrl || `https://${forwardedHost ?? host}`;
    // Ensure scheme is present (NEXTAUTH_URL is sometimes set without https://)
    if (rawBase && !rawBase.startsWith("http")) rawBase = `https://${rawBase}`;
    // Use only the origin to strip any path component (e.g. /en from NEXTAUTH_URL)
    const baseUrl = new URL(rawBase).origin;
    console.log("[checkout] resolved baseUrl:", baseUrl);

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/subscription/success?plan=${planId}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      metadata: { tenantId, planId },
      subscription_data: { metadata: { tenantId, planId } },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
