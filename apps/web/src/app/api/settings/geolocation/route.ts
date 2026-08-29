import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const schema = z.object({ enabled: z.boolean() });

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenant = await prisma.tenant.findUnique({
    where: { id: getTenantId(session)! },
    select: { requireGeolocation: true, geoAddonActive: true },
  });

  return NextResponse.json({
    enabled: tenant?.requireGeolocation ?? false,
    addonActive: tenant?.geoAddonActive ?? false,
  });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { geoAddonActive: true },
  });

  if (!tenant?.geoAddonActive) {
    return NextResponse.json(
      { error: "Location addon is not active. Please subscribe to enable this feature." },
      { status: 403 }
    );
  }

  const { enabled } = schema.parse(await req.json());

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { requireGeolocation: enabled },
  });

  return NextResponse.json({ enabled });
}
