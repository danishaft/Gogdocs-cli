/**
 * Formatted text rendering utilities
 * Renders document formatting as terminal styles or explicit markers
 */

import chalk from 'chalk';
import type { TextStyleUpdate, FormattedSpan, FormattedText, FormattedCell, FormattingDisplayMode } from '../../api/types.js';
import { applyFgColor, applyBgColor, getColorName } from './colors.js';

/**
 * Check if a style has any formatting
 */
export function hasFormatting(style: TextStyleUpdate): boolean {
  return !!(
    style.bold ||
    style.italic ||
    style.underline ||
    style.strikethrough ||
    style.fontSize?.magnitude ||
    style.weightedFontFamily?.fontFamily ||
    (style.foregroundColor && 'color' in style.foregroundColor && style.foregroundColor.color) ||
    (style.backgroundColor && 'color' in style.backgroundColor && style.backgroundColor.color) ||
    style.link?.url
  );
}

/**
 * Apply terminal styling to text based on its formatting
 */
export function applyVisualStyle(text: string, style: TextStyleUpdate): string {
  let result = text;

  // Apply text decorations
  if (style.bold) {
    result = chalk.bold(result);
  }
  if (style.italic) {
    result = chalk.italic(result);
  }
  if (style.underline) {
    result = chalk.underline(result);
  }
  if (style.strikethrough) {
    result = chalk.strikethrough(result);
  }

  // Apply colors
  if (style.foregroundColor && 'color' in style.foregroundColor && style.foregroundColor.color?.rgbColor) {
    result = applyFgColor(result, style.foregroundColor.color.rgbColor);
  }
  if (style.backgroundColor && 'color' in style.backgroundColor && style.backgroundColor.color?.rgbColor) {
    result = applyBgColor(result, style.backgroundColor.color.rgbColor);
  }

  // Links - show as underlined cyan
  if (style.link?.url) {
    result = chalk.cyan.underline(result);
  }

  return result;
}

/**
 * Generate opening formatting markers for a style
 */
export function getOpenMarkers(style: TextStyleUpdate): string {
  const markers: string[] = [];

  if (style.bold) markers.push('[B]');
  if (style.italic) markers.push('[I]');
  if (style.underline) markers.push('[U]');
  if (style.strikethrough) markers.push('[S]');

  if (style.foregroundColor && 'color' in style.foregroundColor && style.foregroundColor.color?.rgbColor) {
    const colorName = getColorName(style.foregroundColor.color.rgbColor);
    markers.push(`[fg:${colorName}]`);
  }

  if (style.backgroundColor && 'color' in style.backgroundColor && style.backgroundColor.color?.rgbColor) {
    const colorName = getColorName(style.backgroundColor.color.rgbColor);
    markers.push(`[bg:${colorName}]`);
  }

  if (style.link?.url) {
    markers.push(`[link]`);
  }

  return markers.join('');
}

/**
 * Generate closing formatting markers for a style
 */
export function getCloseMarkers(style: TextStyleUpdate): string {
  const markers: string[] = [];

  // Close in reverse order of opening
  if (style.link?.url) markers.push('[/link]');
  if (style.backgroundColor && 'color' in style.backgroundColor && style.backgroundColor.color?.rgbColor) {
    markers.push('[/bg]');
  }
  if (style.foregroundColor && 'color' in style.foregroundColor && style.foregroundColor.color?.rgbColor) {
    markers.push('[/fg]');
  }
  if (style.strikethrough) markers.push('[/S]');
  if (style.underline) markers.push('[/U]');
  if (style.italic) markers.push('[/I]');
  if (style.bold) markers.push('[/B]');

  return markers.join('');
}

/**
 * Render a formatted span according to display mode
 */
export function renderSpan(span: FormattedSpan, mode: FormattingDisplayMode): string {
  const { text, style } = span;

  switch (mode) {
    case 'visual':
      return applyVisualStyle(text, style);

    case 'markers':
      if (!hasFormatting(style)) {
        return text;
      }
      return getOpenMarkers(style) + text + getCloseMarkers(style);

    case 'none':
    default:
      return text;
  }
}

/**
 * Render formatted text (sequence of spans)
 */
export function renderFormattedText(formattedText: FormattedText, mode: FormattingDisplayMode): string {
  if (mode === 'none') {
    return formattedText.plainText;
  }
  return formattedText.spans.map(span => renderSpan(span, mode)).join('');
}

/**
 * Render a formatted cell for table display
 */
export function renderFormattedCell(cell: FormattedCell, mode: FormattingDisplayMode): string {
  if (mode === 'none') {
    return cell.plainText;
  }
  return cell.spans.map(span => renderSpan(span, mode)).join('');
}
