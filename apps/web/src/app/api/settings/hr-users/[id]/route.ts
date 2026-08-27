import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

// DELETE — revoke HR access
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const role = (session!.user as any).role as string;
  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners and admins can revoke HR access." }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findFirst({
    where: { id, tenantId, role: "MANAGER" },
  });
  if (!user) return NextResponse.json({ error: "HR user not found." }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
