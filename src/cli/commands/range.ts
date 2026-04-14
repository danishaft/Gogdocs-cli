/**
 * Named range commands: create, list, get, update, delete
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import client from '../../api/client.js';
import config from '../../utils/config.js';
import { parseDocumentId, parseIndex } from '../../utils/parser.js';
import { output, text } from '../output/index.js';
import type { OutputFormat } from '../../types/index.js';

function resolveDocId(input?: string): string {
  if (input) return parseDocumentId(input);
  const sessionDoc = config.getCurrentDocument();
  if (!sessionDoc) throw new Error('No document specified. Use "google-docs-cli use <doc-id>" to set a default.');
  return sessionDoc;
}

export function createRangeCommand(): Command {
  const rangeCmd = new Command('range')
    .alias('ranges')
    .description('Named range operations: create, list, get, update, delete')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Create a named range')}
  google-docs-cli range create DOC_ID "myRange" --from 10 --to 20

  ${chalk.dim('# List all named ranges')}
  google-docs-cli range list DOC_ID

  ${chalk.dim('# Get a specific named range')}
  google-docs-cli range get DOC_ID "myRange"

  ${chalk.dim('# Update content of a named range')}
  google-docs-cli range update DOC_ID "myRange" "New content"

  ${chalk.dim('# Delete a named range')}
  google-docs-cli range delete DOC_ID "myRange"

${chalk.bold('Use Cases:')}
  Named ranges are powerful for templating:
  1. Create a document with placeholder ranges
  2. Use "range update" to replace content programmatically
  3. Perfect for generating personalized documents from templates

${chalk.bold('Template Example:')}
  ${chalk.dim('# Create template with named ranges')}
  google-docs-cli range create DOC_ID "customer_name" --from 10 --to 20
  google-docs-cli range create DOC_ID "order_date" --from 50 --to 60

  ${chalk.dim('# Fill in template values')}
  google-docs-cli range update DOC_ID "customer_name" "John Smith"
  google-docs-cli range update DOC_ID "order_date" "2024-01-15"
`);

  // Create command
  rangeCmd
    .command('create [doc-id] <name>')
    .description('Create a named range')
    .requiredOption('--from <index>', 'Start index')
    .requiredOption('--to <index>', 'End index')
    .option('-s, --segment <id>', 'Segment ID')
    .action(async (docIdInput: string, name: string, options) => {
      const format = rangeCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const startIndex = parseIndex(options.from, 1);
      const endIndex = parseIndex(options.to, startIndex + 1);

      if (endIndex <= startIndex) {
        throw new Error('End index must be greater than start index');
      }

      const spinner = ora('Creating named range...').start();

      try {
        const rangeId = await client.createNamedRange(docId, name, startIndex, endIndex, options.segment);
        spinner.succeed(`Created named range "${name}"`);

        if (format === 'json') {
          output({
            success: true,
            name,
            namedRangeId: rangeId,
            range: { startIndex, endIndex },
          }, format);
        } else {
          console.log(text.labelValue('Name', name));
          console.log(text.labelValue('Range ID', rangeId));
          console.log(text.labelValue('Range', `${startIndex}-${endIndex}`));
        }
      } catch (error) {
        spinner.fail('Failed to create named range');
        throw error;
      }
    });

  // List command
  rangeCmd
    .command('list [doc-id]')
    .description('List all named ranges')
    .action(async (docIdInput: string) => {
      const format = rangeCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);

      const spinner = ora('Fetching named ranges...').start();

      try {
        const ranges = await client.listNamedRanges(docId);
        spinner.stop();

        if (ranges.length === 0) {
          console.log(text.info('No named ranges found in the document.'));
          if (format === 'json') {
            output({ ranges: [], count: 0 }, format);
          }
          return;
        }

        if (format === 'json') {
          output({ ranges, count: ranges.length }, format);
          return;
        }

        console.log(text.header(`Found ${ranges.length} named range${ranges.length !== 1 ? 's' : ''}`));
        console.log();

        for (const range of ranges) {
          console.log(chalk.bold(`"${range.name}"`));
          console.log(text.labelValue('  ID', range.namedRangeId));
          for (const r of range.ranges) {
            console.log(text.labelValue('  Range', `${r.startIndex}-${r.endIndex}`));
          }
          console.log();
        }
      } catch (error) {
        spinner.fail('Failed to list named ranges');
        throw error;
      }
    });

  // Get command
  rangeCmd
    .command('get [doc-id] <name>')
    .description('Get a specific named range and its content')
    .action(async (docIdInput: string, name: string) => {
      const format = rangeCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);

      const spinner = ora('Fetching named range...').start();

      try {
        const ranges = await client.listNamedRanges(docId);
        const range = ranges.find(r => r.name === name);

        if (!range) {
          spinner.fail(`Named range "${name}" not found`);
          return;
        }

        // Get content for each range segment
        const fullText = await client.readText(docId);
        const contents: string[] = [];

        for (const r of range.ranges) {
          const content = fullText.slice(r.startIndex - 1, r.endIndex - 1);
          contents.push(content);
        }

        spinner.stop();

        if (format === 'json') {
          output({
            name: range.name,
            namedRangeId: range.namedRangeId,
            ranges: range.ranges,
            contents,
          }, format);
          return;
        }

        console.log(text.header(`Named Range: "${name}"`));
        console.log();
        console.log(text.labelValue('Range ID', range.namedRangeId));
        console.log();

        for (let i = 0; i < range.ranges.length; i++) {
          const r = range.ranges[i];
          console.log(text.subheader(`Segment ${i + 1} (${r.startIndex}-${r.endIndex}):`));
          console.log(chalk.bgGray.white(' ' + contents[i] + ' '));
          console.log();
        }
      } catch (error) {
        spinner.fail('Failed to get named range');
        throw error;
      }
    });

  // Update command
  rangeCmd
    .command('update [doc-id] <name> <content>')
    .description('Replace content of a named range')
    .action(async (docIdInput: string, name: string, content: string) => {
      const format = rangeCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);

      const spinner = ora('Updating named range content...').start();

      try {
        await client.updateNamedRangeContent(docId, name, content);
        spinner.succeed(`Updated content of named range "${name}"`);

        if (format === 'json') {
          output({
            success: true,
            name,
            newContent: content,
          }, format);
        } else {
          console.log(text.labelValue('New content', content));
        }
      } catch (error) {
        spinner.fail('Failed to update named range');
        throw error;
      }
    });

  // Delete command
  rangeCmd
    .command('delete [doc-id] <name>')
    .description('Delete a named range (content remains, only range definition is removed)')
    .action(async (docIdInput: string, name: string) => {
      const format = rangeCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);

      const spinner = ora('Deleting named range...').start();

      try {
        await client.deleteNamedRange(docId, name);
        spinner.succeed(`Deleted named range "${name}"`);

        if (format === 'json') {
          output({ success: true, deletedRange: name }, format);
        } else {
          console.log(chalk.dim('Note: The text content remains in the document.'));
          console.log(chalk.dim('Only the named range definition was removed.'));
        }
      } catch (error) {
        spinner.fail('Failed to delete named range');
        throw error;
      }
    });

  return rangeCmd;
}

export default createRangeCommand;
