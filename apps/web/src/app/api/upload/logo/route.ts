import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireAuth, getTenantId } from "@/lib/session";

const ALLOWED = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED.includes(file.type))
    return NextResponse.json({ error: "Only PNG, JPG, SVG or WebP images allowed" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 });

  // Delete existing blob if one is stored
  const existing = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { logoUrl: true },
  });
  if (existing?.logoUrl?.startsWith("https://")) {
    await del(existing.logoUrl).catch(() => {});
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const blob = await put(`logos/${tenantId}.${ext}`, file, {
    access: "public",
    contentType: file.type,
  });

  await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl: blob.url } });
  return NextResponse.json({ logoUrl: blob.url });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const existing = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { logoUrl: true },
  });
  if (existing?.logoUrl?.startsWith("https://")) {
    await del(existing.logoUrl).catch(() => {});
  }

  await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl: null } });
  return NextResponse.json({ ok: true });
}
