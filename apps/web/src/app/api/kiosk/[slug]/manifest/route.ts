import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — returns a per-tenant Web App Manifest so the kiosk
// installs with the company name, brand colour, and correct start URL.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true, brandColor: true },
  });

  const name = tenant ? `${tenant.name} Kiosk` : "OfficePulse Kiosk";
  const themeColor = tenant?.brandColor ?? "#4f46e5";

  const manifest = {
    name,
    short_name: tenant?.name ?? "OfficePulse",
    description: "Employee attendance terminal",
    start_url: `/kiosk/${slug}`,
    id: `/kiosk/${slug}`,
    scope: `/kiosk/${slug}`,
    display: "standalone",
    orientation: "any",
    background_color: "#f9fafb",
    theme_color: themeColor,
    categories: ["business", "productivity"],
    icons: [
      { src: "/logo.PNG", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/logo.PNG", sizes: "192x192", type: "image/png", purpose: "any" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
