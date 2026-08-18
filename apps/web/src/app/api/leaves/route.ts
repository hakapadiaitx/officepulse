import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  employeeId: z.string(),
  startDate:  z.string().regex(dateRe),
  endDate:    z.string().regex(dateRe),
  type:       z.enum(["ANNUAL", "SICK", "PERSONAL", "OTHER"]).default("ANNUAL"),
  reason:     z.string().max(500).optional().nullable(),
  status:     z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING"),
  adminNote:  z.string().max(500).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const statusFilter = req.nextUrl.searchParams.get("status");

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      ...(statusFilter && statusFilter !== "ALL" && { status: statusFilter as "PENDING" | "APPROVED" | "REJECTED" }),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(leaves);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const data = createSchema.parse(await req.json());

  if (data.endDate < data.startDate) {
    return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, tenantId, isActive: true },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const leave = await prisma.leaveRequest.create({
    data: {
      tenantId,
      employeeId: data.employeeId,
      startDate:  data.startDate,
      endDate:    data.endDate,
      type:       data.type,
      reason:     data.reason ?? null,
      status:     data.status,
      adminNote:  data.adminNote ?? null,
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(leave, { status: 201 });
}
