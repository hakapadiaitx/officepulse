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
    select: { digestEnabled: true },
  });

  return NextResponse.json({ enabled: tenant?.digestEnabled ?? false });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { enabled } = schema.parse(await req.json());

  await prisma.tenant.update({
    where: { id: getTenantId(session)! },
    data: { digestEnabled: enabled },
  });

  return NextResponse.json({ enabled });
}
