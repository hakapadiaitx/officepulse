import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const { searchParams } = req.nextUrl;
  const start = searchParams.get("start");
  const end   = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end query params required" }, { status: 400 });
  }

  const leaves = await prisma.leaveRequest.findMany({
    where: {
      tenantId,
      status: "APPROVED",
      startDate: { lte: end },
      endDate:   { gte: start },
    },
    select: {
      id: true,
      employeeId: true,
      startDate: true,
      endDate: true,
      type: true,
      employee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(
    leaves.map((l) => ({
      id: l.id,
      employeeId: l.employeeId,
      name: `${l.employee.firstName} ${l.employee.lastName}`,
      initials: `${l.employee.firstName[0]}${l.employee.lastName[0]}`,
      startDate: l.startDate,
      endDate: l.endDate,
      type: l.type,
    }))
  );
}
