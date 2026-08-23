"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

// ── colour math ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  return [
    parseInt(n.slice(0, 2), 16),
    parseInt(n.slice(2, 4), 16),
    parseInt(n.slice(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToChannels(h: number, s: number, l: number): string {
  h /= 360; s /= 100; l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return `${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)}`;
}

// Derive a full brand palette (as "R G B" channel strings) from a single hex colour.
function buildPalette(brandHex: string): Record<string, string> {
  const [r, g, b] = hexToRgb(brandHex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const ch = (lTarget: number, sOverride?: number) =>
    hslToChannels(h, sOverride ?? Math.min(s, 88), Math.max(8, Math.min(96, lTarget)));
  return {
    "50":  ch(96, Math.min(s * 0.45, 55)),
    "100": ch(93, Math.min(s * 0.55, 68)),
    "500": ch(Math.max(l + 8, 52)),
    "600": `${r} ${g} ${b}`,
    "700": ch(Math.max(l - 9, 22)),
    "900": ch(Math.max(l - 22, 12)),
  };
}

// ── component ────────────────────────────────────────────────────────────────

function applyPalette(brandHex: string) {
  const palette = buildPalette(brandHex);
  const root = document.documentElement;
  for (const [shade, channels] of Object.entries(palette)) {
    root.style.setProperty(`--brand-${shade}`, channels);
  }
}

export function BrandColorProvider() {
  const { data: session } = useSession();
  const brandColor: string = (session?.user as any)?.brandColor ?? "#4f46e5";

  useEffect(() => {
    applyPalette(brandColor);
  }, [brandColor]);

  return null;
}

// Standalone version for places without a session (kiosk, etc.)
export function BrandColorInjector({ color }: { color: string }) {
  useEffect(() => {
    applyPalette(color);
  }, [color]);
  return null;
}
