import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

export async function POST(req: NextRequest) {
  try { getStripe(); } catch {
    return NextResponse.json({ error: "Payments not configured." }, { status: 503 });
  }

  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { geoAddonSubscriptionId: true, geoAddonActive: true },
  });

  if (!tenant?.geoAddonActive || !tenant.geoAddonSubscriptionId) {
    return NextResponse.json({ error: "No active location addon to cancel." }, { status: 404 });
  }

  await getStripe().subscriptions.update(tenant.geoAddonSubscriptionId, {
    cancel_at_period_end: true,
  });

  return NextResponse.json({ success: true });
}
