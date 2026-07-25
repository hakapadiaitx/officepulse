import type { Metadata, Viewport } from "next";
import { InstallBanner } from "@/components/kiosk/InstallBanner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "OfficePulse — Attendance Terminal",
    manifest: `/api/kiosk/${slug}/manifest`,
    appleWebApp: {
      capable: true,
      title: "OfficePulse",
      statusBarStyle: "black-translucent",
    },
    icons: {
      apple: "/icon.svg",
      icon: "/icon.svg",
    },
    other: {
      // Android Chrome
      "mobile-web-app-capable": "yes",
      // iOS Safari standalone mode
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      "apple-mobile-web-app-title": "OfficePulse",
    },
  };
}

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body { overscroll-behavior: none; }
        * { -webkit-tap-highlight-color: transparent; user-select: none; }
        input, textarea { user-select: text; }
      `}</style>
      {children}
      <InstallBanner />
    </>
  );
}
