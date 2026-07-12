import type { Metadata, Viewport } from "next";
import { InstallBanner } from "@/components/kiosk/InstallBanner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "OfficePulse — Attendance Terminal",
  appleWebApp: {
    capable: true,
    title: "OfficePulse",
    statusBarStyle: "black-translucent",
  },
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body { overscroll-behavior: none; }
        * { -webkit-tap-highlight-color: transparent; user-select: none; }
      `}</style>
      {children}
      <InstallBanner />
    </>
  );
}