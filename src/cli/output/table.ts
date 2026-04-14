/**
 * Table output formatter using cli-table3
 */

import Table from 'cli-table3';
import chalk from 'chalk';
import type { FormattedTable, FormattingDisplayMode } from '../../api/types.js';
import { renderFormattedCell } from './formatted.js';

export interface TableOptions {
  head?: string[];
  colWidths?: number[];
  wordWrap?: boolean;
}

/**
 * Format data as a table
 */
export function formatTable(data: Record<string, unknown>[], options: TableOptions = {}): string {
  if (data.length === 0) {
    return chalk.dim('(no data)');
  }

  const headers = options.head ?? Object.keys(data[0]);

  const table = new Table({
    head: headers.map(h => chalk.bold.cyan(h)),
    colWidths: options.colWidths,
    wordWrap: options.wordWrap ?? true,
    style: {
      head: [],
      border: ['grey'],
    },
  });

  for (const row of data) {
    table.push(headers.map(h => formatValue(row[h])));
  }

  return table.toString();
}

/**
 * Format key-value pairs as a table
 */
export function formatKeyValue(data: Record<string, unknown>): string {
  const table = new Table({
    style: {
      head: [],
      border: ['grey'],
    },
  });

  for (const [key, value] of Object.entries(data)) {
    table.push([chalk.bold.cyan(key), formatValue(value)]);
  }

  return table.toString();
}

/**
 * Format a 2D array as a table (for document tables)
 */
export function format2DArray(data: string[][], headers?: string[]): string {
  if (data.length === 0) {
    return chalk.dim('(empty table)');
  }

  const tableOptions: Table.TableConstructorOptions = {
    wordWrap: true,
    style: {
      head: [],
      border: ['grey'],
    },
  };

  if (headers) {
    tableOptions.head = headers.map(h => chalk.bold.cyan(h));
  }

  const table = new Table(tableOptions);

  for (const row of data) {
    table.push(row);
  }

  return table.toString();
}

/**
 * Format a 2D array with formatting information as a table
 */
export function format2DArrayWithFormatting(
  data: FormattedTable,
  mode: FormattingDisplayMode,
  headers?: string[]
): string {
  if (data.rows.length === 0) {
    return chalk.dim('(empty table)');
  }

  // For 'none' mode, use plain rows
  if (mode === 'none') {
    return format2DArray(data.plainRows, headers);
  }

  const tableOptions: Table.TableConstructorOptions = {
    wordWrap: true,
    style: {
      head: [],
      border: ['grey'],
    },
  };

  if (headers) {
    tableOptions.head = headers.map(h => chalk.bold.cyan(h));
  }

  const table = new Table(tableOptions);

  for (const row of data.rows) {
    table.push(row.map(cell => renderFormattedCell(cell, mode)));
  }

  return table.toString();
}

/**
 * Format a value for display in a table
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return chalk.dim('-');
  }

  if (typeof value === 'boolean') {
    return value ? chalk.green('yes') : chalk.red('no');
  }

  if (typeof value === 'number') {
    return chalk.yellow(String(value));
  }

  if (value instanceof Date) {
    return chalk.blue(value.toISOString());
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return chalk.dim('[]');
    return value.map(v => formatValue(v)).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Print table to stdout
 */
export function printTable(data: Record<string, unknown>[], options?: TableOptions): void {
  console.log(formatTable(data, options));
}

/**
 * Print key-value table to stdout
 */
export function printKeyValue(data: Record<string, unknown>): void {
  console.log(formatKeyValue(data));
}

export default {
  formatTable,
  formatKeyValue,
  format2DArray,
  format2DArrayWithFormatting,
  printTable,
  printKeyValue,
};
