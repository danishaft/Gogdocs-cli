/**
 * Table commands: create, list, read, insert-row, insert-col, delete-row, delete-col
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import client from '../../api/client.js';
import config from '../../utils/config.js';
import { parseDocumentId, parseIndex, parseColor, parseFontSize } from '../../utils/parser.js';
import type { TextStyleUpdate, TableCellStyleUpdate, TableCellBorder, FormattingDisplayMode, ParagraphAlignment, ContentAlignment, DashStyle } from '../../api/types.js';
import { output, format2DArray, format2DArrayWithFormatting, text } from '../output/index.js';
import type { OutputFormat } from '../../types/index.js';

/**
 * Resolve document ID from input or session
 */
function resolveDocId(input?: string): string {
  if (input) {
    return parseDocumentId(input);
  }
  const sessionDoc = config.getCurrentDocument();
  if (!sessionDoc) {
    throw new Error('No document specified. Use "google-docs-cli use <doc-id>" to set a default, or pass doc-id as argument.');
  }
  return sessionDoc;
}

export function createTableCommand(): Command {
  const tableCmd = new Command('table')
    .description('Table operations: create, list, read, modify')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Create a 3x4 table at position 1')}
  google-docs-cli table create DOC_ID 3 4 --at 1

  ${chalk.dim('# List all tables in the document')}
  google-docs-cli table list DOC_ID

  ${chalk.dim('# List tables in a specific tab')}
  google-docs-cli table list DOC_ID --tab TAB_ID

  ${chalk.dim('# Read table content')}
  google-docs-cli table read DOC_ID 0

  ${chalk.dim('# Insert a row after row 2')}
  google-docs-cli table insert-row DOC_ID 0 --after 2

  ${chalk.dim('# Insert a column after column 1')}
  google-docs-cli table insert-col DOC_ID 0 --after 1

  ${chalk.dim('# Delete row 3')}
  google-docs-cli table delete-row DOC_ID 0 3

  ${chalk.dim('# Delete column 2')}
  google-docs-cli table delete-col DOC_ID 0 2

  ${chalk.dim('# Format entire row (e.g., header row bold)')}
  google-docs-cli table format DOC_ID 0 --row 0 --bold
  google-docs-cli table format DOC_ID 0 --row 0 --background gray

  ${chalk.dim('# Format specific cell')}
  google-docs-cli table format DOC_ID 0 --cell 2,3 --bold --color red

  ${chalk.dim('# Format entire column')}
  google-docs-cli table format DOC_ID 0 --col 1 --italic

  ${chalk.dim('# Set cell by coordinates')}
  google-docs-cli table set-cell DOC_ID 0 --row 5 --col 2 "Done"

  ${chalk.dim('# Set cell using column name')}
  google-docs-cli table set-cell DOC_ID 0 --row 5 --col "Status" "Done"

  ${chalk.dim('# Set cell by searching for row')}
  google-docs-cli table set-cell DOC_ID 0 --where "Project Alpha" --col "Status" "Complete"

  ${chalk.dim('# Update all matching rows')}
  google-docs-cli table set-cell DOC_ID 0 --where "Pending" --col "Status" --all "Done"

  ${chalk.dim('# Set cell background color')}
  google-docs-cli table style DOC_ID 0 --row 0 --bg "#4a86c8"

  ${chalk.dim('# Set cell borders')}
  google-docs-cli table style DOC_ID 0 --cell 0,0 --border-color black --border-width 1

  ${chalk.dim('# Set vertical alignment in cells')}
  google-docs-cli table style DOC_ID 0 --row 0 --valign middle

  ${chalk.dim('# Merge cells (2 rows, 3 columns starting at row 0, col 0)')}
  google-docs-cli table merge DOC_ID 0 --row 0 --col 0 --rows 2 --cols 3

  ${chalk.dim('# Unmerge previously merged cells')}
  google-docs-cli table unmerge DOC_ID 0 --row 0 --col 0 --rows 2 --cols 3

  ${chalk.dim('# Center-align text in a row')}
  google-docs-cli table align DOC_ID 0 --row 0 --center

  ${chalk.dim('# Right-align text in a column')}
  google-docs-cli table align DOC_ID 0 --col 2 --end

${chalk.bold('Table Indexing:')}
  • Tables are 0-indexed (first table is 0)
  • Rows and columns are also 0-indexed
  • Use "google-docs-cli table list DOC_ID" to see table indexes and positions
`);

  // Create command
  tableCmd
    .command('create [doc-id] <rows> <cols>')
    .description('Create a new table')
    .option('--at <index>', 'Insert at this document index', '1')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, rows: string, cols: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const numRows = parseInt(rows, 10);
      const numCols = parseInt(cols, 10);
      const index = parseIndex(options.at, 1);
      const tabId = options.tab as string | undefined;

      if (numRows < 1 || numCols < 1) {
        throw new Error('Table must have at least 1 row and 1 column');
      }

      const spinner = ora('Creating table...').start();

      try {
        await client.insertTable(docId, numRows, numCols, index, tabId);
        spinner.succeed(`Created ${numRows}x${numCols} table at index ${index}`);

        if (format === 'json') {
          output({
            success: true,
            rows: numRows,
            columns: numCols,
            insertedAt: index,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to create table');
        throw error;
      }
    });

  // List command
  tableCmd
    .command('list [doc-id]')
    .description('List all tables in the document')
    .option('--tab <id>', 'List tables in a specific tab')
    .option('--all-tabs', 'List tables across all tabs')
    .action(async (docIdInput: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;

      if (tabId && options.allTabs) {
        throw new Error('Use either --tab or --all-tabs, not both.');
      }

      const spinner = ora('Fetching tables...').start();

      try {
        if (options.allTabs) {
          const tabs = await client.listTabs(docId);
          const contentTabs = tabs.filter(tab => tab.hasDocumentTab);
          const tabTables = [];

          for (const tab of contentTabs) {
            const tables = await client.listTables(docId, { tabId: tab.tabId });
            tabTables.push({ tabId: tab.tabId, title: tab.title, tables });
          }
          spinner.stop();

          const totalTables = tabTables.reduce((sum, entry) => sum + entry.tables.length, 0);

          if (format === 'json') {
            output({ tabs: tabTables, count: totalTables }, format);
            return;
          }

          if (contentTabs.length === 0) {
            console.log(text.info('No document tabs found in the document.'));
            return;
          }

          for (const entry of tabTables) {
            const label = entry.title ? `${entry.title} (${entry.tabId})` : entry.tabId;
            console.log(text.subheader(`Tab: ${label}`));

            if (entry.tables.length === 0) {
              console.log(text.info('No tables found in this tab.'));
              console.log();
              continue;
            }

            console.log(text.header(`Found ${entry.tables.length} table${entry.tables.length !== 1 ? 's' : ''}`));
            console.log();

            for (const table of entry.tables) {
              console.log(
                chalk.bold(`Table ${table.tableIndex}:`) +
                ` ${table.rows}x${table.columns}` +
                chalk.dim(` (index ${table.startIndex}-${table.endIndex})`)
              );
            }
            console.log();
          }
          return;
        }

        const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
        spinner.stop();

        if (tables.length === 0) {
          console.log(text.info('No tables found in the document.'));
          if (format === 'json') {
            output({ tables: [], count: 0, ...(tabId ? { tabId } : {}) }, format);
          }
          return;
        }

        if (format === 'json') {
          output({ tables, count: tables.length, ...(tabId ? { tabId } : {}) }, format);
          return;
        }

        console.log(text.header(`Found ${tables.length} table${tables.length !== 1 ? 's' : ''}`));
        console.log();

        for (const table of tables) {
          console.log(
            chalk.bold(`Table ${table.tableIndex}:`) +
            ` ${table.rows}x${table.columns}` +
            chalk.dim(` (index ${table.startIndex}-${table.endIndex})`)
          );
        }
      } catch (error) {
        spinner.fail('Failed to list tables');
        throw error;
      }
    });

  // Read command
  tableCmd
    .command('read [doc-id] <table-index>')
    .description('Read table content')
    .option('--show-formatting', 'Show explicit formatting markers (e.g., [B]bold[/B])')
    .option('--no-formatting', 'Show plain text without any formatting')
    .option('--tab <id>', 'Read table from a specific tab')
    .action(async (docIdInput: string, tableIndex: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const idx = parseInt(tableIndex, 10);
      const tabId = options.tab as string | undefined;

      // Determine formatting display mode
      let displayMode: FormattingDisplayMode = 'visual'; // default
      if (options.showFormatting) {
        displayMode = 'markers';
      } else if (options.formatting === false) {
        displayMode = 'none';
      }

      const spinner = ora('Reading table...').start();

      try {
        if (displayMode === 'none') {
          // Use existing plain text function for backward compatibility
          const tableData = await client.readTable(docId, idx, tabId ? { tabId } : undefined);
          spinner.stop();

          if (format === 'json') {
            output({
              tableIndex: idx,
              rows: tableData.length,
              columns: tableData[0]?.length ?? 0,
              data: tableData,
              ...(tabId ? { tabId } : {}),
            }, format);
            return;
          }

          console.log(text.header(`Table ${idx}`));
          console.log();
          console.log(format2DArray(tableData));
        } else {
          // Use formatted reading
          const tableData = await client.readTableWithFormatting(docId, idx, tabId ? { tabId } : undefined);
          spinner.stop();

          if (format === 'json') {
            output({
              tableIndex: idx,
              rows: tableData.plainRows.length,
              columns: tableData.plainRows[0]?.length ?? 0,
              data: tableData.plainRows,
              formattedData: tableData.rows,
              ...(tabId ? { tabId } : {}),
            }, format);
            return;
          }

          console.log(text.header(`Table ${idx}`));
          console.log();
          console.log(format2DArrayWithFormatting(tableData, displayMode));
        }
      } catch (error) {
        spinner.fail('Failed to read table');
        throw error;
      }
    });

  // Insert row command
  tableCmd
    .command('insert-row [doc-id] <table-index>')
    .description('Insert a new row into a table')
    .option('--after <row>', 'Insert after this row index', '0')
    .option('--before', 'Insert before the specified row instead of after')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, tableIndex: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;
      const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
      const idx = parseInt(tableIndex, 10);

      if (idx < 0 || idx >= tables.length) {
        throw new Error(`Table index ${idx} not found. Document has ${tables.length} table(s).`);
      }

      const table = tables[idx];
      const rowIndex = parseInt(options.after, 10);
      const insertBelow = !options.before;

      const spinner = ora('Inserting row...').start();

      try {
        await client.insertTableRow(docId, table.startIndex, rowIndex, insertBelow, tabId);
        spinner.succeed(`Inserted row ${insertBelow ? 'after' : 'before'} row ${rowIndex} in table ${idx}`);

        if (format === 'json') {
          output({
            success: true,
            tableIndex: idx,
            rowIndex,
            position: insertBelow ? 'after' : 'before',
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to insert row');
        throw error;
      }
    });

  // Insert column command
  tableCmd
    .command('insert-col [doc-id] <table-index>')
    .alias('insert-column')
    .description('Insert a new column into a table')
    .option('--after <col>', 'Insert after this column index', '0')
    .option('--before', 'Insert before the specified column instead of after')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, tableIndex: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;
      const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
      const idx = parseInt(tableIndex, 10);

      if (idx < 0 || idx >= tables.length) {
        throw new Error(`Table index ${idx} not found. Document has ${tables.length} table(s).`);
      }

      const table = tables[idx];
      const colIndex = parseInt(options.after, 10);
      const insertRight = !options.before;

      const spinner = ora('Inserting column...').start();

      try {
        await client.insertTableColumn(docId, table.startIndex, colIndex, insertRight, tabId);
        spinner.succeed(`Inserted column ${insertRight ? 'after' : 'before'} column ${colIndex} in table ${idx}`);

        if (format === 'json') {
          output({
            success: true,
            tableIndex: idx,
            columnIndex: colIndex,
            position: insertRight ? 'after' : 'before',
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to insert column');
        throw error;
      }
    });

  // Delete row command
  tableCmd
    .command('delete-row [doc-id] <table-index> <row-index>')
    .description('Delete a row from a table')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, tableIndex: string, rowIndex: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;
      const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
      const idx = parseInt(tableIndex, 10);
      const row = parseInt(rowIndex, 10);

      if (idx < 0 || idx >= tables.length) {
        throw new Error(`Table index ${idx} not found. Document has ${tables.length} table(s).`);
      }

      const table = tables[idx];

      const spinner = ora('Deleting row...').start();

      try {
        await client.deleteTableRow(docId, table.startIndex, row, tabId);
        spinner.succeed(`Deleted row ${row} from table ${idx}`);

        if (format === 'json') {
          output({
            success: true,
            tableIndex: idx,
            deletedRow: row,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to delete row');
        throw error;
      }
    });

  // Delete column command
  tableCmd
    .command('delete-col [doc-id] <table-index> <col-index>')
    .alias('delete-column')
    .description('Delete a column from a table')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, tableIndex: string, colIndex: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;
      const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
      const idx = parseInt(tableIndex, 10);
      const col = parseInt(colIndex, 10);

      if (idx < 0 || idx >= tables.length) {
        throw new Error(`Table index ${idx} not found. Document has ${tables.length} table(s).`);
      }

      const table = tables[idx];

      const spinner = ora('Deleting column...').start();

      try {
        await client.deleteTableColumn(docId, table.startIndex, col, tabId);
        spinner.succeed(`Deleted column ${col} from table ${idx}`);

        if (format === 'json') {
          output({
            success: true,
            tableIndex: idx,
            deletedColumn: col,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to delete column');
        throw error;
      }
    });

  // Format command
  tableCmd
    .command('format [doc-id] <table-index>')
    .alias('fmt')
    .description('Format table cells, rows, or columns')
    .option('--row <index>', 'Format entire row')
    .option('--col <index>', 'Format entire column')
    .option('--cell <row,col>', 'Format specific cell (e.g., "2,3")')
    .option('--bold', 'Apply bold formatting')
    .option('--italic', 'Apply italic formatting')
    .option('--underline', 'Apply underline formatting')
    .option('--color <color>', 'Text color (name, hex, or rgb)')
    .option('--background <color>', 'Background color')
    .option('--no-background', 'Remove background color (transparent)')
    .option('--font <name>', 'Font family')
    .option('--size <pt>', 'Font size in points')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, tableIndex: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const idx = parseInt(tableIndex, 10);
      const tabId = options.tab as string | undefined;

      // Validate selection
      if (!options.row && !options.col && !options.cell) {
        throw new Error('Must specify --row, --col, or --cell to format');
      }

      // Build style from options
      const style: TextStyleUpdate = {};
      if (options.bold) style.bold = true;
      if (options.italic) style.italic = true;
      if (options.underline) style.underline = true;
      if (options.color) {
        const rgbColor = parseColor(options.color);
        style.foregroundColor = { color: { rgbColor } };
      }
      if (options.background === false) {
        // --no-background: set empty OptionalColor to clear background
        style.backgroundColor = {};
      } else if (options.background) {
        const rgbColor = parseColor(options.background);
        style.backgroundColor = { color: { rgbColor } };
      }
      if (options.font) {
        style.weightedFontFamily = { fontFamily: options.font };
      }
      if (options.size) {
        const fontSize = parseFontSize(options.size);
        style.fontSize = { magnitude: fontSize, unit: 'PT' };
      }

      if (Object.keys(style).length === 0) {
        throw new Error('Must specify at least one formatting option (--bold, --italic, --color, etc.)');
      }

      // Get ranges based on selection
      let ranges: Array<{ start: number; end: number }> = [];
      let targetDescription = '';

      if (options.cell) {
        const match = options.cell.match(/^(\d+),(\d+)$/);
        if (!match) {
          throw new Error('Cell format must be "row,col" (e.g., "2,3")');
        }
        const row = parseInt(match[1], 10);
        const col = parseInt(match[2], 10);
        const range = await client.getTableCellRange(docId, idx, row, col, tabId);
        ranges = [range];
        targetDescription = `cell (${row}, ${col})`;
      } else if (options.row !== undefined) {
        const row = parseInt(options.row, 10);
        ranges = await client.getTableRowRanges(docId, idx, row, tabId);
        targetDescription = `row ${row}`;
      } else if (options.col !== undefined) {
        const col = parseInt(options.col, 10);
        ranges = await client.getTableColumnRanges(docId, idx, col, tabId);
        targetDescription = `column ${col}`;
      }

      const spinner = ora(`Formatting ${targetDescription} in table ${idx}...`).start();

      try {
        await client.updateTextStyleBatch(docId, ranges, style, undefined, tabId);
        const styleNames = Object.keys(style).join(', ');
        spinner.succeed(`Applied ${styleNames} to ${targetDescription} in table ${idx}`);

        if (format === 'json') {
          output({
            success: true,
            tableIndex: idx,
            target: targetDescription,
            styles: style,
            rangesFormatted: ranges.length,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to format table cells');
        throw error;
      }
    });

  // Set cell command
  tableCmd
    .command('set-cell [doc-id] <table-index> <content>')
    .description('Set the content of a table cell')
    .option('--row <index>', 'Row index (0-based)')
    .option('--col <index-or-name>', 'Column index (0-based) or column header name')
    .option('--where <text>', 'Find row(s) containing this text')
    .option('--match <n>', 'Select the Nth match (1-based) when using --where')
    .option('--all', 'Update all matching rows when using --where')
    .option('--preserve-formatting', 'Preserve existing cell formatting')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, tableIndex: string, content: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const idx = parseInt(tableIndex, 10);
      const tabId = options.tab as string | undefined;

      // Validate options
      if (!options.where && options.row === undefined) {
        throw new Error('Must specify --row or --where to identify target row(s)');
      }
      if (options.col === undefined) {
        throw new Error('Must specify --col to identify target column');
      }
      if (options.where && options.row !== undefined) {
        throw new Error('Cannot use both --row and --where');
      }
      if (options.match && options.all) {
        throw new Error('Cannot use both --match and --all');
      }
      if ((options.match || options.all) && !options.where) {
        throw new Error('--match and --all can only be used with --where');
      }

      // Resolve column (number or name)
      let colIndex: number;
      if (/^\d+$/.test(options.col)) {
        colIndex = parseInt(options.col, 10);
      } else {
        // Column name lookup
        const spinner = ora('Resolving column name...').start();
        try {
          const headerMap = await client.getTableHeaderRow(docId, idx, tabId);
          spinner.stop();

          const normalizedName = options.col.toLowerCase().trim();
          const resolvedCol = headerMap.get(normalizedName);
          if (resolvedCol === undefined) {
            const availableHeaders = Array.from(headerMap.keys()).map(h => `"${h}"`).join(', ');
            throw new Error(
              `Column "${options.col}" not found in table header row.\n` +
              `Available columns: ${availableHeaders || '(none)'}`
            );
          }
          colIndex = resolvedCol;
        } catch (error) {
          spinner.stop();
          throw error;
        }
      }

      // Determine target rows
      let targetRows: number[] = [];
      let matchInfo: Array<{ row: number; matchedCell: { col: number; text: string } }> = [];

      if (options.row !== undefined) {
        // Direct row specification
        targetRows = [parseInt(options.row, 10)];
      } else if (options.where) {
        // Search-based row targeting
        const spinner = ora('Searching for rows...').start();
        try {
          matchInfo = await client.findRowsByText(docId, idx, options.where, tabId);
          spinner.stop();
        } catch (error) {
          spinner.stop();
          throw error;
        }

        if (matchInfo.length === 0) {
          throw new Error(`No rows found containing "${options.where}"`);
        }

        if (matchInfo.length > 1 && !options.match && !options.all) {
          // Multiple matches without disambiguation
          console.log(chalk.yellow(`Found ${matchInfo.length} rows matching "${options.where}":`));
          matchInfo.forEach((m, i) => {
            console.log(chalk.dim(`  ${i + 1}. Row ${m.row}: "${m.matchedCell.text.trim()}"`));
          });
          console.log('');
          throw new Error(
            `Multiple matches found. Use --match N to select one, or --all to update all.`
          );
        }

        if (options.match) {
          const matchIndex = parseInt(options.match, 10) - 1; // Convert to 0-based
          if (matchIndex < 0 || matchIndex >= matchInfo.length) {
            throw new Error(
              `--match ${options.match} is out of range. Found ${matchInfo.length} match(es).`
            );
          }
          targetRows = [matchInfo[matchIndex].row];
        } else if (options.all) {
          targetRows = matchInfo.map(m => m.row);
        } else {
          // Single match
          targetRows = [matchInfo[0].row];
        }
      }

      // Perform the update
      const spinner = ora(
        targetRows.length > 1
          ? `Updating ${targetRows.length} cells...`
          : `Setting cell (row ${targetRows[0]}, col ${colIndex})...`
      ).start();

      try {
        const displayContent = content.length > 20 ? content.slice(0, 20) + '...' : content;

        if (targetRows.length === 1) {
          await client.setCellContent(
            docId, idx, targetRows[0], colIndex, content, options.preserveFormatting, tabId
          );
          spinner.succeed(`Set cell (row ${targetRows[0]}, col ${colIndex}) to "${displayContent}"`);
        } else {
          const cells = targetRows.map(row => ({ row, col: colIndex }));
          const count = await client.setCellContentBatch(
            docId, idx, cells, content, options.preserveFormatting, tabId
          );
          spinner.succeed(`Updated ${count} cell(s) to "${displayContent}"`);
        }

        if (format === 'json') {
          output({
            success: true,
            tableIndex: idx,
            updatedCells: targetRows.map(row => ({ row, col: colIndex })),
            content,
            preservedFormatting: options.preserveFormatting ?? false,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to set cell content');
        throw error;
      }
    });

  // Style command (cell background, borders, content alignment, padding)
  tableCmd
    .command('style [doc-id] <table-index>')
    .description('Style table cells: background color, borders, vertical alignment, padding')
    .option('--row <index>', 'Target entire row')
    .option('--col <index>', 'Target entire column')
    .option('--cell <row,col>', 'Target specific cell (e.g., "2,3")')
    .option('--bg <color>', 'Cell background color (name, hex, or rgb)')
    .option('--no-bg', 'Remove background color (transparent)')
    .option('--border-color <color>', 'Border color for all sides')
    .option('--border-width <pt>', 'Border width in points for all sides')
    .option('--border-style <style>', 'Border dash style: solid, dot, dash', 'solid')
    .option('--border-top <color>', 'Top border color')
    .option('--border-bottom <color>', 'Bottom border color')
    .option('--border-left <color>', 'Left border color')
    .option('--border-right <color>', 'Right border color')
    .option('--valign <alignment>', 'Vertical content alignment: top, middle, bottom')
    .option('--padding <pt>', 'Padding in points for all sides')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, tableIndex: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const idx = parseInt(tableIndex, 10);
      const tabId = options.tab as string | undefined;

      // Validate selection
      if (!options.row && !options.col && !options.cell) {
        throw new Error('Must specify --row, --col, or --cell to target');
      }

      // Build table cell style
      const style: TableCellStyleUpdate = {};

      if (options.bg === false) {
        style.backgroundColor = {};
      } else if (options.bg) {
        const rgbColor = parseColor(options.bg);
        style.backgroundColor = { color: { rgbColor } };
      }

      // Build border object helper
      const buildBorder = (color: string, width?: string, dashStyle?: string): TableCellBorder => {
        const border: TableCellBorder = {
          color: { color: { rgbColor: parseColor(color) } },
        };
        if (width) {
          border.width = { magnitude: parseFloat(width), unit: 'PT' };
        }
        if (dashStyle) {
          border.dashStyle = dashStyle.toUpperCase() as DashStyle;
        }
        return border;
      };

      if (options.borderColor) {
        const border = buildBorder(options.borderColor, options.borderWidth, options.borderStyle);
        style.borderTop = border;
        style.borderBottom = border;
        style.borderLeft = border;
        style.borderRight = border;
      }
      if (options.borderTop) {
        style.borderTop = buildBorder(options.borderTop, options.borderWidth, options.borderStyle);
      }
      if (options.borderBottom) {
        style.borderBottom = buildBorder(options.borderBottom, options.borderWidth, options.borderStyle);
      }
      if (options.borderLeft) {
        style.borderLeft = buildBorder(options.borderLeft, options.borderWidth, options.borderStyle);
      }
      if (options.borderRight) {
        style.borderRight = buildBorder(options.borderRight, options.borderWidth, options.borderStyle);
      }

      if (options.valign) {
        const valignMap: Record<string, ContentAlignment> = {
          top: 'TOP',
          middle: 'MIDDLE',
          bottom: 'BOTTOM',
        };
        const alignment = valignMap[options.valign.toLowerCase()];
        if (!alignment) {
          throw new Error('--valign must be one of: top, middle, bottom');
        }
        style.contentAlignment = alignment;
      }

      if (options.padding) {
        const mag = parseFloat(options.padding);
        const dim = { magnitude: mag, unit: 'PT' as const };
        style.paddingTop = dim;
        style.paddingBottom = dim;
        style.paddingLeft = dim;
        style.paddingRight = dim;
      }

      if (Object.keys(style).length === 0) {
        throw new Error('Must specify at least one style option (--bg, --border-color, --valign, --padding, etc.)');
      }

      // Look up table to get its startIndex
      const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
      if (idx < 0 || idx >= tables.length) {
        throw new Error(`Table index ${idx} not found. Document has ${tables.length} table(s).`);
      }
      const table = tables[idx];

      // Determine target cells
      let cells: Array<{ row: number; col: number }> = [];
      let targetDescription = '';

      if (options.cell) {
        const match = options.cell.match(/^(\d+),(\d+)$/);
        if (!match) {
          throw new Error('Cell format must be "row,col" (e.g., "2,3")');
        }
        cells = [{ row: parseInt(match[1], 10), col: parseInt(match[2], 10) }];
        targetDescription = `cell (${match[1]}, ${match[2]})`;
      } else if (options.row !== undefined) {
        const row = parseInt(options.row, 10);
        for (let c = 0; c < table.columns; c++) {
          cells.push({ row, col: c });
        }
        targetDescription = `row ${row}`;
      } else if (options.col !== undefined) {
        const col = parseInt(options.col, 10);
        for (let r = 0; r < table.rows; r++) {
          cells.push({ row: r, col });
        }
        targetDescription = `column ${col}`;
      }

      const spinner = ora(`Styling ${targetDescription} in table ${idx}...`).start();

      try {
        await client.updateTableCellStyleBatch(docId, table.startIndex, cells, style, tabId);
        const styleNames = Object.keys(style).join(', ');
        spinner.succeed(`Applied ${styleNames} to ${targetDescription} in table ${idx}`);

        if (format === 'json') {
          output({
            success: true,
            tableIndex: idx,
            target: targetDescription,
            styles: style,
            cellsStyled: cells.length,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to style table cells');
        throw error;
      }
    });

  // Merge command
  tableCmd
    .command('merge [doc-id] <table-index>')
    .description('Merge table cells')
    .requiredOption('--row <index>', 'Starting row index (0-based)')
    .requiredOption('--col <index>', 'Starting column index (0-based)')
    .option('--rows <count>', 'Number of rows to merge', '1')
    .option('--cols <count>', 'Number of columns to merge', '1')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, tableIndex: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const idx = parseInt(tableIndex, 10);
      const tabId = options.tab as string | undefined;
      const row = parseInt(options.row, 10);
      const col = parseInt(options.col, 10);
      const rowSpan = parseInt(options.rows, 10);
      const colSpan = parseInt(options.cols, 10);

      if (rowSpan < 1 || colSpan < 1) {
        throw new Error('Row span and column span must be at least 1');
      }
      if (rowSpan === 1 && colSpan === 1) {
        throw new Error('Must merge at least 2 cells (--rows or --cols must be > 1)');
      }

      const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
      if (idx < 0 || idx >= tables.length) {
        throw new Error(`Table index ${idx} not found. Document has ${tables.length} table(s).`);
      }
      const table = tables[idx];

      const spinner = ora(`Merging ${rowSpan}x${colSpan} cells starting at (${row}, ${col})...`).start();

      try {
        await client.mergeTableCells(docId, table.startIndex, row, col, rowSpan, colSpan, tabId);
        spinner.succeed(`Merged ${rowSpan}x${colSpan} cells starting at (${row}, ${col}) in table ${idx}`);

        if (format === 'json') {
          output({
            success: true,
            tableIndex: idx,
            startRow: row,
            startCol: col,
            rowSpan,
            colSpan,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to merge cells');
        throw error;
      }
    });

  // Unmerge command
  tableCmd
    .command('unmerge [doc-id] <table-index>')
    .description('Unmerge previously merged table cells')
    .requiredOption('--row <index>', 'Starting row index (0-based)')
    .requiredOption('--col <index>', 'Starting column index (0-based)')
    .option('--rows <count>', 'Number of rows in merged range', '1')
    .option('--cols <count>', 'Number of columns in merged range', '1')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, tableIndex: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const idx = parseInt(tableIndex, 10);
      const tabId = options.tab as string | undefined;
      const row = parseInt(options.row, 10);
      const col = parseInt(options.col, 10);
      const rowSpan = parseInt(options.rows, 10);
      const colSpan = parseInt(options.cols, 10);

      const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
      if (idx < 0 || idx >= tables.length) {
        throw new Error(`Table index ${idx} not found. Document has ${tables.length} table(s).`);
      }
      const table = tables[idx];

      const spinner = ora(`Unmerging cells at (${row}, ${col})...`).start();

      try {
        await client.unmergeTableCells(docId, table.startIndex, row, col, rowSpan, colSpan, tabId);
        spinner.succeed(`Unmerged cells at (${row}, ${col}) in table ${idx}`);

        if (format === 'json') {
          output({
            success: true,
            tableIndex: idx,
            startRow: row,
            startCol: col,
            rowSpan,
            colSpan,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to unmerge cells');
        throw error;
      }
    });

  // Align command (paragraph alignment within cells)
  tableCmd
    .command('align [doc-id] <table-index>')
    .description('Set text alignment within table cells')
    .option('--row <index>', 'Target entire row')
    .option('--col <index>', 'Target entire column')
    .option('--cell <row,col>', 'Target specific cell (e.g., "2,3")')
    .option('--start', 'Left-align text (LTR) / right-align (RTL)')
    .option('--center', 'Center-align text')
    .option('--end', 'Right-align text (LTR) / left-align (RTL)')
    .option('--justified', 'Justify text')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, tableIndex: string, options) => {
      const format = tableCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const idx = parseInt(tableIndex, 10);
      const tabId = options.tab as string | undefined;

      // Validate selection
      if (!options.row && !options.col && !options.cell) {
        throw new Error('Must specify --row, --col, or --cell to target');
      }

      // Determine alignment
      let alignment: ParagraphAlignment;
      const alignCount = [options.start, options.center, options.end, options.justified].filter(Boolean).length;
      if (alignCount === 0) {
        throw new Error('Must specify an alignment: --start, --center, --end, or --justified');
      }
      if (alignCount > 1) {
        throw new Error('Specify only one alignment option');
      }

      if (options.start) alignment = 'START';
      else if (options.center) alignment = 'CENTER';
      else if (options.end) alignment = 'END';
      else alignment = 'JUSTIFIED';

      // Get cell ranges (document index ranges for paragraph styling)
      let ranges: Array<{ start: number; end: number }> = [];
      let targetDescription = '';

      if (options.cell) {
        const match = options.cell.match(/^(\d+),(\d+)$/);
        if (!match) {
          throw new Error('Cell format must be "row,col" (e.g., "2,3")');
        }
        const row = parseInt(match[1], 10);
        const col = parseInt(match[2], 10);
        const range = await client.getTableCellRange(docId, idx, row, col, tabId);
        ranges = [range];
        targetDescription = `cell (${row}, ${col})`;
      } else if (options.row !== undefined) {
        const row = parseInt(options.row, 10);
        ranges = await client.getTableRowRanges(docId, idx, row, tabId);
        targetDescription = `row ${row}`;
      } else if (options.col !== undefined) {
        const col = parseInt(options.col, 10);
        ranges = await client.getTableColumnRanges(docId, idx, col, tabId);
        targetDescription = `column ${col}`;
      }

      const spinner = ora(`Aligning ${targetDescription} in table ${idx}...`).start();

      try {
        await client.updateParagraphAlignmentBatch(docId, ranges, alignment, undefined, tabId);
        spinner.succeed(`Applied ${alignment.toLowerCase()} alignment to ${targetDescription} in table ${idx}`);

        if (format === 'json') {
          output({
            success: true,
            tableIndex: idx,
            target: targetDescription,
            alignment,
            rangesAligned: ranges.length,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to align table cells');
        throw error;
      }
    });

  return tableCmd;
}

export default createTableCommand;
