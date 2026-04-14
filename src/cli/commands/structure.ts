/**
 * Structure commands: header, footer, page-break, section-break
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import client from '../../api/client.js';
import config from '../../utils/config.js';
import { parseDocumentId, parseIndex } from '../../utils/parser.js';
import { output, text } from '../output/index.js';
import type { OutputFormat } from '../../types/index.js';
import type { SectionBreakType } from '../../api/types.js';

function resolveDocId(input?: string): string {
  if (input) return parseDocumentId(input);
  const sessionDoc = config.getCurrentDocument();
  if (!sessionDoc) throw new Error('No document specified. Use "google-docs-cli use <doc-id>" to set a default.');
  return sessionDoc;
}

export function createStructureCommand(): Command {
  const structureCmd = new Command('structure')
    .alias('struct')
    .description('Document structure: headers, footers, page breaks, sections')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Create a header')}
  google-docs-cli structure header create DOC_ID

  ${chalk.dim('# Create a footer')}
  google-docs-cli structure footer create DOC_ID

  ${chalk.dim('# Create header with different first page')}
  google-docs-cli structure header create DOC_ID --first-page-different

  ${chalk.dim('# Insert a page break')}
  google-docs-cli structure page-break DOC_ID --at 50

  ${chalk.dim('# Insert a section break (continuous)')}
  google-docs-cli structure section-break DOC_ID continuous --at 100

  ${chalk.dim('# Insert a section break (next page)')}
  google-docs-cli structure section-break DOC_ID next-page --at 100

  ${chalk.dim('# List headers and footers')}
  google-docs-cli structure list DOC_ID

${chalk.bold('Section Break Types:')}
  • continuous: Section break on the same page
  • next-page: Section break that starts on a new page
`);

  // Header subcommand group
  const headerCmd = structureCmd
    .command('header')
    .description('Header operations');

  headerCmd
    .command('create [doc-id]')
    .description('Create a document header')
    .option('--first-page-different', 'Use different header for first page')
    .action(async (docIdInput: string, options) => {
      const format = structureCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);

      const spinner = ora('Creating header...').start();

      try {
        const headerId = await client.createHeader(docId, options.firstPageDifferent);
        spinner.succeed('Header created');

        if (format === 'json') {
          output({
            success: true,
            headerId,
            firstPageDifferent: !!options.firstPageDifferent,
          }, format);
        } else {
          console.log(text.labelValue('Header ID', headerId));
          console.log();
          console.log(chalk.dim('Add content to the header using:'));
          console.log(chalk.cyan(`  google-docs-cli text insert ${docId} "Header text" --segment ${headerId}`));
        }
      } catch (error) {
        spinner.fail('Failed to create header');
        throw error;
      }
    });

  headerCmd
    .command('delete [doc-id] <header-id>')
    .description('Delete a header')
    .action(async (docIdInput: string, headerId: string) => {
      const format = structureCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);

      const spinner = ora('Deleting header...').start();

      try {
        await client.deleteHeader(docId, headerId);
        spinner.succeed('Header deleted');

        if (format === 'json') {
          output({ success: true, deletedHeaderId: headerId }, format);
        }
      } catch (error) {
        spinner.fail('Failed to delete header');
        throw error;
      }
    });

  // Footer subcommand group
  const footerCmd = structureCmd
    .command('footer')
    .description('Footer operations');

  footerCmd
    .command('create [doc-id]')
    .description('Create a document footer')
    .action(async (docIdInput: string) => {
      const format = structureCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);

      const spinner = ora('Creating footer...').start();

      try {
        const footerId = await client.createFooter(docId);
        spinner.succeed('Footer created');

        if (format === 'json') {
          output({ success: true, footerId }, format);
        } else {
          console.log(text.labelValue('Footer ID', footerId));
          console.log();
          console.log(chalk.dim('Add content to the footer using:'));
          console.log(chalk.cyan(`  google-docs-cli text insert ${docId} "Footer text" --segment ${footerId}`));
        }
      } catch (error) {
        spinner.fail('Failed to create footer');
        throw error;
      }
    });

  footerCmd
    .command('delete [doc-id] <footer-id>')
    .description('Delete a footer')
    .action(async (docIdInput: string, footerId: string) => {
      const format = structureCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);

      const spinner = ora('Deleting footer...').start();

      try {
        await client.deleteFooter(docId, footerId);
        spinner.succeed('Footer deleted');

        if (format === 'json') {
          output({ success: true, deletedFooterId: footerId }, format);
        }
      } catch (error) {
        spinner.fail('Failed to delete footer');
        throw error;
      }
    });

  // List command
  structureCmd
    .command('list [doc-id]')
    .description('List all headers and footers')
    .action(async (docIdInput: string) => {
      const format = structureCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);

      const spinner = ora('Fetching structure info...').start();

      try {
        const { headers, footers } = await client.getHeadersAndFooters(docId);
        spinner.stop();

        if (format === 'json') {
          output({ headers, footers }, format);
          return;
        }

        console.log(text.header('Document Structure'));
        console.log();

        if (headers.length === 0 && footers.length === 0) {
          console.log(text.info('No headers or footers defined.'));
          return;
        }

        if (headers.length > 0) {
          console.log(text.subheader('Headers:'));
          for (const header of headers) {
            console.log(`  • ${header.id}`);
          }
          console.log();
        }

        if (footers.length > 0) {
          console.log(text.subheader('Footers:'));
          for (const footer of footers) {
            console.log(`  • ${footer.id}`);
          }
        }
      } catch (error) {
        spinner.fail('Failed to list structure');
        throw error;
      }
    });

  // Page break command
  structureCmd
    .command('page-break [doc-id]')
    .description('Insert a page break')
    .option('--at <index>', 'Insert at this index', '1')
    .option('-s, --segment <id>', 'Segment ID')
    .action(async (docIdInput: string, options) => {
      const format = structureCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const index = parseIndex(options.at, 1);

      const spinner = ora('Inserting page break...').start();

      try {
        await client.insertPageBreak(docId, index, options.segment);
        spinner.succeed(`Inserted page break at index ${index}`);

        if (format === 'json') {
          output({ success: true, insertedAt: index }, format);
        }
      } catch (error) {
        spinner.fail('Failed to insert page break');
        throw error;
      }
    });

  // Section break command
  structureCmd
    .command('section-break [doc-id] <type>')
    .description('Insert a section break (continuous or next-page)')
    .option('--at <index>', 'Insert at this index', '1')
    .action(async (docIdInput: string, type: string, options) => {
      const format = structureCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const index = parseIndex(options.at, 1);

      let breakType: SectionBreakType;
      switch (type.toLowerCase().replace('-', '_')) {
        case 'continuous':
          breakType = 'CONTINUOUS';
          break;
        case 'next_page':
        case 'nextpage':
        case 'next-page':
          breakType = 'NEXT_PAGE';
          break;
        default:
          throw new Error('Section break type must be "continuous" or "next-page"');
      }

      const spinner = ora('Inserting section break...').start();

      try {
        await client.insertSectionBreak(docId, index, breakType);
        spinner.succeed(`Inserted ${breakType} section break at index ${index}`);

        if (format === 'json') {
          output({ success: true, type: breakType, insertedAt: index }, format);
        }
      } catch (error) {
        spinner.fail('Failed to insert section break');
        throw error;
      }
    });

  return structureCmd;
}

export default createStructureCommand;
