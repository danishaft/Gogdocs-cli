/**
 * Unified output module - formats data based on user preference
 */

import type { OutputFormat, OutputData } from '../../types/index.js';
import { formatJson, printJson } from './json.js';
import { formatTable, formatKeyValue, format2DArray, format2DArrayWithFormatting, printTable, printKeyValue } from './table.js';
import * as text from './text.js';

export { formatJson, printJson } from './json.js';
export { formatTable, formatKeyValue, format2DArray, format2DArrayWithFormatting, printTable, printKeyValue } from './table.js';
export * as text from './text.js';
export * from './colors.js';
export * from './formatted.js';

/**
 * Output a result in the specified format
 */
export function output(data: unknown, format: OutputFormat = 'text'): void {
  switch (format) {
    case 'json':
      printJson(data);
      break;

    case 'table':
      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'object') {
          printTable(data as Record<string, unknown>[]);
        } else if (data.length > 0 && Array.isArray(data[0])) {
          console.log(format2DArray(data as string[][]));
        } else {
          console.log(text.list(data.map(String)));
        }
      } else if (typeof data === 'object' && data !== null) {
        printKeyValue(data as Record<string, unknown>);
      } else {
        console.log(String(data));
      }
      break;

    case 'text':
    default:
      if (typeof data === 'string') {
        console.log(data);
      } else if (Array.isArray(data)) {
        for (const item of data) {
          if (typeof item === 'object' && item !== null) {
            console.log(text.labelValues(item as Record<string, unknown>));
            console.log();
          } else {
            console.log(String(item));
          }
        }
      } else if (typeof data === 'object' && data !== null) {
        console.log(text.labelValues(data as Record<string, unknown>));
      } else {
        console.log(String(data));
      }
      break;
  }
}

/**
 * Output a success result
 */
export function outputSuccess(message: string, data?: unknown, format: OutputFormat = 'text'): void {
  if (format === 'json') {
    printJson({ success: true, message, data });
  } else {
    text.printSuccess(message);
    if (data !== undefined) {
      output(data, format);
    }
  }
}

/**
 * Output an error result
 */
export function outputError(message: string, format: OutputFormat = 'text'): void {
  if (format === 'json') {
    printJson({ success: false, error: message });
  } else {
    text.printError(message);
  }
}

/**
 * Output a result with context
 */
export function outputResult(result: OutputData, format: OutputFormat = 'text'): void {
  if (format === 'json') {
    printJson(result);
  } else {
    if (result.success) {
      if (result.message) {
        text.printSuccess(result.message);
      }
      if (result.data !== undefined) {
        output(result.data, format);
      }
    } else {
      outputError(result.error ?? 'Unknown error', format);
    }
  }
}

export default {
  output,
  outputSuccess,
  outputError,
  outputResult,
};
