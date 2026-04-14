/**
 * RGB to terminal color conversion utilities
 */

import chalk from 'chalk';
import type { RgbColor } from '../../api/types.js';

/**
 * Convert Google Docs RGB (0-1 range) to 8-bit (0-255) values
 */
export function rgbToBytes(rgb: RgbColor): { r: number; g: number; b: number } {
  return {
    r: Math.round((rgb.red ?? 0) * 255),
    g: Math.round((rgb.green ?? 0) * 255),
    b: Math.round((rgb.blue ?? 0) * 255),
  };
}

/**
 * Convert RGB to hex string for chalk.hex()
 */
export function rgbToHex(rgb: RgbColor): string {
  const { r, g, b } = rgbToBytes(rgb);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Calculate color distance for finding nearest named color
 */
function colorDistance(rgb1: RgbColor, rgb2: RgbColor): number {
  const r1 = (rgb1.red ?? 0) * 255;
  const g1 = (rgb1.green ?? 0) * 255;
  const b1 = (rgb1.blue ?? 0) * 255;
  const r2 = (rgb2.red ?? 0) * 255;
  const g2 = (rgb2.green ?? 0) * 255;
  const b2 = (rgb2.blue ?? 0) * 255;
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// Known color palette for name matching
const knownColors: Array<{ name: string; rgb: RgbColor }> = [
  { name: 'red', rgb: { red: 1, green: 0, blue: 0 } },
  { name: 'green', rgb: { red: 0, green: 0.5, blue: 0 } },
  { name: 'blue', rgb: { red: 0, green: 0, blue: 1 } },
  { name: 'yellow', rgb: { red: 1, green: 1, blue: 0 } },
  { name: 'cyan', rgb: { red: 0, green: 1, blue: 1 } },
  { name: 'magenta', rgb: { red: 1, green: 0, blue: 1 } },
  { name: 'orange', rgb: { red: 1, green: 0.647, blue: 0 } },
  { name: 'purple', rgb: { red: 0.5, green: 0, blue: 0.5 } },
  { name: 'gray', rgb: { red: 0.5, green: 0.5, blue: 0.5 } },
  { name: 'white', rgb: { red: 1, green: 1, blue: 1 } },
  { name: 'black', rgb: { red: 0, green: 0, blue: 0 } },
  { name: 'lime', rgb: { red: 0, green: 1, blue: 0 } },
  { name: 'pink', rgb: { red: 1, green: 0.75, blue: 0.8 } },
  { name: 'brown', rgb: { red: 0.6, green: 0.3, blue: 0 } },
];

/**
 * Get a readable color name for marker mode
 * Returns closest named color if within threshold, otherwise hex
 */
export function getColorName(rgb: RgbColor): string {
  let closest = knownColors[0];
  let minDistance = colorDistance(rgb, closest.rgb);

  for (const color of knownColors) {
    const dist = colorDistance(rgb, color.rgb);
    if (dist < minDistance) {
      minDistance = dist;
      closest = color;
    }
  }

  // Use named color if close enough, otherwise hex
  if (minDistance < 60) {
    return closest.name;
  }
  return rgbToHex(rgb);
}

/**
 * Apply foreground color using chalk (truecolor support)
 */
export function applyFgColor(text: string, rgb: RgbColor): string {
  const hex = rgbToHex(rgb);
  return chalk.hex(hex)(text);
}

/**
 * Apply background color using chalk (truecolor support)
 */
export function applyBgColor(text: string, rgb: RgbColor): string {
  const hex = rgbToHex(rgb);
  return chalk.bgHex(hex)(text);
}
