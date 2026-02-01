import namer from "color-namer";
import { simulateColorblind, colorDistance, COLORBLIND_TYPES } from "./colorblind-sim";
import { rgbToHsl, getLightnessDescriptor, getSaturationDescriptor, getHueDescriptor } from "./hsl-utils";
import type { ColorDescription, ConfusionWarning, ColorblindSimulation, PickedColor, RGB } from "./types";

/** Threshold for the redmean color distance to trigger a confusion warning. */
const CONFUSION_DISTANCE_THRESHOLD = 50;

/** Convert P3 float (0-1) color components to sRGB 0-255. */
function pickedColorToRgb(color: PickedColor): RGB {
  return {
    r: Math.round(Math.max(0, Math.min(255, color.red * 255))),
    g: Math.round(Math.max(0, Math.min(255, color.green * 255))),
    b: Math.round(Math.max(0, Math.min(255, color.blue * 255))),
  };
}

/** Convert RGB to hex string. */
export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/** Parse a hex string to RGB. */
export function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace(/^#/, "");
  let r: number, g: number, b: number;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.substring(0, 2), 16);
    g = parseInt(clean.substring(2, 4), 16);
    b = parseInt(clean.substring(4, 6), 16);
  } else {
    return null;
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/** Get the basic color name from a hex string. */
function getBasicName(hex: string): string {
  const results = namer(hex, { pick: ["basic"] });
  return results.basic[0].name.toLowerCase();
}

/** Get the detailed NTC color name from a hex string. */
function getNtcName(hex: string): string {
  const results = namer(hex, { pick: ["ntc"] });
  return results.ntc[0].name.toLowerCase();
}

/** Build a natural-language description of a color. */
function buildDescription(hex: string, rgb: RGB): string {
  const hsl = rgbToHsl(rgb);

  // Handle achromatic colors
  if (hsl.l <= 3) return "black";
  if (hsl.l >= 97) return "white";
  if (hsl.s <= 10) {
    const lightDesc = getLightnessDescriptor(hsl.l);
    return `a ${lightDesc} gray`;
  }

  const lightDesc = getLightnessDescriptor(hsl.l);
  const satDesc = getSaturationDescriptor(hsl.s);
  const ntcName = getNtcName(hex);

  return `a ${lightDesc}, ${satDesc} ${ntcName}`;
}

/** Generate colorblind simulations and confusion warnings. */
function getColorblindInfo(
  rgb: RGB,
  originalBasicName: string,
): { simulations: ColorblindSimulation[]; warnings: ConfusionWarning[] } {
  const simulations: ColorblindSimulation[] = [];
  const warnings: ConfusionWarning[] = [];

  for (const { type, label } of COLORBLIND_TYPES) {
    const simRgb = simulateColorblind(rgb, type);
    const simHex = rgbToHex(simRgb);
    const simBasicName = getBasicName(simHex);

    simulations.push({ type, label, hex: simHex, basicName: simBasicName });

    const dist = colorDistance(rgb, simRgb);
    if (dist > CONFUSION_DISTANCE_THRESHOLD && simBasicName !== originalBasicName) {
      warnings.push({
        type,
        label,
        message: `This ${originalBasicName} may appear as ${simBasicName} to people with ${label.toLowerCase()}.`,
      });
    }
  }

  return { simulations, warnings };
}

/** Describe a color picked from the screen. */
export function describePickedColor(color: PickedColor): ColorDescription {
  const rgb = pickedColorToRgb(color);
  return describeRgb(rgb);
}

/** Describe a color from RGB values. */
export function describeRgb(rgb: RGB): ColorDescription {
  const hex = rgbToHex(rgb);
  const hsl = rgbToHsl(rgb);
  const basicName = getBasicName(hex);
  const detailedName = getNtcName(hex);
  const detailedDescription = buildDescription(hex, rgb);
  const { simulations, warnings } = getColorblindInfo(rgb, basicName);

  return {
    hex,
    rgb,
    hsl,
    basicName,
    detailedName,
    detailedDescription,
    confusionWarnings: warnings,
    simulations,
  };
}
