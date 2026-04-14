/**
 * Google Docs API client wrapper
 * Provides high-level methods for document operations
 */

import { google, docs_v1, drive_v3 } from 'googleapis';
import { getAuthClient } from './auth.js';
import {
  Document,
  Request,
  createInsertTextRequest,
  createDeleteContentRequest,
  createReplaceAllTextRequest,
  createUpdateTextStyleRequest,
  createUpdateParagraphStyleRequest,
  createInsertTableRequest,
  createInsertInlineImageRequest,
  createInsertPageBreakRequest,
  createInsertSectionBreakRequest,
  createCreateNamedRangeRequest,
  createDeleteNamedRangeRequest,
  createReplaceNamedRangeContentRequest,
  createHeaderRequest,
  createFooterRequest,
  createDeleteHeaderRequest,
  createDeleteFooterRequest,
  createInsertTableRowRequest,
  createInsertTableColumnRequest,
  createDeleteTableRowRequest,
  createDeleteTableColumnRequest,
  createUpdateTableCellStyleRequest,
  createMergeTableCellsRequest,
  createUnmergeTableCellsRequest,
  createUpdateParagraphAlignmentRequest,
  TextStyleUpdate,
  TableCellStyleUpdate,
  ParagraphAlignment,
  HeadingLevel,
  SectionBreakType,
  TabInfo,
  FormattedSpan,
  FormattedText,
  FormattedCell,
  FormattedTable,
} from './types.js';
import { DocumentError, ApiError } from '../utils/errors.js';

let docsService: docs_v1.Docs | null = null;
let driveService: drive_v3.Drive | null = null;

/**
 * Get the Google Docs API service instance
 */
async function getDocsService(): Promise<docs_v1.Docs> {
  if (!docsService) {
    const auth = await getAuthClient();
    docsService = google.docs({ version: 'v1', auth });
  }
  return docsService;
}

/**
 * Get the Google Drive API service instance
 */
async function getDriveService(): Promise<drive_v3.Drive> {
  if (!driveService) {
    const auth = await getAuthClient();
    driveService = google.drive({ version: 'v3', auth });
  }
  return driveService;
}

/**
 * Create a new document
 */
export async function createDocument(title: string): Promise<Document> {
  const docs = await getDocsService();
  try {
    const response = await docs.documents.create({
      requestBody: { title },
    });
    return response.data;
  } catch (error) {
    throw wrapApiError(error, 'Failed to create document');
  }
}

/**
 * Get a document by ID
 */
export async function getDocument(
  documentId: string,
  options?: { includeTabsContent?: boolean }
): Promise<Document> {
  const docs = await getDocsService();
  try {
    const response = await docs.documents.get({
      documentId,
      ...(options?.includeTabsContent !== undefined ? { includeTabsContent: options.includeTabsContent } : {}),
    });
    return response.data;
  } catch (error) {
    throw wrapApiError(error, `Failed to get document ${documentId}`);
  }
}

function flattenTabs(tabs: docs_v1.Schema$Tab[] | undefined, acc: TabInfo[] = []): TabInfo[] {
  if (!tabs) return acc;
  for (const tab of tabs) {
    const props = tab.tabProperties;
    if (props?.tabId) {
      acc.push({
        tabId: props.tabId,
        title: props.title ?? undefined,
        index: props.index ?? undefined,
        parentTabId: props.parentTabId ?? undefined,
        nestingLevel: props.nestingLevel ?? undefined,
        iconEmoji: props.iconEmoji ?? undefined,
        childCount: tab.childTabs?.length ?? 0,
        hasDocumentTab: Boolean(tab.documentTab),
      });
    }
    if (tab.childTabs?.length) {
      flattenTabs(tab.childTabs, acc);
    }
  }
  return acc;
}

function findTabById(tabs: docs_v1.Schema$Tab[] | undefined, tabId: string): docs_v1.Schema$Tab | undefined {
  if (!tabs) return undefined;
  for (const tab of tabs) {
    if (tab.tabProperties?.tabId === tabId) {
      return tab;
    }
    const child = findTabById(tab.childTabs, tabId);
    if (child) return child;
  }
  return undefined;
}

function getTabContent(doc: Document, tabId?: string): docs_v1.Schema$StructuralElement[] {
  if (!tabId) {
    return doc.body?.content ?? [];
  }
  const tab = findTabById(doc.tabs, tabId);
  if (!tab?.documentTab?.body) {
    throw new DocumentError(`Tab not found: ${tabId}`);
  }
  return tab.documentTab.body.content ?? [];
}

function getTabInlineObjects(doc: Document, tabId?: string): Record<string, docs_v1.Schema$InlineObject> {
  if (!tabId) {
    return doc.inlineObjects ?? {};
  }
  const tab = findTabById(doc.tabs, tabId);
  if (!tab?.documentTab) {
    throw new DocumentError(`Tab not found: ${tabId}`);
  }
  return tab.documentTab.inlineObjects ?? {};
}

export async function listTabs(documentId: string): Promise<TabInfo[]> {
  const doc = await getDocument(documentId, { includeTabsContent: true });
  return flattenTabs(doc.tabs);
}

/**
 * Execute a batch update on a document
 */
export async function batchUpdate(documentId: string, requests: Request[]): Promise<docs_v1.Schema$BatchUpdateDocumentResponse> {
  const docs = await getDocsService();
  try {
    const response = await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests },
    });
    return response.data;
  } catch (error) {
    throw wrapApiError(error, 'Batch update failed');
  }
}

// ============== Text Operations ==============

/**
 * Insert text at a specific index
 */
export async function insertText(
  documentId: string,
  text: string,
  index: number,
  segmentId?: string,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [createInsertTextRequest(text, index, segmentId, tabId)]);
}

/**
 * Delete content in a range
 */
export async function deleteContent(
  documentId: string,
  startIndex: number,
  endIndex: number,
  segmentId?: string,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [createDeleteContentRequest(startIndex, endIndex, segmentId, tabId)]);
}

/**
 * Replace all occurrences of text
 */
export async function replaceAllText(
  documentId: string,
  find: string,
  replace: string,
  matchCase = true,
  tabId?: string
): Promise<number> {
  const response = await batchUpdate(documentId, [createReplaceAllTextRequest(find, replace, matchCase, tabId)]);
  const replies = response.replies ?? [];
  return replies[0]?.replaceAllText?.occurrencesChanged ?? 0;
}

/**
 * Find text in document and return locations
 * Searches in body content, tables, headers, footers, and footnotes
 */
export async function findText(
  documentId: string,
  searchText: string,
  options?: { tabId?: string }
): Promise<Array<{
  startIndex: number;
  endIndex: number;
  text: string;
  context?: { tabId?: string; inTable?: boolean; tableIndex?: number; row?: number; col?: number };
}>> {
  const doc = await getDocument(documentId, { includeTabsContent: Boolean(options?.tabId) });
  const results: Array<{
    startIndex: number;
    endIndex: number;
    text: string;
    context?: { tabId?: string; inTable?: boolean; tableIndex?: number; row?: number; col?: number };
  }> = [];

  // Helper to search in paragraph elements
  const searchInParagraph = (
    elements: docs_v1.Schema$ParagraphElement[] | undefined,
    context?: { tabId?: string; inTable?: boolean; tableIndex?: number; row?: number; col?: number }
  ) => {
    if (!elements) return;
    for (const paragraphElement of elements) {
      if (paragraphElement.textRun?.content) {
        const content = paragraphElement.textRun.content;
        const startIdx = paragraphElement.startIndex ?? 0;
        let searchIdx = 0;

        while ((searchIdx = content.indexOf(searchText, searchIdx)) !== -1) {
          results.push({
            startIndex: startIdx + searchIdx,
            endIndex: startIdx + searchIdx + searchText.length,
            text: searchText,
            context,
          });
          searchIdx += searchText.length;
        }
      }
    }
  };

  // Helper to search in structural elements (recursive for tables)
  const searchInContent = (content: docs_v1.Schema$StructuralElement[] | undefined, tableIndex?: number) => {
    if (!content) return;
    let currentTableIndex = tableIndex ?? 0;

    for (const element of content) {
      // Search in paragraphs
      if (element.paragraph?.elements) {
        searchInParagraph(element.paragraph.elements, options?.tabId ? { tabId: options.tabId } : undefined);
      }

      // Search in tables
      if (element.table) {
        const tableRows = element.table.tableRows ?? [];
        for (let rowIdx = 0; rowIdx < tableRows.length; rowIdx++) {
          const row = tableRows[rowIdx];
          const tableCells = row.tableCells ?? [];
          for (let colIdx = 0; colIdx < tableCells.length; colIdx++) {
            const cell = tableCells[colIdx];
            const cellContent = cell.content ?? [];
            for (const cellElement of cellContent) {
              if (cellElement.paragraph?.elements) {
                searchInParagraph(cellElement.paragraph.elements, {
                  tabId: options?.tabId,
                  inTable: true,
                  tableIndex: currentTableIndex,
                  row: rowIdx,
                  col: colIdx,
                });
              }
            }
          }
        }
        currentTableIndex++;
      }
    }
  };

  // Search in body
  const body = getTabContent(doc, options?.tabId);
  searchInContent(body);

  return results;
}

/**
 * Find text in document and return just the index ranges
 * Useful for format-by-text operations
 */
export async function findTextIndexes(
  documentId: string,
  searchText: string,
  options?: { all?: boolean; tabId?: string }
): Promise<Array<{ start: number; end: number }>> {
  const results = await findText(documentId, searchText, { tabId: options?.tabId });
  const ranges = results.map(r => ({ start: r.startIndex, end: r.endIndex }));

  if (!options?.all && ranges.length > 0) {
    return [ranges[0]];  // Return only first match
  }
  return ranges;
}

/**
 * Read text content from document
 */
export async function readText(
  documentId: string,
  startIndex?: number,
  endIndex?: number,
  options?: { tabId?: string }
): Promise<string> {
  const doc = await getDocument(documentId, { includeTabsContent: Boolean(options?.tabId) });
  let fullText = '';

  const body = getTabContent(doc, options?.tabId);
  for (const element of body) {
    if (element.paragraph?.elements) {
      for (const paragraphElement of element.paragraph.elements) {
        if (paragraphElement.textRun?.content) {
          fullText += paragraphElement.textRun.content;
        }
      }
    }
  }

  if (startIndex !== undefined && endIndex !== undefined) {
    // Adjust for the fact that indexes include structural elements
    return fullText.slice(startIndex - 1, endIndex - 1);
  }

  return fullText;
}

/**
 * Extract text style from a textRun element
 */
function extractTextStyle(textRun: docs_v1.Schema$TextRun): TextStyleUpdate {
  const style: TextStyleUpdate = {};
  const ts = textRun.textStyle;
  if (!ts) return style;

  if (ts.bold) style.bold = true;
  if (ts.italic) style.italic = true;
  if (ts.underline) style.underline = true;
  if (ts.strikethrough) style.strikethrough = true;
  if (ts.fontSize?.magnitude) {
    style.fontSize = { magnitude: ts.fontSize.magnitude, unit: 'PT' };
  }
  if (ts.weightedFontFamily?.fontFamily) {
    style.weightedFontFamily = { fontFamily: ts.weightedFontFamily.fontFamily };
  }
  if (ts.foregroundColor?.color?.rgbColor) {
    style.foregroundColor = {
      color: {
        rgbColor: {
          red: ts.foregroundColor.color.rgbColor.red ?? 0,
          green: ts.foregroundColor.color.rgbColor.green ?? 0,
          blue: ts.foregroundColor.color.rgbColor.blue ?? 0,
        },
      },
    };
  }
  if (ts.backgroundColor?.color?.rgbColor) {
    style.backgroundColor = {
      color: {
        rgbColor: {
          red: ts.backgroundColor.color.rgbColor.red ?? 0,
          green: ts.backgroundColor.color.rgbColor.green ?? 0,
          blue: ts.backgroundColor.color.rgbColor.blue ?? 0,
        },
      },
    };
  }
  if (ts.link?.url) {
    style.link = { url: ts.link.url };
  }
  return style;
}

/**
 * Read text content with formatting information
 */
export async function readTextWithFormatting(
  documentId: string,
  startIndex?: number,
  endIndex?: number,
  options?: { tabId?: string }
): Promise<FormattedText> {
  const doc = await getDocument(documentId, { includeTabsContent: Boolean(options?.tabId) });
  const spans: FormattedSpan[] = [];
  let plainText = '';

  const body = getTabContent(doc, options?.tabId);

  for (const element of body) {
    if (element.paragraph?.elements) {
      for (const pe of element.paragraph.elements) {
        if (pe.textRun?.content) {
          const text = pe.textRun.content;
          const start = pe.startIndex ?? 0;
          const end = pe.endIndex ?? 0;

          // Apply range filter if specified
          if (startIndex !== undefined && endIndex !== undefined) {
            if (end <= startIndex || start >= endIndex) {
              continue;
            }
          }

          const style = extractTextStyle(pe.textRun);

          spans.push({
            text,
            style,
            startIndex: start,
            endIndex: end,
          });
          plainText += text;
        }
      }
    }
  }

  return { spans, plainText };
}

/**
 * Read table content with formatting information
 */
export async function readTableWithFormatting(
  documentId: string,
  tableIndex: number,
  options?: { tabId?: string }
): Promise<FormattedTable> {
  const doc = await getDocument(documentId, { includeTabsContent: Boolean(options?.tabId) });
  const body = getTabContent(doc, options?.tabId);

  let currentIndex = 0;
  for (const element of body) {
    if (element.table) {
      if (currentIndex === tableIndex) {
        const rows: FormattedCell[][] = [];
        const plainRows: string[][] = [];

        for (const row of element.table.tableRows ?? []) {
          const cellsWithFormat: FormattedCell[] = [];
          const plainCells: string[] = [];

          for (const cell of row.tableCells ?? []) {
            const spans: FormattedSpan[] = [];
            let cellText = '';

            for (const content of cell.content ?? []) {
              if (content.paragraph?.elements) {
                for (const elem of content.paragraph.elements) {
                  if (elem.textRun?.content) {
                    const text = elem.textRun.content;
                    const style = extractTextStyle(elem.textRun);

                    spans.push({
                      text,
                      style,
                      startIndex: elem.startIndex ?? 0,
                      endIndex: elem.endIndex ?? 0,
                    });
                    cellText += text;
                  }
                }
              }
            }

            cellsWithFormat.push({
              spans,
              plainText: cellText.trim(),
            });
            plainCells.push(cellText.trim());
          }

          rows.push(cellsWithFormat);
          plainRows.push(plainCells);
        }

        return { rows, plainRows };
      }
      currentIndex++;
    }
  }

  throw new DocumentError(`Table at index ${tableIndex} not found`);
}

/**
 * Get text style at a specific index
 * Returns the style of the character at the given document index
 */
export async function getTextStyleAtIndex(documentId: string, index: number, tabId?: string): Promise<TextStyleUpdate> {
  const doc = await getDocument(documentId, { includeTabsContent: Boolean(tabId) });
  const body = getTabContent(doc, tabId);

  // Helper to extract style from textRun
  const extractStyle = (textRun: docs_v1.Schema$TextRun): TextStyleUpdate => {
    const style: TextStyleUpdate = {};
    const ts = textRun.textStyle;
    if (!ts) return style;

    if (ts.bold) style.bold = true;
    if (ts.italic) style.italic = true;
    if (ts.underline) style.underline = true;
    if (ts.strikethrough) style.strikethrough = true;
    if (ts.fontSize?.magnitude) {
      style.fontSize = { magnitude: ts.fontSize.magnitude, unit: 'PT' };
    }
    if (ts.weightedFontFamily?.fontFamily) {
      style.weightedFontFamily = { fontFamily: ts.weightedFontFamily.fontFamily };
    }
    if (ts.foregroundColor?.color?.rgbColor) {
      style.foregroundColor = {
        color: {
          rgbColor: {
            red: ts.foregroundColor.color.rgbColor.red ?? 0,
            green: ts.foregroundColor.color.rgbColor.green ?? 0,
            blue: ts.foregroundColor.color.rgbColor.blue ?? 0,
          },
        },
      };
    }
    if (ts.backgroundColor?.color?.rgbColor) {
      style.backgroundColor = {
        color: {
          rgbColor: {
            red: ts.backgroundColor.color.rgbColor.red ?? 0,
            green: ts.backgroundColor.color.rgbColor.green ?? 0,
            blue: ts.backgroundColor.color.rgbColor.blue ?? 0,
          },
        },
      };
    }
    if (ts.link?.url) {
      style.link = { url: ts.link.url };
    }
    return style;
  };

  // Search through paragraphs
  for (const element of body) {
    if (element.paragraph?.elements) {
      for (const pe of element.paragraph.elements) {
        const start = pe.startIndex ?? 0;
        const end = pe.endIndex ?? 0;
        if (index >= start && index < end && pe.textRun) {
          return extractStyle(pe.textRun);
        }
      }
    }
    // Also search in tables
    if (element.table?.tableRows) {
      for (const row of element.table.tableRows) {
        for (const cell of row.tableCells ?? []) {
          for (const content of cell.content ?? []) {
            if (content.paragraph?.elements) {
              for (const pe of content.paragraph.elements) {
                const start = pe.startIndex ?? 0;
                const end = pe.endIndex ?? 0;
                if (index >= start && index < end && pe.textRun) {
                  return extractStyle(pe.textRun);
                }
              }
            }
          }
        }
      }
    }
  }

  return {}; // No style found, return empty
}

/**
 * Replace text while preserving formatting
 * Processes replacements from end to start to maintain valid indexes
 */
export async function replaceTextWithStyle(
  documentId: string,
  find: string,
  replacement: string,
  caseSensitive = true,
  tabId?: string
): Promise<number> {
  // Find all occurrences
  const occurrences = await findText(documentId, find, { tabId });
  if (occurrences.length === 0) return 0;

  // Sort by startIndex descending (process from end to start)
  occurrences.sort((a, b) => b.startIndex - a.startIndex);

  // For each occurrence, capture style, delete, insert, and reapply style
  for (const occ of occurrences) {
    // Capture the style at the start of the text
    const style = await getTextStyleAtIndex(documentId, occ.startIndex, tabId);

    // Delete old text and insert new text in one batch
    const requests: Request[] = [
      createDeleteContentRequest(occ.startIndex, occ.endIndex, undefined, tabId),
      createInsertTextRequest(replacement, occ.startIndex, undefined, tabId),
    ];

    // If there's any style to apply, add it
    if (Object.keys(style).length > 0) {
      requests.push(
        createUpdateTextStyleRequest(
          occ.startIndex,
          occ.startIndex + replacement.length,
          style,
          undefined,
          tabId
        )
      );
    }

    await batchUpdate(documentId, requests);
  }

  return occurrences.length;
}

// ============== Formatting Operations ==============

/**
 * Update text style in a range
 */
export async function updateTextStyle(
  documentId: string,
  startIndex: number,
  endIndex: number,
  style: TextStyleUpdate,
  segmentId?: string,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [createUpdateTextStyleRequest(startIndex, endIndex, style, segmentId, tabId)]);
}

/**
 * Update text style in multiple ranges at once (batch operation)
 */
export async function updateTextStyleBatch(
  documentId: string,
  ranges: Array<{ start: number; end: number }>,
  style: TextStyleUpdate,
  segmentId?: string,
  tabId?: string
): Promise<number> {
  const requests = ranges.map(range =>
    createUpdateTextStyleRequest(range.start, range.end, style, segmentId, tabId)
  );
  await batchUpdate(documentId, requests);
  return ranges.length;
}

/**
 * Apply a heading style to paragraphs
 */
export async function applyHeading(
  documentId: string,
  startIndex: number,
  endIndex: number,
  level: HeadingLevel,
  segmentId?: string,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [createUpdateParagraphStyleRequest(startIndex, endIndex, level, segmentId, tabId)]);
}

// ============== Table Operations ==============

/**
 * Insert a table
 */
export async function insertTable(
  documentId: string,
  rows: number,
  columns: number,
  index: number,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [createInsertTableRequest(rows, columns, index, tabId)]);
}

/**
 * List all tables in a document
 */
export async function listTables(documentId: string, options?: { tabId?: string }): Promise<Array<{
  tableIndex: number;
  startIndex: number;
  endIndex: number;
  rows: number;
  columns: number;
}>> {
  const doc = await getDocument(documentId, { includeTabsContent: Boolean(options?.tabId) });
  const tables: Array<{
    tableIndex: number;
    startIndex: number;
    endIndex: number;
    rows: number;
    columns: number;
  }> = [];

  let tableIndex = 0;
  const body = getTabContent(doc, options?.tabId);

  for (const element of body) {
    if (element.table) {
      tables.push({
        tableIndex,
        startIndex: element.startIndex ?? 0,
        endIndex: element.endIndex ?? 0,
        rows: element.table.rows ?? 0,
        columns: element.table.columns ?? 0,
      });
      tableIndex++;
    }
  }

  return tables;
}

/**
 * Read table content
 */
export async function readTable(documentId: string, tableIndex: number, options?: { tabId?: string }): Promise<string[][]> {
  const doc = await getDocument(documentId, { includeTabsContent: Boolean(options?.tabId) });
  const body = getTabContent(doc, options?.tabId);

  let currentIndex = 0;
  for (const element of body) {
    if (element.table) {
      if (currentIndex === tableIndex) {
        const cells: string[][] = [];
        for (const row of element.table.tableRows ?? []) {
          const rowCells: string[] = [];
          for (const cell of row.tableCells ?? []) {
            let cellText = '';
            for (const content of cell.content ?? []) {
              if (content.paragraph?.elements) {
                for (const elem of content.paragraph.elements) {
                  if (elem.textRun?.content) {
                    cellText += elem.textRun.content;
                  }
                }
              }
            }
            rowCells.push(cellText.trim());
          }
          cells.push(rowCells);
        }
        return cells;
      }
      currentIndex++;
    }
  }

  throw new DocumentError(`Table at index ${tableIndex} not found`);
}

/**
 * Get detailed table structure with cell indexes
 */
export async function getTableStructure(
  documentId: string,
  tableIndex: number,
  options?: { tabId?: string }
): Promise<{
  rows: number;
  columns: number;
  cells: Array<{
    row: number;
    col: number;
    startIndex: number;
    endIndex: number;
    text: string;
  }>;
}> {
  const doc = await getDocument(documentId, { includeTabsContent: Boolean(options?.tabId) });
  const body = getTabContent(doc, options?.tabId);

  let currentIndex = 0;
  for (const element of body) {
    if (element.table) {
      if (currentIndex === tableIndex) {
        const cells: Array<{
          row: number;
          col: number;
          startIndex: number;
          endIndex: number;
          text: string;
        }> = [];

        const tableRows = element.table.tableRows ?? [];
        for (let rowIdx = 0; rowIdx < tableRows.length; rowIdx++) {
          const row = tableRows[rowIdx];
          const tableCells = row.tableCells ?? [];
          for (let colIdx = 0; colIdx < tableCells.length; colIdx++) {
            const cell = tableCells[colIdx];
            // Cell content has start/end indexes
            const content = cell.content ?? [];
            if (content.length > 0) {
              const firstContent = content[0];
              const lastContent = content[content.length - 1];
              // Get text content
              let cellText = '';
              for (const c of content) {
                if (c.paragraph?.elements) {
                  for (const elem of c.paragraph.elements) {
                    if (elem.textRun?.content) {
                      cellText += elem.textRun.content;
                    }
                  }
                }
              }
              cells.push({
                row: rowIdx,
                col: colIdx,
                startIndex: firstContent.startIndex ?? 0,
                endIndex: lastContent.endIndex ?? 0,
                text: cellText.trim(),
              });
            }
          }
        }

        return {
          rows: element.table.rows ?? 0,
          columns: element.table.columns ?? 0,
          cells,
        };
      }
      currentIndex++;
    }
  }

  throw new DocumentError(`Table at index ${tableIndex} not found`);
}

/**
 * Get cell range for a specific cell
 */
export async function getTableCellRange(
  documentId: string,
  tableIndex: number,
  row: number,
  col: number,
  tabId?: string
): Promise<{ start: number; end: number }> {
  const structure = await getTableStructure(documentId, tableIndex, { tabId });
  const cell = structure.cells.find(c => c.row === row && c.col === col);
  if (!cell) {
    throw new DocumentError(`Cell (${row}, ${col}) not found in table ${tableIndex}`);
  }
  return { start: cell.startIndex, end: cell.endIndex };
}

/**
 * Get cell ranges for an entire row
 */
export async function getTableRowRanges(
  documentId: string,
  tableIndex: number,
  row: number,
  tabId?: string
): Promise<Array<{ start: number; end: number }>> {
  const structure = await getTableStructure(documentId, tableIndex, { tabId });
  const rowCells = structure.cells.filter(c => c.row === row);
  if (rowCells.length === 0) {
    throw new DocumentError(`Row ${row} not found in table ${tableIndex}`);
  }
  return rowCells.map(c => ({ start: c.startIndex, end: c.endIndex }));
}

/**
 * Get cell ranges for an entire column
 */
export async function getTableColumnRanges(
  documentId: string,
  tableIndex: number,
  col: number,
  tabId?: string
): Promise<Array<{ start: number; end: number }>> {
  const structure = await getTableStructure(documentId, tableIndex, { tabId });
  const colCells = structure.cells.filter(c => c.col === col);
  if (colCells.length === 0) {
    throw new DocumentError(`Column ${col} not found in table ${tableIndex}`);
  }
  return colCells.map(c => ({ start: c.startIndex, end: c.endIndex }));
}

/**
 * Insert a table row
 */
export async function insertTableRow(
  documentId: string,
  tableStartIndex: number,
  rowIndex: number,
  insertBelow = true,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [createInsertTableRowRequest(tableStartIndex, rowIndex, insertBelow, tabId)]);
}

/**
 * Insert a table column
 */
export async function insertTableColumn(
  documentId: string,
  tableStartIndex: number,
  columnIndex: number,
  insertRight = true,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [createInsertTableColumnRequest(tableStartIndex, columnIndex, insertRight, tabId)]);
}

/**
 * Delete a table row
 */
export async function deleteTableRow(documentId: string, tableStartIndex: number, rowIndex: number, tabId?: string): Promise<void> {
  await batchUpdate(documentId, [createDeleteTableRowRequest(tableStartIndex, rowIndex, tabId)]);
}

/**
 * Delete a table column
 */
export async function deleteTableColumn(documentId: string, tableStartIndex: number, columnIndex: number, tabId?: string): Promise<void> {
  await batchUpdate(documentId, [createDeleteTableColumnRequest(tableStartIndex, columnIndex, tabId)]);
}

/**
 * Get header row content for column name resolution
 * @returns Map of column name (lowercase, trimmed) to column index
 */
export async function getTableHeaderRow(
  documentId: string,
  tableIndex: number,
  tabId?: string
): Promise<Map<string, number>> {
  const structure = await getTableStructure(documentId, tableIndex, { tabId });
  const headerMap = new Map<string, number>();

  // Get row 0 cells
  const headerCells = structure.cells.filter(c => c.row === 0);
  for (const cell of headerCells) {
    const normalizedName = cell.text.toLowerCase().trim();
    if (normalizedName) {
      headerMap.set(normalizedName, cell.col);
    }
  }

  return headerMap;
}

/**
 * Find rows in a table that contain the search text in any cell
 * @returns Array of row indexes and the cell text that matched
 */
export async function findRowsByText(
  documentId: string,
  tableIndex: number,
  searchText: string,
  tabId?: string
): Promise<Array<{ row: number; matchedCell: { col: number; text: string } }>> {
  const structure = await getTableStructure(documentId, tableIndex, { tabId });
  const matches: Array<{ row: number; matchedCell: { col: number; text: string } }> = [];

  // Group cells by row
  const rowsMap = new Map<number, typeof structure.cells>();
  for (const cell of structure.cells) {
    if (!rowsMap.has(cell.row)) {
      rowsMap.set(cell.row, []);
    }
    rowsMap.get(cell.row)!.push(cell);
  }

  // Search each row (case-insensitive)
  const searchLower = searchText.toLowerCase();
  for (const [rowIndex, cells] of rowsMap) {
    for (const cell of cells) {
      if (cell.text.toLowerCase().includes(searchLower)) {
        matches.push({
          row: rowIndex,
          matchedCell: { col: cell.col, text: cell.text }
        });
        break; // Only report first matching cell per row
      }
    }
  }

  return matches;
}

/**
 * Set the content of a table cell
 * @param preserveFormatting If true, captures existing style and reapplies it
 */
export async function setCellContent(
  documentId: string,
  tableIndex: number,
  row: number,
  col: number,
  content: string,
  preserveFormatting = false,
  tabId?: string
): Promise<void> {
  const range = await getTableCellRange(documentId, tableIndex, row, col, tabId);

  // Cell range includes the paragraph marker at the end (newline)
  // Delete content but preserve the paragraph structure
  const contentStart = range.start;
  const contentEnd = range.end - 1; // Preserve paragraph marker

  const requests: Request[] = [];
  let style: TextStyleUpdate = {};

  // Capture existing style if preserving formatting
  if (preserveFormatting && contentEnd > contentStart) {
    style = await getTextStyleAtIndex(documentId, contentStart, tabId);
  }

  // Delete existing content (if any)
  if (contentEnd > contentStart) {
    requests.push(createDeleteContentRequest(contentStart, contentEnd, undefined, tabId));
  }

  // Insert new content
  if (content.length > 0) {
    requests.push(createInsertTextRequest(content, contentStart, undefined, tabId));

    // Reapply style if preserving formatting
    if (preserveFormatting && Object.keys(style).length > 0) {
      requests.push(
        createUpdateTextStyleRequest(
          contentStart,
          contentStart + content.length,
          style,
          undefined,
          tabId
        )
      );
    }
  }

  if (requests.length > 0) {
    await batchUpdate(documentId, requests);
  }
}

/**
 * Set content of multiple cells (for --all flag)
 * Each cell is updated in a separate API call to avoid index conflicts
 */
export async function setCellContentBatch(
  documentId: string,
  tableIndex: number,
  cells: Array<{ row: number; col: number }>,
  content: string,
  preserveFormatting = false,
  tabId?: string
): Promise<number> {
  // Sort cells by their position (descending) to process from end to start
  // This ensures index positions remain valid as we modify the document
  const cellsWithRanges: Array<{
    row: number;
    col: number;
    start: number;
    end: number;
  }> = [];

  for (const cell of cells) {
    const range = await getTableCellRange(documentId, tableIndex, cell.row, cell.col, tabId);
    cellsWithRanges.push({
      ...cell,
      start: range.start,
      end: range.end - 1, // Preserve paragraph marker
    });
  }

  // Sort by start index descending (process end to start)
  cellsWithRanges.sort((a, b) => b.start - a.start);

  // Process each cell with separate API calls to avoid index conflicts
  for (const cell of cellsWithRanges) {
    const requests: Request[] = [];
    let style: TextStyleUpdate = {};

    // Capture style before deletion if preserving
    if (preserveFormatting && cell.end > cell.start) {
      style = await getTextStyleAtIndex(documentId, cell.start, tabId);
    }

    // Delete existing content
    if (cell.end > cell.start) {
      requests.push(createDeleteContentRequest(cell.start, cell.end, undefined, tabId));
    }

    // Insert new content
    if (content.length > 0) {
      requests.push(createInsertTextRequest(content, cell.start, undefined, tabId));

      if (preserveFormatting && Object.keys(style).length > 0) {
        requests.push(
          createUpdateTextStyleRequest(
            cell.start,
            cell.start + content.length,
            style,
            undefined,
            tabId
          )
        );
      }
    }

    if (requests.length > 0) {
      await batchUpdate(documentId, requests);
    }
  }

  return cellsWithRanges.length;
}

// ============== Table Cell Style Operations ==============

/**
 * Update table cell style (background color, borders, content alignment, padding)
 * Can target a single cell or a range of cells via rowSpan/columnSpan
 */
export async function updateTableCellStyle(
  documentId: string,
  tableStartIndex: number,
  rowIndex: number,
  columnIndex: number,
  style: TableCellStyleUpdate,
  rowSpan = 1,
  columnSpan = 1,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [
    createUpdateTableCellStyleRequest(tableStartIndex, rowIndex, columnIndex, rowSpan, columnSpan, style, tabId),
  ]);
}

/**
 * Update table cell style for multiple cells in a batch
 */
export async function updateTableCellStyleBatch(
  documentId: string,
  tableStartIndex: number,
  cells: Array<{ row: number; col: number }>,
  style: TableCellStyleUpdate,
  tabId?: string
): Promise<number> {
  const requests = cells.map(cell =>
    createUpdateTableCellStyleRequest(tableStartIndex, cell.row, cell.col, 1, 1, style, tabId)
  );
  await batchUpdate(documentId, requests);
  return cells.length;
}

/**
 * Merge table cells
 */
export async function mergeTableCells(
  documentId: string,
  tableStartIndex: number,
  rowIndex: number,
  columnIndex: number,
  rowSpan: number,
  columnSpan: number,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [
    createMergeTableCellsRequest(tableStartIndex, rowIndex, columnIndex, rowSpan, columnSpan, tabId),
  ]);
}

/**
 * Unmerge table cells
 */
export async function unmergeTableCells(
  documentId: string,
  tableStartIndex: number,
  rowIndex: number,
  columnIndex: number,
  rowSpan: number,
  columnSpan: number,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [
    createUnmergeTableCellsRequest(tableStartIndex, rowIndex, columnIndex, rowSpan, columnSpan, tabId),
  ]);
}

/**
 * Update paragraph alignment in a range (works for text inside table cells)
 */
export async function updateParagraphAlignment(
  documentId: string,
  startIndex: number,
  endIndex: number,
  alignment: ParagraphAlignment,
  segmentId?: string,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [
    createUpdateParagraphAlignmentRequest(startIndex, endIndex, alignment, segmentId, tabId),
  ]);
}

/**
 * Update paragraph alignment for multiple ranges at once
 */
export async function updateParagraphAlignmentBatch(
  documentId: string,
  ranges: Array<{ start: number; end: number }>,
  alignment: ParagraphAlignment,
  segmentId?: string,
  tabId?: string
): Promise<number> {
  const requests = ranges.map(range =>
    createUpdateParagraphAlignmentRequest(range.start, range.end, alignment, segmentId, tabId)
  );
  await batchUpdate(documentId, requests);
  return ranges.length;
}

// ============== Image Operations ==============

/**
 * Insert an inline image
 */
export async function insertImage(
  documentId: string,
  uri: string,
  index: number,
  width?: number,
  height?: number,
  tabId?: string
): Promise<void> {
  await batchUpdate(documentId, [createInsertInlineImageRequest(uri, index, width, height, tabId)]);
}

/**
 * List all inline images in a document
 */
export async function listImages(documentId: string, tabId?: string): Promise<Array<{
  objectId: string;
  startIndex: number;
  uri?: string;
  width?: number;
  height?: number;
}>> {
  const doc = await getDocument(documentId, { includeTabsContent: Boolean(tabId) });
  const images: Array<{
    objectId: string;
    startIndex: number;
    uri?: string;
    width?: number;
    height?: number;
  }> = [];

  const inlineObjects = getTabInlineObjects(doc, tabId);

  for (const [objectId, inlineObject] of Object.entries(inlineObjects)) {
    const props = inlineObject.inlineObjectProperties?.embeddedObject;
    images.push({
      objectId,
      startIndex: 0, // Would need to scan content for actual position
      uri: props?.imageProperties?.sourceUri ?? undefined,
      width: props?.size?.width?.magnitude ?? undefined,
      height: props?.size?.height?.magnitude ?? undefined,
    });
  }

  return images;
}

// ============== Structure Operations ==============

/**
 * Insert a page break
 */
export async function insertPageBreak(documentId: string, index: number, segmentId?: string, tabId?: string): Promise<void> {
  await batchUpdate(documentId, [createInsertPageBreakRequest(index, segmentId, tabId)]);
}

/**
 * Insert a section break
 */
export async function insertSectionBreak(documentId: string, index: number, type: SectionBreakType, tabId?: string): Promise<void> {
  await batchUpdate(documentId, [createInsertSectionBreakRequest(index, type, tabId)]);
}

/**
 * Create a header
 */
export async function createHeader(documentId: string, firstPageDifferent = false): Promise<string> {
  const type = firstPageDifferent ? 'FIRST' : 'DEFAULT';
  const response = await batchUpdate(documentId, [createHeaderRequest(type)]);
  return response.replies?.[0]?.createHeader?.headerId ?? '';
}

/**
 * Create a footer
 */
export async function createFooter(documentId: string): Promise<string> {
  const response = await batchUpdate(documentId, [createFooterRequest()]);
  return response.replies?.[0]?.createFooter?.footerId ?? '';
}

/**
 * Delete a header
 */
export async function deleteHeader(documentId: string, headerId: string): Promise<void> {
  await batchUpdate(documentId, [createDeleteHeaderRequest(headerId)]);
}

/**
 * Delete a footer
 */
export async function deleteFooter(documentId: string, footerId: string): Promise<void> {
  await batchUpdate(documentId, [createDeleteFooterRequest(footerId)]);
}

/**
 * Get document headers and footers
 */
export async function getHeadersAndFooters(documentId: string): Promise<{
  headers: Array<{ id: string; type: string }>;
  footers: Array<{ id: string; type: string }>;
}> {
  const doc = await getDocument(documentId);
  const headers: Array<{ id: string; type: string }> = [];
  const footers: Array<{ id: string; type: string }> = [];

  for (const [id, header] of Object.entries(doc.headers ?? {})) {
    headers.push({ id, type: 'header' });
  }

  for (const [id, footer] of Object.entries(doc.footers ?? {})) {
    footers.push({ id, type: 'footer' });
  }

  return { headers, footers };
}

// ============== Named Ranges ==============

/**
 * Create a named range
 */
export async function createNamedRange(
  documentId: string,
  name: string,
  startIndex: number,
  endIndex: number,
  segmentId?: string,
  tabId?: string
): Promise<string> {
  const response = await batchUpdate(documentId, [createCreateNamedRangeRequest(name, startIndex, endIndex, segmentId, tabId)]);
  return response.replies?.[0]?.createNamedRange?.namedRangeId ?? '';
}

/**
 * Delete a named range
 */
export async function deleteNamedRange(documentId: string, nameOrId: string): Promise<void> {
  // Try to find if it's a name or ID
  const doc = await getDocument(documentId);
  const namedRanges = doc.namedRanges ?? {};

  let namedRangeId: string | undefined;
  for (const [name, rangeInfo] of Object.entries(namedRanges)) {
    if (name === nameOrId) {
      namedRangeId = rangeInfo.namedRanges?.[0]?.namedRangeId ?? undefined;
      break;
    }
    if (rangeInfo.namedRanges?.some(r => r.namedRangeId === nameOrId)) {
      namedRangeId = nameOrId;
      break;
    }
  }

  if (namedRangeId) {
    await batchUpdate(documentId, [createDeleteNamedRangeRequest(namedRangeId)]);
  } else {
    // Try by name directly
    await batchUpdate(documentId, [createDeleteNamedRangeRequest(undefined, nameOrId)]);
  }
}

/**
 * List all named ranges
 */
export async function listNamedRanges(documentId: string): Promise<Array<{
  name: string;
  namedRangeId: string;
  ranges: Array<{ startIndex: number; endIndex: number }>;
}>> {
  const doc = await getDocument(documentId);
  const result: Array<{
    name: string;
    namedRangeId: string;
    ranges: Array<{ startIndex: number; endIndex: number }>;
  }> = [];

  for (const [name, rangeInfo] of Object.entries(doc.namedRanges ?? {})) {
    for (const namedRange of rangeInfo.namedRanges ?? []) {
      result.push({
        name,
        namedRangeId: namedRange.namedRangeId ?? '',
        ranges: (namedRange.ranges ?? []).map(r => ({
          startIndex: r.startIndex ?? 0,
          endIndex: r.endIndex ?? 0,
        })),
      });
    }
  }

  return result;
}

/**
 * Update named range content
 */
export async function updateNamedRangeContent(documentId: string, name: string, text: string): Promise<void> {
  await batchUpdate(documentId, [createReplaceNamedRangeContentRequest(name, text)]);
}

// ============== Helpers ==============

/**
 * Wrap API errors with user-friendly messages
 */
function wrapApiError(error: unknown, context: string): ApiError {
  if (error && typeof error === 'object' && 'code' in error) {
    const apiError = error as { code: number; message: string };
    return new ApiError(`${context}: ${apiError.message}`, apiError.code);
  }

  if (error instanceof Error) {
    return new ApiError(`${context}: ${error.message}`);
  }

  return new ApiError(`${context}: ${String(error)}`);
}

/**
 * Get document end index (for appending content)
 */
export async function getDocumentEndIndex(documentId: string, tabId?: string): Promise<number> {
  const doc = await getDocument(documentId, { includeTabsContent: Boolean(tabId) });
  const body = getTabContent(doc, tabId);
  if (body.length === 0) return 1;

  const lastElement = body[body.length - 1];
  return (lastElement.endIndex ?? 1) - 1;
}

/**
 * Export document to various formats using Google Drive API
 * Supported formats: markdown, txt, html, pdf, docx, odt, rtf, epub
 */
export type ExportFormat = 'markdown' | 'txt' | 'html' | 'pdf' | 'docx' | 'odt' | 'rtf' | 'epub';

const EXPORT_MIME_TYPES: Record<ExportFormat, string> = {
  markdown: 'text/markdown',
  txt: 'text/plain',
  html: 'text/html',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  epub: 'application/epub+zip',
};

export async function exportDocument(
  documentId: string,
  format: ExportFormat = 'markdown'
): Promise<Buffer> {
  const drive = await getDriveService();
  const mimeType = EXPORT_MIME_TYPES[format];

  if (!mimeType) {
    throw new ApiError(`Unsupported export format: ${format}`);
  }

  try {
    const response = await drive.files.export({
      fileId: documentId,
      mimeType,
    }, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data as ArrayBuffer);
  } catch (error: any) {
    if (error.code === 404) {
      throw new DocumentError(`Document not found: ${documentId}`);
    }
    throw new ApiError(`Failed to export document: ${error.message}`);
  }
}

export default {
  createDocument,
  getDocument,
  batchUpdate,
  insertText,
  deleteContent,
  replaceAllText,
  findText,
  findTextIndexes,
  readText,
  readTextWithFormatting,
  getTextStyleAtIndex,
  replaceTextWithStyle,
  updateTextStyle,
  updateTextStyleBatch,
  applyHeading,
  insertTable,
  listTables,
  readTable,
  readTableWithFormatting,
  getTableStructure,
  getTableCellRange,
  getTableRowRanges,
  getTableColumnRanges,
  getTableHeaderRow,
  findRowsByText,
  setCellContent,
  setCellContentBatch,
  insertTableRow,
  insertTableColumn,
  deleteTableRow,
  deleteTableColumn,
  updateTableCellStyle,
  updateTableCellStyleBatch,
  mergeTableCells,
  unmergeTableCells,
  updateParagraphAlignment,
  updateParagraphAlignmentBatch,
  insertImage,
  listImages,
  insertPageBreak,
  insertSectionBreak,
  createHeader,
  createFooter,
  deleteHeader,
  deleteFooter,
  getHeadersAndFooters,
  createNamedRange,
  deleteNamedRange,
  listNamedRanges,
  updateNamedRangeContent,
  listTabs,
  getDocumentEndIndex,
  exportDocument,
};
