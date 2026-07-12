import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { hashPin } from "@/lib/auth";

const updateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
  pin: z.string().length(4).regex(/^\d{4}$/).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const tenantId = getTenantId(session)!;
  const { id } = await params;

  const employee = await prisma.employee.findFirst({ where: { id, tenantId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.pin && { pinHash: await hashPin(data.pin) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: { id: true, firstName: true, lastName: true, email: true, isActive: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const tenantId = getTenantId(session)!;
  const { id } = await params;

  const employee = await prisma.employee.findFirst({ where: { id, tenantId } });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.employee.update({ where: { id }, data: { isActive: false } });

  return NextResponse.json({ success: true });
}
