import namer from "color-namer";
import { simulateColorblind, colorDistance, COLORBLIND_TYPES } from "./colorblind-sim";
import { rgbToHsl, getLightnessDescriptor, getBriefQualifier, getHueDescriptor } from "./hsl-utils";
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
function getBasicName(hex: string, rgb: RGB): string {
  const results = namer(hex, { pick: ["basic"] });
  const name = results.basic[0].name.toLowerCase();

  // The basic palette only has ~20 colors, so dark chromatic colors
  // get matched to "black" and very light ones to "white". Override
  // with the hue name when the color has meaningful saturation.
  if ((name === "black" || name === "white") && rgbToHsl(rgb).s > 15) {
    return getHueDescriptor(rgbToHsl(rgb).h);
  }

  return name;
}

/** Get the detailed NTC color name from a hex string. */
function getNtcName(hex: string): string {
  const results = namer(hex, { pick: ["ntc"] });
  return results.ntc[0].name.toLowerCase();
}

/** Build a brief natural-language description of a color. */
function buildDescription(hex: string, rgb: RGB): string {
  const hsl = rgbToHsl(rgb);
  const ntcName = getNtcName(hex);

  // Only use "black"/"white" for truly extreme values
  if (hsl.l <= 2 && hsl.s <= 5) return "black";
  if (hsl.l >= 98 && hsl.s <= 5) return "white";

  // Low saturation: use NTC name with lightness qualifier instead of generic "gray"
  if (hsl.s <= 10) {
    const lightDesc = getLightnessDescriptor(hsl.l);
    return `a ${lightDesc} ${ntcName}`;
  }

  const qualifier = getBriefQualifier(hsl);

  return qualifier ? `a ${qualifier} ${ntcName}` : `a ${ntcName}`;
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
    const simBasicName = getBasicName(simHex, simRgb);

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
  const basicName = getBasicName(hex, rgb);
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
