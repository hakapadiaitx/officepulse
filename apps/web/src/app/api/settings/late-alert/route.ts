import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const schema = z.object({
  enabled: z.boolean(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenant = await prisma.tenant.findUnique({
    where: { id: getTenantId(session)! },
    select: { lateAlertEnabled: true, lateAlertTime: true },
  });

  return NextResponse.json({
    enabled: tenant?.lateAlertEnabled ?? false,
    time:    tenant?.lateAlertTime ?? "09:30",
  });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const body = schema.parse(await req.json());

  const updated = await prisma.tenant.update({
    where: { id: getTenantId(session)! },
    data: {
      lateAlertEnabled: body.enabled,
      ...(body.time !== undefined && { lateAlertTime: body.time }),
      // Reset sent-date so an alert can fire again today if the admin re-enables
      ...(body.enabled && { lateAlertSentDate: null }),
    },
    select: { lateAlertEnabled: true, lateAlertTime: true },
  });

  return NextResponse.json({ enabled: updated.lateAlertEnabled, time: updated.lateAlertTime });
}
