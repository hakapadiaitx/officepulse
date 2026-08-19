import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth";

const schema = z.object({
  employeeId: z.string(),
  pin:        z.string().length(4).regex(/^\d{4}$/),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const data = schema.parse(await req.json());

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, tenantId: tenant.id, isActive: true },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const pinValid = await verifyPin(data.pin, employee.pinHash);
    if (!pinValid) return NextResponse.json({ error: "Incorrect PIN. Please try again." }, { status: 401 });

    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: employee.id, tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(leaves);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Validation error" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
