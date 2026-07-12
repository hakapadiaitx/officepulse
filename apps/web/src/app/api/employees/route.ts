import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { hashPin } from "@/lib/auth";

const createSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().optional().or(z.literal("")),
  pin: z.string().length(4).regex(/^\d{4}$/),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;

  const employees = await prisma.employee.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const tenantId = getTenantId(session)!;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { _count: { select: { employees: { where: { isActive: true } } } } },
    });

    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    if (tenant._count.employees >= tenant.maxEmployees) {
      return NextResponse.json(
        { error: `Employee limit reached (${tenant.maxEmployees}). Please upgrade your plan.` },
        { status: 403 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        pinHash: await hashPin(data.pin),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
