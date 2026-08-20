import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const LEAVE_TYPES = ["ANNUAL", "SICK", "PERSONAL", "OTHER"] as const;

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const year = parseInt(req.nextUrl.searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  const rows = await prisma.leavePolicy.findMany({
    where: { tenantId, year },
  });

  const policies: Record<string, number> = {};
  for (const type of LEAVE_TYPES) policies[type] = 0;
  for (const row of rows) policies[row.leaveType] = row.allowedDays;

  return NextResponse.json({ year, policies });
}

const putSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  policies: z.record(z.enum(["ANNUAL", "SICK", "PERSONAL", "OTHER"]), z.number().int().min(0).max(365)),
});

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const body = putSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { year, policies } = body.data;

  await Promise.all(
    (Object.entries(policies) as [typeof LEAVE_TYPES[number], number][]).map(([leaveType, allowedDays]) =>
      prisma.leavePolicy.upsert({
        where: { tenantId_year_leaveType: { tenantId, year, leaveType } },
        create: { tenantId, year, leaveType, allowedDays },
        update: { allowedDays },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
