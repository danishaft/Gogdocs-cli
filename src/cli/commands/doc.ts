/**
 * Document commands: create, get, info, open, export
 */

import { Command } from 'commander';
import { writeFileSync } from 'fs';
import ora from 'ora';
import chalk from 'chalk';
import openUrl from 'open';
import client, { ExportFormat } from '../../api/client.js';
import config from '../../utils/config.js';
import { parseDocumentId, buildDocUrl, formatDocId } from '../../utils/parser.js';
import { output, outputSuccess, text } from '../output/index.js';
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

export function createDocCommand(): Command {
  const docCmd = new Command('doc')
    .alias('document')
    .description('Document operations: create, get, info, open, export, tabs')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Create a new document')}
  google-docs-cli doc create "My New Document"

  ${chalk.dim('# Get document content')}
  google-docs-cli doc get 1abc123xyz

  ${chalk.dim('# Get document from URL')}
  google-docs-cli doc get "https://docs.google.com/document/d/1abc123xyz/edit"

  ${chalk.dim('# Show document info')}
  google-docs-cli doc info 1abc123xyz

  ${chalk.dim('# Open document in browser')}
  google-docs-cli doc open 1abc123xyz

  ${chalk.dim('# Export document as PDF')}
  google-docs-cli doc export 1abc123xyz --format pdf --output report.pdf

  ${chalk.dim('# List document tabs')}
  google-docs-cli doc tabs 1abc123xyz

  ${chalk.dim('# Read a specific tab')}
  google-docs-cli doc get 1abc123xyz --tab TAB_ID

${chalk.bold('Document ID Formats:')}
  The document ID can be specified as:
  • Full URL: https://docs.google.com/document/d/1abc.../edit
  • Short URL: docs.google.com/document/d/1abc...
  • Raw ID: 1abc123xyz...
`);

  // Create command
  docCmd
    .command('create <title>')
    .description('Create a new blank document')
    .option('-o, --open', 'Open the document in browser after creation')
    .action(async (title: string, options) => {
      const format = docCmd.parent?.opts().format as OutputFormat ?? 'text';
      const spinner = ora('Creating document...').start();

      try {
        const doc = await client.createDocument(title);
        spinner.succeed('Document created!');

        const docId = doc.documentId!;
        const url = buildDocUrl(docId);

        if (format === 'json') {
          output({
            documentId: docId,
            title: doc.title,
            url,
          }, format);
        } else {
          console.log();
          console.log(text.docLink(doc.title!, docId));
        }

        if (options.open) {
          await openUrl(url);
        }
      } catch (error) {
        spinner.fail('Failed to create document');
        throw error;
      }
    });

  // Get command
  docCmd
    .command('get [doc-id]')
    .description('Get document content')
    .option('--metadata', 'Include full metadata')
    .option('--raw', 'Output raw API response')
    .option('--include-tabs', 'Include tab metadata and content in API response')
    .option('--tab <id>', 'Read content from a specific tab')
    .option('--all-tabs', 'Read content from all tabs')
    .action(async (docIdInput: string, options) => {
      const format = docCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;

      if (tabId && options.allTabs) {
        throw new Error('Use either --tab or --all-tabs, not both.');
      }

      const includeTabsContent = Boolean(options.includeTabs || tabId || options.allTabs);
      const spinner = ora('Fetching document...').start();

      try {
        const doc = await client.getDocument(docId, { includeTabsContent });
        spinner.stop();

        if (options.raw) {
          output(doc, 'json');
          return;
        }

        if (format === 'json') {
          if (options.allTabs) {
            const tabs = await client.listTabs(docId);
            const contentTabs = tabs.filter(tab => tab.hasDocumentTab);
            const tabContents = [];
            for (const tab of contentTabs) {
              const content = await client.readText(docId, undefined, undefined, { tabId: tab.tabId });
              tabContents.push({
                tabId: tab.tabId,
                title: tab.title,
                content,
              });
            }
            output({
              documentId: doc.documentId,
              title: doc.title,
              revisionId: doc.revisionId,
              tabs: tabContents,
            }, format);
            return;
          }

          const content = await client.readText(docId, undefined, undefined, tabId ? { tabId } : undefined);
          output({
            documentId: doc.documentId,
            title: doc.title,
            revisionId: doc.revisionId,
            ...(tabId ? { tabId } : {}),
            content,
          }, format);
          return;
        }

        console.log(text.header(doc.title ?? 'Untitled'));
        console.log(text.dim(`Document ID: ${formatDocId(docId)}`));
        console.log();

        if (options.allTabs) {
          const tabs = await client.listTabs(docId);
          const contentTabs = tabs.filter(tab => tab.hasDocumentTab);
          if (contentTabs.length === 0) {
            console.log(text.info('No document tabs found in the document.'));
            return;
          }
          for (const tab of contentTabs) {
            const label = tab.title ? `${tab.title} (${tab.tabId})` : tab.tabId;
            console.log(text.subheader(`Tab: ${label}`));
            const content = await client.readText(docId, undefined, undefined, { tabId: tab.tabId });
            console.log(content);
            console.log();
          }
        } else {
          const content = await client.readText(docId, undefined, undefined, tabId ? { tabId } : undefined);
          if (tabId) {
            const tabs = await client.listTabs(docId);
            const tab = tabs.find(t => t.tabId === tabId);
            const label = tab?.title ? `${tab.title} (${tabId})` : tabId;
            console.log(text.subheader(`Tab: ${label}`));
          }
          console.log(content);
        }

        if (options.metadata) {
          console.log();
          console.log(text.subheader('Metadata:'));
          console.log(text.labelValue('Revision ID', doc.revisionId));

          if (options.allTabs) {
            const tabs = await client.listTabs(docId);
            const contentTabs = tabs.filter(tab => tab.hasDocumentTab);
            for (const tab of contentTabs) {
              const tables = await client.listTables(docId, { tabId: tab.tabId });
              const images = await client.listImages(docId, tab.tabId);
              const label = tab.title ? `${tab.title} (${tab.tabId})` : tab.tabId;
              console.log(text.labelValue(`Tables (${label})`, tables.length));
              console.log(text.labelValue(`Images (${label})`, images.length));
            }
          } else {
            const tables = await client.listTables(docId, tabId ? { tabId } : undefined);
            console.log(text.labelValue('Tables', tables.length));

            const images = await client.listImages(docId, tabId);
            console.log(text.labelValue('Images', images.length));
          }

          const ranges = await client.listNamedRanges(docId);
          console.log(text.labelValue('Named Ranges', ranges.length));
        }
      } catch (error) {
        spinner.fail('Failed to get document');
        throw error;
      }
    });

  // Info command
  docCmd
    .command('info [doc-id]')
    .description('Show document metadata and statistics')
    .option('--tabs', 'Include tab list')
    .action(async (docIdInput: string, options) => {
      const format = docCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const spinner = ora('Fetching document info...').start();

      try {
        const doc = await client.getDocument(docId);
        const content = await client.readText(docId);
        const tables = await client.listTables(docId);
        const images = await client.listImages(docId);
        const namedRanges = await client.listNamedRanges(docId);
        const headersFooters = await client.getHeadersAndFooters(docId);
        const tabs = options.tabs ? await client.listTabs(docId) : [];
        spinner.stop();

        const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
        const charCount = content.length;

        const info = {
          documentId: doc.documentId,
          title: doc.title,
          revisionId: doc.revisionId,
          url: buildDocUrl(docId),
          statistics: {
            characters: charCount,
            words: wordCount,
            tables: tables.length,
            tableDetails: tables.map((t, i) => ({ index: i, rows: t.rows, columns: t.columns })),
            images: images.length,
            namedRanges: namedRanges.length,
            headers: headersFooters.headers.length,
            footers: headersFooters.footers.length,
            ...(options.tabs ? { tabs: tabs.length } : {}),
          },
          ...(options.tabs ? { tabs } : {}),
          hints: charCount < 100 && tables.length > 0
            ? ['Most content appears to be in tables. Use table read commands.']
            : [],
        };

        if (format === 'json') {
          output(info, format);
          return;
        }

        console.log(text.header('Document Information'));
        console.log();
        console.log(text.labelValue('Title', doc.title));
        console.log(text.labelValue('Document ID', doc.documentId));
        console.log(text.labelValue('Revision ID', doc.revisionId));
        console.log(text.labelValue('URL', chalk.cyan(buildDocUrl(docId))));
        console.log();
        console.log(text.subheader('Statistics:'));
        console.log(text.labelValue('Characters', charCount.toLocaleString()));
        console.log(text.labelValue('Words', wordCount.toLocaleString()));

        // Show table count with dimensions
        if (tables.length === 0) {
          console.log(text.labelValue('Tables', 0));
        } else {
          const tableSummary = tables.map((t, i) => `${t.rows}×${t.columns}`).join(', ');
          console.log(text.labelValue('Tables', `${tables.length} (${tableSummary})`));
        }

        console.log(text.labelValue('Images', images.length));
        console.log(text.labelValue('Named Ranges', namedRanges.length));
        console.log(text.labelValue('Headers', headersFooters.headers.length));
        console.log(text.labelValue('Footers', headersFooters.footers.length));
        if (options.tabs) {
          console.log(text.labelValue('Tabs', tabs.length));
          if (tabs.length > 0) {
            console.log();
            console.log(text.subheader('Tabs:'));
            for (const tab of tabs) {
              const indent = '  '.repeat(tab.nestingLevel ?? 0);
              const label = tab.title ? `${tab.title} (${tab.tabId})` : tab.tabId;
              console.log(`${indent}${label}`);
            }
          }
        }

        // Add helpful hint when content is primarily in tables
        if (charCount < 100 && tables.length > 0) {
          console.log();
          console.log(text.info(`Most content appears to be in tables. Use 'google-docs-cli table read ${formatDocId(docId)} 0' to view.`));
        }
      } catch (error) {
        spinner.fail('Failed to get document info');
        throw error;
      }
    });

  // Tabs command
  docCmd
    .command('tabs [doc-id]')
    .description('List document tabs')
    .action(async (docIdInput: string) => {
      const format = docCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const spinner = ora('Fetching tabs...').start();

      try {
        const tabs = await client.listTabs(docId);
        spinner.stop();

        if (format === 'json') {
          output({
            documentId: docId,
            count: tabs.length,
            tabs,
          }, format);
          return;
        }

        if (tabs.length === 0) {
          console.log(text.info('No tabs found in the document.'));
          return;
        }

        console.log(text.header('Document Tabs'));
        console.log(text.labelValue('Count', tabs.length));
        console.log();
        for (const tab of tabs) {
          const indent = '  '.repeat(tab.nestingLevel ?? 0);
          const label = tab.title ? `${tab.title} (${tab.tabId})` : tab.tabId;
          console.log(`${indent}${label}`);
        }
      } catch (error) {
        spinner.fail('Failed to list tabs');
        throw error;
      }
    });

  // Open command
  docCmd
    .command('open [doc-id]')
    .description('Open document in default browser')
    .action(async (docIdInput: string) => {
      const format = docCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const url = buildDocUrl(docId);

      await openUrl(url);
      outputSuccess(`Opened document in browser`, { url }, format);
    });

  // Export command
  docCmd
    .command('export [doc-id]')
    .description('Export document to various formats')
    .option('-f, --format <format>', 'Export format: markdown, txt, html, pdf, docx, odt, rtf, epub', 'markdown')
    .option('-o, --output <file>', 'Output file path (default: stdout for text formats)')
    .action(async (docIdInput: string, options) => {
      const outputFormat = docCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const exportFormat = options.format as ExportFormat;

      const validFormats: ExportFormat[] = ['markdown', 'txt', 'html', 'pdf', 'docx', 'odt', 'rtf', 'epub'];
      if (!validFormats.includes(exportFormat)) {
        throw new Error(`Invalid format: ${exportFormat}. Valid formats: ${validFormats.join(', ')}`);
      }

      const spinner = ora(`Exporting as ${exportFormat}...`).start();

      try {
        const content = await client.exportDocument(docId, exportFormat);
        spinner.stop();

        // Binary formats must be written to file
        const binaryFormats = ['pdf', 'docx', 'odt', 'rtf', 'epub'];
        const isBinary = binaryFormats.includes(exportFormat);

        if (options.output) {
          writeFileSync(options.output, content);
          outputSuccess(`Exported to ${options.output}`, { format: exportFormat, file: options.output }, outputFormat);
        } else if (isBinary) {
          // Binary format requires output file
          const ext = exportFormat === 'docx' ? 'docx' : exportFormat;
          console.error(text.error(`Binary format '${exportFormat}' requires --output <file>.${ext}`));
          process.exit(1);
        } else {
          // Text format - output to stdout
          if (outputFormat === 'json') {
            output({
              documentId: docId,
              format: exportFormat,
              content: content.toString('utf-8'),
            }, outputFormat);
          } else {
            console.log(content.toString('utf-8'));
          }
        }
      } catch (error) {
        spinner.fail('Failed to export document');
        throw error;
      }
    });

  // List command (requires Drive API, basic implementation)
  docCmd
    .command('list')
    .description('List recent documents (requires Drive API scope)')
    .action(async () => {
      const format = docCmd.parent?.opts().format as OutputFormat ?? 'text';

      console.log(text.warning('List command requires Google Drive API integration.'));
      console.log('This feature will be available in a future update.');
      console.log();
      console.log(`For now, you can find your documents at:`);
      console.log(chalk.cyan('https://docs.google.com/'));
    });

  return docCmd;
}

export default createDocCommand;
