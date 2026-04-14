/**
 * Utilities for parsing document IDs and other input
 */

/**
 * Extract document ID from various input formats:
 * - Full URL: https://docs.google.com/document/d/1abc.../edit
 * - Short URL: docs.google.com/document/d/1abc.../
 * - Raw ID: 1abc123...
 */
export function parseDocumentId(input: string): string {
  // Trim whitespace
  input = input.trim();

  // If it looks like a URL, extract the ID
  const urlPatterns = [
    // Standard Google Docs URL
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    // With or without protocol
    /^https?:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    // Just the path
    /^\/document\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If no URL pattern matched, assume it's a raw document ID
  // Google Doc IDs are typically 44 characters of alphanumeric + underscore + hyphen
  if (/^[a-zA-Z0-9_-]+$/.test(input)) {
    return input;
  }

  throw new Error(`Invalid document ID or URL: ${input}`);
}

/**
 * Parse a color string to RGB values (0-1 range for Google Docs API)
 * Supports: hex (#ff0000), rgb(255, 0, 0), named colors
 */
export function parseColor(color: string): { red: number; green: number; blue: number } {
  color = color.trim().toLowerCase();

  // Named colors
  const namedColors: Record<string, string> = {
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    black: '#000000',
    white: '#ffffff',
    yellow: '#ffff00',
    cyan: '#00ffff',
    magenta: '#ff00ff',
    orange: '#ffa500',
    purple: '#800080',
    pink: '#ffc0cb',
    gray: '#808080',
    grey: '#808080',
  };

  if (namedColors[color]) {
    color = namedColors[color];
  }

  // Hex color
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      // Short hex (#f00 -> #ff0000)
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      return { red: r, green: g, blue: b };
    } else if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return { red: r, green: g, blue: b };
    }
  }

  // RGB format: rgb(255, 0, 0)
  const rgbMatch = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgbMatch) {
    return {
      red: parseInt(rgbMatch[1], 10) / 255,
      green: parseInt(rgbMatch[2], 10) / 255,
      blue: parseInt(rgbMatch[3], 10) / 255,
    };
  }

  throw new Error(`Invalid color format: ${color}. Use hex (#ff0000), rgb(255, 0, 0), or named colors.`);
}

/**
 * Parse index input - handles special values like "end"
 */
export function parseIndex(input: string | number | undefined, defaultValue: number): number {
  if (input === undefined) return defaultValue;
  if (typeof input === 'number') return input;
  if (input === 'end') return -1; // Special value for end of document
  const parsed = parseInt(input, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid index: ${input}`);
  }
  return parsed;
}

/**
 * Parse multiple ranges from a comma-separated string
 * Format: "5-9,11-15,17-25" returns [{start: 5, end: 9}, {start: 11, end: 15}, ...]
 */
export function parseRanges(input: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const parts = input.split(',').map(p => p.trim()).filter(p => p.length > 0);

  for (const part of parts) {
    const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) {
      throw new Error(`Invalid range format: "${part}". Use format like "5-10" or "5-9,11-15"`);
    }

    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    if (end <= start) {
      throw new Error(`Invalid range "${part}": end must be greater than start`);
    }

    ranges.push({ start, end });
  }

  if (ranges.length === 0) {
    throw new Error('No valid ranges provided');
  }

  return ranges;
}

/**
 * Parse font size with optional unit
 * Supports: 12, 12pt, 12px (converts px to pt approximately)
 */
export function parseFontSize(input: string | number): number {
  if (typeof input === 'number') return input;

  const match = input.match(/^(\d+(?:\.\d+)?)(pt|px)?$/i);
  if (!match) {
    throw new Error(`Invalid font size: ${input}. Use a number or number with unit (12pt, 14px).`);
  }

  let size = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase();

  // Convert px to pt (approximate: 1px ≈ 0.75pt)
  if (unit === 'px') {
    size = size * 0.75;
  }

  return size;
}

/**
 * Format a document ID for display (truncate if too long)
 */
export function formatDocId(docId: string, maxLength = 20): string {
  if (docId.length <= maxLength) return docId;
  return docId.slice(0, maxLength - 3) + '...';
}

/**
 * Build Google Docs URL from document ID
 */
export function buildDocUrl(docId: string): string {
  return `https://docs.google.com/document/d/${docId}/edit`;
}
