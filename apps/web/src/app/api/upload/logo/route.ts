import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
import { join } from "path";
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

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const uploadDir = join(process.cwd(), "public", "uploads", "logos");
  await mkdir(uploadDir, { recursive: true });

  // Remove any previous logo file for this tenant
  const existing = await readdir(uploadDir).catch(() => [] as string[]);
  await Promise.all(
    existing.filter((f) => f.startsWith(tenantId)).map((f) => unlink(join(uploadDir, f)).catch(() => {}))
  );

  const filename = `${tenantId}.${ext}`;
  await writeFile(join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  const logoUrl = `/uploads/logos/${filename}`;
  await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl } });

  return NextResponse.json({ logoUrl });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;
  const tenantId = getTenantId(session)!;

  const uploadDir = join(process.cwd(), "public", "uploads", "logos");
  const existing = await readdir(uploadDir).catch(() => [] as string[]);
  await Promise.all(
    existing.filter((f) => f.startsWith(tenantId)).map((f) => unlink(join(uploadDir, f)).catch(() => {}))
  );

  await prisma.tenant.update({ where: { id: tenantId }, data: { logoUrl: null } });
  return NextResponse.json({ ok: true });
}
