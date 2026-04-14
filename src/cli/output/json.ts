/**
 * JSON output formatter
 */

import type { OutputData } from '../../types/index.js';

/**
 * Format data as JSON
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format output result as JSON
 */
export function formatJsonResult(result: OutputData): string {
  return formatJson(result);
}

/**
 * Print JSON to stdout
 */
export function printJson(data: unknown): void {
  console.log(formatJson(data));
}

export default {
  formatJson,
  formatJsonResult,
  printJson,
};
