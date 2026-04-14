/**
 * CLI-specific types for google-docs-cli
 */

export type OutputFormat = 'json' | 'table' | 'text';

export interface GlobalOptions {
  format: OutputFormat;
  quiet: boolean;
  verbose: boolean;
  doc?: string;
}

export interface CommandContext {
  options: GlobalOptions;
}

export interface OutputData {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

export interface DocumentInfo {
  documentId: string;
  title: string;
  revisionId?: string;
  body?: DocumentBody;
}

export interface DocumentBody {
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface TextRange {
  startIndex: number;
  endIndex: number;
  segmentId?: string;
}

export interface TableInfo {
  tableIndex: number;
  startIndex: number;
  endIndex: number;
  rows: number;
  columns: number;
}

export interface ImageInfo {
  objectId: string;
  startIndex: number;
  uri?: string;
  width?: number;
  height?: number;
}

export interface NamedRangeInfo {
  name: string;
  namedRangeId: string;
  ranges: TextRange[];
}

export interface FormatOptions {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  link?: string;
}

export interface HelpTopic {
  name: string;
  title: string;
  description: string;
  content: string;
  examples?: string[];
}
