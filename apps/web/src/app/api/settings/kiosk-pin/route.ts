import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";
import { hashPin } from "@/lib/auth";

// GET — returns whether the current admin has a kiosk PIN set
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = (session!.user as any).id as string;
  const employee = await prisma.employee.findUnique({ where: { userId } });

  return NextResponse.json({
    hasPin: !!employee?.isActive,
    employeeId: employee?.id ?? null,
  });
}

const schema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/),
});

// PUT — create or update the admin's linked Employee record with the kiosk PIN
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = (session!.user as any).id as string;
  const tenantId = getTenantId(session)!;
  const user = session!.user as any;

  try {
    const { pin } = schema.parse(await req.json());
    const pinHash = await hashPin(pin);

    const employee = await prisma.employee.upsert({
      where: { userId },
      update: { pinHash, isActive: true },
      create: {
        tenantId,
        userId,
        firstName: user.name?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Admin",
        lastName: user.name?.split(" ").slice(1).join(" ") || "",
        email: user.email ?? null,
        pinHash,
      },
    });

    return NextResponse.json({ employeeId: employee.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });
    }
    console.error("[kiosk-pin PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — deactivate the admin's kiosk employee record (removes kiosk access)
export async function DELETE() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = (session!.user as any).id as string;
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (employee) {
    await prisma.employee.update({ where: { id: employee.id }, data: { isActive: false } });
  }

  return NextResponse.json({ removed: true });
}
