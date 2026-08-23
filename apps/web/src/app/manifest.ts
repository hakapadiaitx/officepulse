import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OfficePulse Kiosk",
    short_name: "OfficePulse",
    description: "Employee attendance terminal",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    orientation: "any",
    icons: [
      { src: "/logo.jpg", sizes: "512x512", type: "image/jpeg" },
      { src: "/logo.jpg", sizes: "192x192", type: "image/jpeg" },
    ],
  };
}
