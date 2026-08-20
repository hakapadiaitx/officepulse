import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const LEAVE_TYPES = ["ANNUAL", "SICK", "PERSONAL", "OTHER"] as const;

const putSchema = z.object({
  employeeId: z.string().min(1),
  year: z.number().int().min(2020).max(2100),
  policies: z.record(z.enum(LEAVE_TYPES), z.number().int().min(0).max(365)),
});

// PUT — upsert per-employee overrides for a given year
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const body = putSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { employeeId, year, policies } = body.data;

  // Verify employee belongs to tenant
  const emp = await prisma.employee.findFirst({ where: { id: employeeId, tenantId } });
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  await Promise.all(
    (Object.entries(policies) as [typeof LEAVE_TYPES[number], number][]).map(([leaveType, allowedDays]) =>
      prisma.leaveAllowance.upsert({
        where: { tenantId_employeeId_year_leaveType: { tenantId, employeeId, year, leaveType } },
        create: { tenantId, employeeId, year, leaveType, allowedDays },
        update: { allowedDays },
      })
    )
  );

  return NextResponse.json({ ok: true });
}

// DELETE — remove all per-employee overrides for a year (revert to policy)
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const { employeeId, year } = await req.json();
  if (!employeeId || !year) return NextResponse.json({ error: "Missing employeeId or year" }, { status: 400 });

  await prisma.leaveAllowance.deleteMany({ where: { tenantId, employeeId, year } });
  return NextResponse.json({ ok: true });
}
