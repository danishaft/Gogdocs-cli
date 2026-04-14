/**
 * Text commands: insert, replace, delete, find, read
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import client from '../../api/client.js';
import config from '../../utils/config.js';
import { parseDocumentId, parseIndex } from '../../utils/parser.js';
import { output, outputSuccess, text, renderFormattedText } from '../output/index.js';
import type { OutputFormat } from '../../types/index.js';
import type { FormattingDisplayMode, FormattedSpan } from '../../api/types.js';

/**
 * Format a 2D array as a simple text table
 */
function formatTableAsText(data: string[][]): string {
  if (data.length === 0) return '(empty table)';

  // Calculate column widths
  const colWidths: number[] = [];
  for (const row of data) {
    row.forEach((cell, i) => {
      const cellStr = cell.replace(/\n/g, ' ').trim();
      colWidths[i] = Math.max(colWidths[i] || 0, cellStr.length, 3);
    });
  }

  // Cap column widths at 40 chars
  const maxWidth = 40;
  const cappedWidths = colWidths.map(w => Math.min(w, maxWidth));

  // Build table
  const lines: string[] = [];
  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    const cells = row.map((cell, i) => {
      const cellStr = cell.replace(/\n/g, ' ').trim();
      return cellStr.slice(0, cappedWidths[i]).padEnd(cappedWidths[i]);
    });
    lines.push('| ' + cells.join(' | ') + ' |');

    // Add separator after header row
    if (rowIdx === 0) {
      const separator = cappedWidths.map(w => '-'.repeat(w)).join('-|-');
      lines.push('|-' + separator + '-|');
    }
  }

  return lines.join('\n');
}

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

export function createTextCommand(): Command {
  const textCmd = new Command('text')
    .description('Text operations: insert, replace, delete, find, read')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Insert text at the beginning')}
  google-docs-cli text insert DOC_ID "Hello World" --at 1

  ${chalk.dim('# Append text to end of document')}
  google-docs-cli text insert DOC_ID "New paragraph" --end

  ${chalk.dim('# Replace all occurrences of a word')}
  google-docs-cli text replace DOC_ID "old" "new"

  ${chalk.dim('# Replace while keeping bold/italic/etc formatting')}
  google-docs-cli text replace DOC_ID "old" "new" --preserve-formatting

  ${chalk.dim('# Delete text range')}
  google-docs-cli text delete DOC_ID --from 10 --to 20

  ${chalk.dim('# Find text and show positions')}
  google-docs-cli text find DOC_ID "search term"

  ${chalk.dim('# Read document content')}
  google-docs-cli text read DOC_ID

  ${chalk.dim('# Read a specific tab')}
  google-docs-cli text read DOC_ID --tab TAB_ID

${chalk.bold('Index System:')}
  Document indexes are 1-based positions:
  • Index 1 = start of document (after structural element)
  • Use --end flag to append to the document
  • Use "google-docs-cli concepts indexes" to learn more
`);

  // Insert command
  textCmd
    .command('insert [doc-id] <text>')
    .description('Insert text at a specific position')
    .option('--at <index>', 'Insert at this index (1-based)')
    .option('--end', 'Append to end of document')
    .option('-s, --segment <id>', 'Segment ID (header, footer, footnote)')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, insertText: string, options) => {
      const format = textCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;

      let index: number;
      if (options.end) {
        index = await client.getDocumentEndIndex(docId, tabId);
      } else if (options.at) {
        index = parseIndex(options.at, 1);
      } else {
        index = 1;
      }

      const spinner = ora('Inserting text...').start();

      try {
        await client.insertText(docId, insertText, index, options.segment, tabId);
        spinner.succeed(`Inserted ${insertText.length} characters at index ${index}`);

        if (format === 'json') {
          output({
            success: true,
            documentId: docId,
            insertedAt: index,
            length: insertText.length,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to insert text');
        throw error;
      }
    });

  // Replace command
  textCmd
    .command('replace [doc-id] <find> <replacement>')
    .description('Replace text in the document')
    .option('--all', 'Replace all occurrences (default: true)', true)
    .option('--case-sensitive', 'Match case exactly', true)
    .option('--no-case-sensitive', 'Case-insensitive matching')
    .option('--preserve-formatting', 'Preserve the formatting of the original text')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, find: string, replacement: string, options) => {
      const format = textCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;

      const spinner = ora('Replacing text...').start();

      try {
        let count: number;

        if (options.preserveFormatting) {
          spinner.text = 'Replacing text (preserving formatting)...';
          count = await client.replaceTextWithStyle(docId, find, replacement, options.caseSensitive, tabId);
        } else {
          count = await client.replaceAllText(docId, find, replacement, options.caseSensitive, tabId);
        }

        spinner.succeed(`Replaced ${count} occurrence${count !== 1 ? 's' : ''}${options.preserveFormatting ? ' (formatting preserved)' : ''}`);

        if (format === 'json') {
          output({
            success: true,
            documentId: docId,
            find,
            replacement,
            occurrencesReplaced: count,
            formattingPreserved: options.preserveFormatting ?? false,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to replace text');
        throw error;
      }
    });

  // Delete command
  textCmd
    .command('delete [doc-id]')
    .description('Delete text in a range')
    .requiredOption('--from <index>', 'Start index (inclusive)')
    .requiredOption('--to <index>', 'End index (exclusive)')
    .option('-s, --segment <id>', 'Segment ID (header, footer, footnote)')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, options) => {
      const format = textCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;

      const startIndex = parseIndex(options.from, 1);
      const endIndex = parseIndex(options.to, startIndex + 1);

      if (endIndex <= startIndex) {
        throw new Error('End index must be greater than start index');
      }

      const spinner = ora('Deleting text...').start();

      try {
        await client.deleteContent(docId, startIndex, endIndex, options.segment, tabId);
        spinner.succeed(`Deleted ${endIndex - startIndex} characters (${startIndex}-${endIndex})`);

        if (format === 'json') {
          output({
            success: true,
            documentId: docId,
            deletedRange: { startIndex, endIndex },
            deletedLength: endIndex - startIndex,
            ...(tabId ? { tabId } : {}),
          }, format);
        }
      } catch (error) {
        spinner.fail('Failed to delete text');
        throw error;
      }
    });

  // Find command
  textCmd
    .command('find [doc-id] <pattern>')
    .description('Find text and show positions')
    .option('-c, --context <chars>', 'Show N characters of context', '20')
    .option('--tab <id>', 'Search within a specific tab')
    .option('--all-tabs', 'Search across all tabs')
    .action(async (docIdInput: string, pattern: string, options) => {
      const format = textCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const contextLength = parseInt(options.context, 10);
      const tabId = options.tab as string | undefined;

      if (tabId && options.allTabs) {
        throw new Error('Use either --tab or --all-tabs, not both.');
      }

      const spinner = ora('Searching...').start();

      try {
        if (options.allTabs) {
          const tabs = await client.listTabs(docId);
          const contentTabs = tabs.filter(tab => tab.hasDocumentTab);
          const tabMatches: Array<{ tabId: string; title?: string; matches: Awaited<ReturnType<typeof client.findText>> }> = [];

          for (const tab of contentTabs) {
            const matches = await client.findText(docId, pattern, { tabId: tab.tabId });
            tabMatches.push({ tabId: tab.tabId, title: tab.title ?? undefined, matches });
          }

          const totalMatches = tabMatches.reduce((sum, entry) => sum + entry.matches.length, 0);
          spinner.stop();

          if (contentTabs.length === 0) {
            console.log(text.info('No document tabs found in the document.'));
            return;
          }

          if (totalMatches === 0) {
            console.log(text.warning(`No matches found for "${pattern}"`));
            if (format === 'json') {
              output({ matches: [], count: 0 }, format);
            }
            return;
          }

          if (format === 'json') {
            output({
              matches: tabMatches.map(entry => ({
                tabId: entry.tabId,
                title: entry.title,
                matches: entry.matches,
              })),
              count: totalMatches,
            }, format);
            return;
          }

          console.log(text.success(`Found ${totalMatches} match${totalMatches !== 1 ? 'es' : ''}`));
          console.log();

          for (const entry of tabMatches) {
            if (entry.matches.length === 0) continue;
            const label = entry.title ? `${entry.title} (${entry.tabId})` : entry.tabId;
            console.log(text.subheader(`Tab: ${label}`));
            const fullText = await client.readText(docId, undefined, undefined, { tabId: entry.tabId });

            for (let i = 0; i < entry.matches.length; i++) {
              const match = entry.matches[i];
              const contextStart = Math.max(0, match.startIndex - 1 - contextLength);
              const contextEnd = Math.min(fullText.length, match.endIndex - 1 + contextLength);

              const before = fullText.slice(contextStart, match.startIndex - 1);
              const matched = fullText.slice(match.startIndex - 1, match.endIndex - 1);
              const after = fullText.slice(match.endIndex - 1, contextEnd);

              console.log(
                chalk.dim(`[${i + 1}] `) +
                chalk.dim('...') +
                before.replace(/\n/g, '↵') +
                chalk.bgYellow.black(matched) +
                after.replace(/\n/g, '↵') +
                chalk.dim('...')
              );

              let locationInfo = `Index: ${match.startIndex}-${match.endIndex}`;
              if (match.context?.inTable) {
                locationInfo += chalk.cyan(` (Table ${match.context.tableIndex}, Row ${match.context.row}, Col ${match.context.col})`);
              }
              console.log(chalk.dim(`    ${locationInfo}`));
              console.log();
            }
          }
          return;
        }

        const results = await client.findText(docId, pattern, tabId ? { tabId } : undefined);
        spinner.stop();

        if (results.length === 0) {
          console.log(text.warning(`No matches found for "${pattern}"`));
          if (format === 'json') {
            output({ matches: [], count: 0 }, format);
          }
          return;
        }

        if (format === 'json') {
          output({
            matches: results,
            count: results.length,
            ...(tabId ? { tabId } : {}),
          }, format);
          return;
        }

        console.log(text.success(`Found ${results.length} match${results.length !== 1 ? 'es' : ''}`));
        console.log();

        // Get full text for context
        const fullText = await client.readText(docId, undefined, undefined, tabId ? { tabId } : undefined);

        for (let i = 0; i < results.length; i++) {
          const match = results[i];
          const contextStart = Math.max(0, match.startIndex - 1 - contextLength);
          const contextEnd = Math.min(fullText.length, match.endIndex - 1 + contextLength);

          const before = fullText.slice(contextStart, match.startIndex - 1);
          const matched = fullText.slice(match.startIndex - 1, match.endIndex - 1);
          const after = fullText.slice(match.endIndex - 1, contextEnd);

          console.log(
            chalk.dim(`[${i + 1}] `) +
            chalk.dim('...') +
            before.replace(/\n/g, '↵') +
            chalk.bgYellow.black(matched) +
            after.replace(/\n/g, '↵') +
            chalk.dim('...')
          );

          // Show location info
          let locationInfo = `Index: ${match.startIndex}-${match.endIndex}`;
          if (match.context?.inTable) {
            locationInfo += chalk.cyan(` (Table ${match.context.tableIndex}, Row ${match.context.row}, Col ${match.context.col})`);
          }
          console.log(chalk.dim(`    ${locationInfo}`));
          console.log();
        }
      } catch (error) {
        spinner.fail('Search failed');
        throw error;
      }
    });

  // Read command
  textCmd
    .command('read [doc-id]')
    .description('Read document text content')
    .option('--from <index>', 'Start reading from this index')
    .option('--to <index>', 'Stop reading at this index')
    .option('-n, --line-numbers', 'Show line numbers')
    .option('--show-formatting', 'Show explicit formatting markers (e.g., [B]bold[/B])')
    .option('--no-formatting', 'Show plain text without any formatting')
    .option('--include-tables', 'Include table content in output')
    .option('--tab <id>', 'Read content from a specific tab')
    .option('--all-tabs', 'Read content from all tabs')
    .action(async (docIdInput: string, options) => {
      const format = textCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;

      if (tabId && options.allTabs) {
        throw new Error('Use either --tab or --all-tabs, not both.');
      }

      // Determine formatting display mode
      let displayMode: FormattingDisplayMode = 'visual'; // default
      if (options.showFormatting) {
        displayMode = 'markers';
      } else if (options.formatting === false) {
        displayMode = 'none';
      }

      const spinner = ora('Reading document...').start();

      try {
        const startIndex = options.from ? parseIndex(options.from, 1) : undefined;
        const endIndex = options.to ? parseIndex(options.to, undefined as any) : undefined;

        if (options.allTabs) {
          const tabs = await client.listTabs(docId);
          const contentTabs = tabs.filter(tab => tab.hasDocumentTab);
          const tabOutputs: Array<{ tabId: string; title?: string; content: string; spans?: FormattedSpan[] }> = [];

          for (const tab of contentTabs) {
            if (displayMode === 'none') {
              const content = await client.readText(docId, startIndex, endIndex, { tabId: tab.tabId });
              tabOutputs.push({ tabId: tab.tabId, title: tab.title, content });
            } else {
              const formattedContent = await client.readTextWithFormatting(docId, startIndex, endIndex, { tabId: tab.tabId });
              tabOutputs.push({
                tabId: tab.tabId,
                title: tab.title,
                content: formattedContent.plainText,
                spans: formattedContent.spans,
              });
            }
          }

          spinner.stop();

          if (format === 'json') {
            output({
              documentId: docId,
              tabs: tabOutputs,
            }, format);
            return;
          }

          if (contentTabs.length === 0) {
            console.log(text.info('No document tabs found in the document.'));
            return;
          }

          for (const tab of tabOutputs) {
            const label = tab.title ? `${tab.title} (${tab.tabId})` : tab.tabId;
            console.log(text.subheader(`Tab: ${label}`));

            const rendered = displayMode === 'none'
              ? tab.content
              : renderFormattedText({ spans: tab.spans ?? [], plainText: tab.content }, displayMode);

            if (options.lineNumbers) {
              const lines = rendered.split('\n');
              const width = String(lines.length).length;
              lines.forEach((line, i) => {
                console.log(chalk.dim(`${String(i + 1).padStart(width)} │ `) + line);
              });
            } else {
              console.log(rendered);
            }

            if (options.includeTables) {
              const tables = await client.listTables(docId, { tabId: tab.tabId });
              for (let i = 0; i < tables.length; i++) {
                const tableData = await client.readTable(docId, i, { tabId: tab.tabId });
                console.log();
                console.log(text.subheader(`Table ${i} (${tables[i].rows}×${tables[i].columns}):`));
                console.log(formatTableAsText(tableData));
              }
            }

            console.log();
          }

          return;
        }

        if (displayMode === 'none') {
          const content = await client.readText(docId, startIndex, endIndex, tabId ? { tabId } : undefined);
          spinner.stop();

          if (content.trim().length < 100 && format !== 'json') {
            const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
            if (tables.length > 0) {
              console.log(text.info(`Body text is minimal but document has ${tables.length} table(s). Use 'google-docs-cli table list' to see them.`));
              console.log();
            }
          }

          if (format === 'json') {
            output({
              documentId: docId,
              content,
              length: content.length,
              ...(tabId ? { tabId } : {}),
            }, format);
            return;
          }

          if (options.lineNumbers) {
            const lines = content.split('\n');
            const width = String(lines.length).length;
            lines.forEach((line, i) => {
              console.log(chalk.dim(`${String(i + 1).padStart(width)} │ `) + line);
            });
          } else {
            console.log(content);
          }

          if (options.includeTables) {
            const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
            for (let i = 0; i < tables.length; i++) {
              const tableData = await client.readTable(docId, i, tabId ? { tabId } : undefined);
              console.log();
              console.log(text.subheader(`Table ${i} (${tables[i].rows}×${tables[i].columns}):`));
              console.log(formatTableAsText(tableData));
            }
          }
        } else {
          const formattedContent = await client.readTextWithFormatting(docId, startIndex, endIndex, tabId ? { tabId } : undefined);
          spinner.stop();

          if (formattedContent.plainText.trim().length < 100 && format !== 'json') {
            const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
            if (tables.length > 0) {
              console.log(text.info(`Body text is minimal but document has ${tables.length} table(s). Use 'google-docs-cli table list' to see them.`));
              console.log();
            }
          }

          if (format === 'json') {
            output({
              documentId: docId,
              content: formattedContent.plainText,
              spans: formattedContent.spans,
              length: formattedContent.plainText.length,
              ...(tabId ? { tabId } : {}),
            }, format);
            return;
          }

          const renderedContent = renderFormattedText(formattedContent, displayMode);

          if (options.lineNumbers) {
            const lines = renderedContent.split('\n');
            const width = String(lines.length).length;
            lines.forEach((line, i) => {
              console.log(chalk.dim(`${String(i + 1).padStart(width)} │ `) + line);
            });
          } else {
            console.log(renderedContent);
          }

          if (options.includeTables) {
            const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
            for (let i = 0; i < tables.length; i++) {
              const tableData = await client.readTable(docId, i, tabId ? { tabId } : undefined);
              console.log();
              console.log(text.subheader(`Table ${i} (${tables[i].rows}×${tables[i].columns}):`));
              console.log(formatTableAsText(tableData));
            }
          }
        }
      } catch (error) {
        spinner.fail('Failed to read document');
        throw error;
      }
    });

  return textCmd;
}

export default createTextCommand;
