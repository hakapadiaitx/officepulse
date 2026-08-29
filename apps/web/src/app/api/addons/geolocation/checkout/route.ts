import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStripe, GEO_ADDON } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const schema = z.object({ interval: z.enum(["monthly", "yearly"]) });

export async function POST(req: NextRequest) {
  try { getStripe(); } catch {
    return NextResponse.json({ error: "Payments not configured." }, { status: 503 });
  }

  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;

  try {
    const { interval } = schema.parse(await req.json());

    const priceId = interval === "monthly"
      ? GEO_ADDON.stripePriceMonthlyId
      : GEO_ADDON.stripePriceYearlyId;

    if (!priceId) {
      return NextResponse.json({ error: "Geo addon pricing not configured." }, { status: 503 });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    if (tenant.geoAddonActive) {
      return NextResponse.json({ error: "Location addon is already active." }, { status: 409 });
    }

    let customerId = tenant.stripeCustomerId;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: (session!.user as any).email,
        name: tenant.name,
        metadata: { tenantId },
      });
      customerId = customer.id;
      await prisma.tenant.update({ where: { id: tenantId }, data: { stripeCustomerId: customer.id } });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const authUrl = process.env.NEXTAUTH_URL;
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = req.headers.get("host");
    let rawBase = appUrl || authUrl || `https://${forwardedHost ?? host}`;
    if (rawBase && !rawBase.startsWith("http")) rawBase = `https://${rawBase}`;
    const baseUrl = new URL(rawBase).origin;

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings?geo_addon=success`,
      cancel_url: `${baseUrl}/settings?geo_addon=canceled`,
      metadata: { tenantId, addonType: "geolocation", interval },
      subscription_data: { metadata: { tenantId, addonType: "geolocation", interval } },
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
