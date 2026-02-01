import type { HSL, RGB } from "./types";

/**
 * Convert RGB (0-255) to HSL (h: 0-360, s: 0-100, l: 0-100).
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function getLightnessDescriptor(l: number): string {
  if (l <= 5) return "very dark";
  if (l <= 20) return "dark";
  if (l <= 40) return "medium-dark";
  if (l <= 60) return "medium";
  if (l <= 80) return "light";
  if (l <= 95) return "very light";
  return "near-white";
}

export function getSaturationDescriptor(s: number): string {
  if (s <= 10) return "gray";
  if (s <= 30) return "muted";
  if (s <= 60) return "moderate";
  if (s <= 85) return "vivid";
  return "intense";
}

export function getHueDescriptor(h: number): string {
  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow";
  if (h < 150) return "green";
  if (h < 190) return "teal";
  if (h < 260) return "blue";
  if (h < 290) return "purple";
  return "pink";
}
