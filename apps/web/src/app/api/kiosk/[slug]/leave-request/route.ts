import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPin } from "@/lib/auth";
import { sendLeaveRequestNotification } from "@/lib/email";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const schema = z.object({
  employeeId: z.string(),
  pin:        z.string().length(4).regex(/^\d{4}$/),
  startDate:  z.string().regex(dateRe),
  endDate:    z.string().regex(dateRe),
  type:       z.enum(["ANNUAL", "SICK", "PERSONAL", "OTHER"]).default("ANNUAL"),
  reason:     z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { users: { where: { role: "OWNER" }, select: { email: true, firstName: true } } },
  });
  if (!tenant) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  try {
    const data = schema.parse(await req.json());

    if (data.endDate < data.startDate) {
      return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, tenantId: tenant.id, isActive: true },
    });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const pinValid = await verifyPin(data.pin, employee.pinHash);
    if (!pinValid) return NextResponse.json({ error: "Incorrect PIN. Please try again." }, { status: 401 });

    const leave = await prisma.leaveRequest.create({
      data: {
        tenantId:   tenant.id,
        employeeId: employee.id,
        startDate:  data.startDate,
        endDate:    data.endDate,
        type:       data.type,
        reason:     data.reason ?? null,
        status:     "PENDING",
      },
    });

    // Notify admin — awaited so the function doesn't return before Resend completes
    const owner = tenant.users[0];
    if (owner) {
      const start = new Date(data.startDate + "T12:00:00Z");
      const end   = new Date(data.endDate   + "T12:00:00Z");
      const days  = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      const typeLabels: Record<string, string> = {
        ANNUAL: "Annual Leave", SICK: "Sick Leave", PERSONAL: "Personal", OTHER: "Other",
      };
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://officepulse.vercel.app";
      await sendLeaveRequestNotification({
        to:             owner.email,
        adminFirstName: owner.firstName,
        companyName:    tenant.name,
        employeeName:   `${employee.firstName} ${employee.lastName}`,
        leaveType:      typeLabels[data.type] ?? data.type,
        startDate:      data.startDate,
        endDate:        data.endDate,
        days,
        reason:         data.reason ?? null,
        appUrl,
      }).catch((err) => console.error("[kiosk/leave-request] Email failed:", err));
    }

    return NextResponse.json({ success: true, leaveId: leave.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Validation error" }, { status: 400 });
    }
    console.error("[kiosk/leave-request]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
