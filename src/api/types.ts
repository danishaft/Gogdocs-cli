/**
 * TypeScript types for Google Docs API
 * These complement the googleapis types with more specific structures
 */

import type { docs_v1 } from 'googleapis';

export type Document = docs_v1.Schema$Document;
export type BatchUpdateRequest = docs_v1.Schema$BatchUpdateDocumentRequest;
export type BatchUpdateResponse = docs_v1.Schema$BatchUpdateDocumentResponse;
export type Request = docs_v1.Schema$Request;

// Text style types
export interface TextStyleUpdate {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: { magnitude: number; unit: 'PT' };
  weightedFontFamily?: { fontFamily: string };
  foregroundColor?: { color: { rgbColor: RgbColor } } | Record<string, never>;
  backgroundColor?: { color: { rgbColor: RgbColor } } | Record<string, never>;
  link?: { url: string };
}

export interface RgbColor {
  red?: number;
  green?: number;
  blue?: number;
}

// Range specification
export interface Range {
  startIndex: number;
  endIndex: number;
  segmentId?: string;
  tabId?: string;
}

// Heading levels
export type HeadingLevel = 'NORMAL_TEXT' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'HEADING_4' | 'HEADING_5' | 'HEADING_6' | 'TITLE' | 'SUBTITLE';

// Section break types
export type SectionBreakType = 'CONTINUOUS' | 'NEXT_PAGE';

// Paragraph alignment types
export type ParagraphAlignment = 'START' | 'CENTER' | 'END' | 'JUSTIFIED';

// Content alignment (vertical) for table cells
export type ContentAlignment = 'TOP' | 'MIDDLE' | 'BOTTOM';

// Border dash styles
export type DashStyle = 'SOLID' | 'DOT' | 'DASH';

// Table cell border definition
export interface TableCellBorder {
  color?: { color: { rgbColor: RgbColor } };
  width?: { magnitude: number; unit: 'PT' };
  dashStyle?: DashStyle;
}

// Table cell style for UpdateTableCellStyleRequest
export interface TableCellStyleUpdate {
  backgroundColor?: { color: { rgbColor: RgbColor } } | Record<string, never>;
  borderTop?: TableCellBorder;
  borderBottom?: TableCellBorder;
  borderLeft?: TableCellBorder;
  borderRight?: TableCellBorder;
  paddingTop?: { magnitude: number; unit: 'PT' };
  paddingBottom?: { magnitude: number; unit: 'PT' };
  paddingLeft?: { magnitude: number; unit: 'PT' };
  paddingRight?: { magnitude: number; unit: 'PT' };
  contentAlignment?: ContentAlignment;
}

// Table cell location
export interface TableCellLocation {
  tableStartLocation: { index: number; tabId?: string };
  rowIndex: number;
  columnIndex: number;
}

// Parsed document content for display
export interface ParsedDocument {
  documentId: string;
  title: string;
  revisionId?: string;
  tabs?: ParsedTab[];
}

export interface TabInfo {
  tabId: string;
  title?: string;
  index?: number;
  parentTabId?: string;
  nestingLevel?: number;
  iconEmoji?: string;
  childCount: number;
  hasDocumentTab: boolean;
}

export interface ParsedTab {
  tabId: string;
  title: string;
  content: ParsedContent;
}

export interface ParsedContent {
  text: string;
  elements: ParsedElement[];
}

export interface ParsedElement {
  type: 'paragraph' | 'table' | 'toc' | 'sectionBreak';
  startIndex: number;
  endIndex: number;
  content?: string;
  tableData?: ParsedTable;
}

export interface ParsedTable {
  rows: number;
  columns: number;
  cells: string[][];
}

// Formatted text types for displaying document formatting
export interface FormattedSpan {
  text: string;
  style: TextStyleUpdate;
  startIndex: number;
  endIndex: number;
}

export interface FormattedText {
  spans: FormattedSpan[];
  plainText: string;
}

export interface FormattedCell {
  spans: FormattedSpan[];
  plainText: string;
}

export interface FormattedTable {
  rows: FormattedCell[][];
  plainRows: string[][];
}

export type FormattingDisplayMode = 'visual' | 'markers' | 'none';

// API request builders
export function createInsertTextRequest(text: string, index: number, segmentId?: string, tabId?: string): Request {
  return {
    insertText: {
      text,
      location: {
        index,
        ...(segmentId && { segmentId }),
        ...(tabId && { tabId }),
      },
    },
  };
}

export function createDeleteContentRequest(startIndex: number, endIndex: number, segmentId?: string, tabId?: string): Request {
  return {
    deleteContentRange: {
      range: {
        startIndex,
        endIndex,
        ...(segmentId && { segmentId }),
        ...(tabId && { tabId }),
      },
    },
  };
}

export function createReplaceAllTextRequest(find: string, replace: string, matchCase = true, tabId?: string): Request {
  return {
    replaceAllText: {
      containsText: {
        text: find,
        matchCase,
      },
      replaceText: replace,
      ...(tabId ? { tabsCriteria: { tabIds: [tabId] } } : {}),
    },
  };
}

export function createUpdateTextStyleRequest(
  startIndex: number,
  endIndex: number,
  style: TextStyleUpdate,
  segmentId?: string,
  tabId?: string
): Request {
  const fields = Object.keys(style).join(',');
  return {
    updateTextStyle: {
      range: {
        startIndex,
        endIndex,
        ...(segmentId && { segmentId }),
        ...(tabId && { tabId }),
      },
      textStyle: style,
      fields,
    },
  };
}

export function createUpdateParagraphStyleRequest(
  startIndex: number,
  endIndex: number,
  namedStyleType: HeadingLevel,
  segmentId?: string,
  tabId?: string
): Request {
  return {
    updateParagraphStyle: {
      range: {
        startIndex,
        endIndex,
        ...(segmentId && { segmentId }),
        ...(tabId && { tabId }),
      },
      paragraphStyle: {
        namedStyleType,
      },
      fields: 'namedStyleType',
    },
  };
}

export function createInsertTableRequest(rows: number, columns: number, index: number, tabId?: string): Request {
  return {
    insertTable: {
      rows,
      columns,
      location: {
        index,
        ...(tabId && { tabId }),
      },
    },
  };
}

export function createInsertInlineImageRequest(uri: string, index: number, width?: number, height?: number, tabId?: string): Request {
  const request: Request = {
    insertInlineImage: {
      uri,
      location: {
        index,
        ...(tabId && { tabId }),
      },
    },
  };

  if (width || height) {
    request.insertInlineImage!.objectSize = {};
    if (width) {
      request.insertInlineImage!.objectSize.width = { magnitude: width, unit: 'PT' };
    }
    if (height) {
      request.insertInlineImage!.objectSize.height = { magnitude: height, unit: 'PT' };
    }
  }

  return request;
}

export function createInsertPageBreakRequest(index: number, segmentId?: string, tabId?: string): Request {
  return {
    insertPageBreak: {
      location: {
        index,
        ...(segmentId && { segmentId }),
        ...(tabId && { tabId }),
      },
    },
  };
}

export function createInsertSectionBreakRequest(index: number, type: SectionBreakType, tabId?: string): Request {
  return {
    insertSectionBreak: {
      location: {
        index,
        ...(tabId && { tabId }),
      },
      sectionType: type,
    },
  };
}

export function createCreateNamedRangeRequest(name: string, startIndex: number, endIndex: number, segmentId?: string, tabId?: string): Request {
  return {
    createNamedRange: {
      name,
      range: {
        startIndex,
        endIndex,
        ...(segmentId && { segmentId }),
        ...(tabId && { tabId }),
      },
    },
  };
}

export function createDeleteNamedRangeRequest(namedRangeId?: string, name?: string): Request {
  return {
    deleteNamedRange: {
      ...(namedRangeId && { namedRangeId }),
      ...(name && { name }),
    },
  };
}

export function createReplaceNamedRangeContentRequest(namedRangeName: string, text: string): Request {
  return {
    replaceNamedRangeContent: {
      namedRangeName,
      text,
    },
  };
}

export function createHeaderRequest(type: 'DEFAULT' | 'FIRST' = 'DEFAULT'): Request {
  return {
    createHeader: {
      type,
      sectionBreakLocation: { index: 0 },
    },
  };
}

export function createFooterRequest(type: 'DEFAULT' = 'DEFAULT'): Request {
  return {
    createFooter: {
      type,
      sectionBreakLocation: { index: 0 },
    },
  };
}

export function createDeleteHeaderRequest(headerId: string): Request {
  return {
    deleteHeader: { headerId },
  };
}

export function createDeleteFooterRequest(footerId: string): Request {
  return {
    deleteFooter: { footerId },
  };
}

export function createInsertTableRowRequest(
  tableStartIndex: number,
  rowIndex: number,
  insertBelow = true,
  tabId?: string
): Request {
  return {
    insertTableRow: {
      tableCellLocation: {
        tableStartLocation: {
          index: tableStartIndex,
          ...(tabId && { tabId }),
        },
        rowIndex,
        columnIndex: 0,
      },
      insertBelow,
    },
  };
}

export function createInsertTableColumnRequest(
  tableStartIndex: number,
  columnIndex: number,
  insertRight = true,
  tabId?: string
): Request {
  return {
    insertTableColumn: {
      tableCellLocation: {
        tableStartLocation: {
          index: tableStartIndex,
          ...(tabId && { tabId }),
        },
        rowIndex: 0,
        columnIndex,
      },
      insertRight,
    },
  };
}

export function createDeleteTableRowRequest(
  tableStartIndex: number,
  rowIndex: number,
  tabId?: string
): Request {
  return {
    deleteTableRow: {
      tableCellLocation: {
        tableStartLocation: {
          index: tableStartIndex,
          ...(tabId && { tabId }),
        },
        rowIndex,
        columnIndex: 0,
      },
    },
  };
}

export function createDeleteTableColumnRequest(
  tableStartIndex: number,
  columnIndex: number,
  tabId?: string
): Request {
  return {
    deleteTableColumn: {
      tableCellLocation: {
        tableStartLocation: {
          index: tableStartIndex,
          ...(tabId && { tabId }),
        },
        rowIndex: 0,
        columnIndex,
      },
    },
  };
}

export function createParagraphBulletsRequest(
  startIndex: number,
  endIndex: number,
  bulletPreset = 'BULLET_DISC_CIRCLE_SQUARE',
  tabId?: string
): Request {
  return {
    createParagraphBullets: {
      range: {
        startIndex,
        endIndex,
        ...(tabId && { tabId }),
      },
      bulletPreset,
    },
  };
}

export function createDeleteParagraphBulletsRequest(
  startIndex: number,
  endIndex: number,
  tabId?: string
): Request {
  return {
    deleteParagraphBullets: {
      range: {
        startIndex,
        endIndex,
        ...(tabId && { tabId }),
      },
    },
  };
}

export function createUpdateTableCellStyleRequest(
  tableStartIndex: number,
  rowIndex: number,
  columnIndex: number,
  rowSpan: number,
  columnSpan: number,
  style: TableCellStyleUpdate,
  tabId?: string
): Request {
  const fields = Object.keys(style).join(',');
  return {
    updateTableCellStyle: {
      tableRange: {
        tableCellLocation: {
          tableStartLocation: {
            index: tableStartIndex,
            ...(tabId && { tabId }),
          },
          rowIndex,
          columnIndex,
        },
        rowSpan,
        columnSpan,
      },
      tableCellStyle: style,
      fields,
    },
  };
}

export function createMergeTableCellsRequest(
  tableStartIndex: number,
  rowIndex: number,
  columnIndex: number,
  rowSpan: number,
  columnSpan: number,
  tabId?: string
): Request {
  return {
    mergeTableCells: {
      tableRange: {
        tableCellLocation: {
          tableStartLocation: {
            index: tableStartIndex,
            ...(tabId && { tabId }),
          },
          rowIndex,
          columnIndex,
        },
        rowSpan,
        columnSpan,
      },
    },
  };
}

export function createUnmergeTableCellsRequest(
  tableStartIndex: number,
  rowIndex: number,
  columnIndex: number,
  rowSpan: number,
  columnSpan: number,
  tabId?: string
): Request {
  return {
    unmergeTableCells: {
      tableRange: {
        tableCellLocation: {
          tableStartLocation: {
            index: tableStartIndex,
            ...(tabId && { tabId }),
          },
          rowIndex,
          columnIndex,
        },
        rowSpan,
        columnSpan,
      },
    },
  };
}

export function createUpdateParagraphAlignmentRequest(
  startIndex: number,
  endIndex: number,
  alignment: ParagraphAlignment,
  segmentId?: string,
  tabId?: string
): Request {
  return {
    updateParagraphStyle: {
      range: {
        startIndex,
        endIndex,
        ...(segmentId && { segmentId }),
        ...(tabId && { tabId }),
      },
      paragraphStyle: {
        alignment,
      },
      fields: 'alignment',
    },
  };
}
