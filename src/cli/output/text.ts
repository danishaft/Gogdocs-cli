/**
 * Plain text output formatter
 */

import chalk from 'chalk';

/**
 * Format a success message
 */
export function success(message: string): string {
  return chalk.green('✓ ') + message;
}

/**
 * Format an error message
 */
export function error(message: string): string {
  return chalk.red('✗ ') + message;
}

/**
 * Format a warning message
 */
export function warning(message: string): string {
  return chalk.yellow('⚠ ') + message;
}

/**
 * Format an info message
 */
export function info(message: string): string {
  return chalk.blue('ℹ ') + message;
}

/**
 * Format a label-value pair
 */
export function labelValue(label: string, value: unknown): string {
  return chalk.bold(label + ': ') + formatValue(value);
}

/**
 * Format multiple label-value pairs
 */
export function labelValues(pairs: Record<string, unknown>): string {
  return Object.entries(pairs)
    .map(([label, value]) => labelValue(label, value))
    .join('\n');
}

/**
 * Format a header/title
 */
export function header(text: string): string {
  return chalk.bold.underline(text);
}

/**
 * Format a subheader
 */
export function subheader(text: string): string {
  return chalk.bold(text);
}

/**
 * Format a document link
 */
export function docLink(title: string, documentId: string): string {
  const url = `https://docs.google.com/document/d/${documentId}/edit`;
  return `${chalk.bold(title)} ${chalk.dim(`(${documentId})`)}
${chalk.cyan(url)}`;
}

/**
 * Format code/monospace text
 */
export function code(text: string): string {
  return chalk.bgGray.white(` ${text} `);
}

/**
 * Format a list of items
 */
export function list(items: string[], bullet = '•'): string {
  return items.map(item => `  ${bullet} ${item}`).join('\n');
}

/**
 * Format a numbered list
 */
export function numberedList(items: string[]): string {
  return items.map((item, i) => `  ${i + 1}. ${item}`).join('\n');
}

/**
 * Format dimmed/secondary text
 */
export function dim(text: string): string {
  return chalk.dim(text);
}

/**
 * Format highlighted text
 */
export function highlight(text: string): string {
  return chalk.bgYellow.black(text);
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return chalk.dim('(none)');
  }

  if (typeof value === 'boolean') {
    return value ? chalk.green('yes') : chalk.red('no');
  }

  if (typeof value === 'number') {
    return chalk.yellow(String(value));
  }

  if (value instanceof Date) {
    return chalk.blue(value.toLocaleString());
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return chalk.dim('(empty)');
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Print formatted output
 */
export function print(message: string): void {
  console.log(message);
}

/**
 * Print success message
 */
export function printSuccess(message: string): void {
  console.log(success(message));
}

/**
 * Print error message
 */
export function printError(message: string): void {
  console.error(error(message));
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  console.log(info(message));
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
  console.log(warning(message));
}

export default {
  success,
  error,
  warning,
  info,
  labelValue,
  labelValues,
  header,
  subheader,
  docLink,
  code,
  list,
  numberedList,
  dim,
  highlight,
  print,
  printSuccess,
  printError,
  printInfo,
  printWarning,
};
