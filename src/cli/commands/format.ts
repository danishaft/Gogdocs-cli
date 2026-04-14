/**
 * Formatting commands: bold, italic, color, font, size, heading, link
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import client from '../../api/client.js';
import config from '../../utils/config.js';
import { parseDocumentId, parseIndex, parseColor, parseFontSize, parseRanges } from '../../utils/parser.js';
import { output, text } from '../output/index.js';
import type { OutputFormat } from '../../types/index.js';
import type { TextStyleUpdate, HeadingLevel } from '../../api/types.js';

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

export function createFormatCommand(): Command {
  const formatCmd = new Command('format')
    .alias('fmt')
    .description('Text formatting: bold, italic, color, font, size, heading, link')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Format by text match (easiest way!)')}
  google-docs-cli format bold DOC_ID --text "BOOK TICKETS"
  google-docs-cli format color DOC_ID orange --text "ACTION ITEM" --all --background

  ${chalk.dim('# Format by index range')}
  google-docs-cli format bold DOC_ID --from 1 --to 10
  google-docs-cli format italic DOC_ID --from 5 --to 15

  ${chalk.dim('# Batch format multiple ranges')}
  google-docs-cli format bold DOC_ID --ranges "5-9,11-15,17-25"

  ${chalk.dim('# Change text color')}
  google-docs-cli format color DOC_ID red --from 1 --to 20
  google-docs-cli format color DOC_ID "#ff5500" --text "highlight"

  ${chalk.dim('# Change font')}
  google-docs-cli format font DOC_ID "Arial" --from 1 --to 50

  ${chalk.dim('# Change font size')}
  google-docs-cli format size DOC_ID 14 --from 1 --to 50

  ${chalk.dim('# Apply heading style')}
  google-docs-cli format heading DOC_ID 1 --text "My Heading"

  ${chalk.dim('# Add a hyperlink')}
  google-docs-cli format link DOC_ID "https://example.com" --text "click here"

${chalk.bold('Text Matching Options:')}
  • --text <string>  Find and format matching text
  • --all            Apply to all occurrences (default: first only)

${chalk.bold('Color Formats:')}
  • Named colors: red, blue, green, yellow, purple, etc.
  • Hex colors: #ff0000, #00ff00, #0000ff
  • RGB: rgb(255, 0, 0)

${chalk.bold('Heading Levels:')}
  • 1-6 for heading levels
  • 0 or "normal" for normal text
`);

  // Bold command
  formatCmd
    .command('bold [doc-id]')
    .description('Apply bold formatting to text')
    .option('--from <index>', 'Start index')
    .option('--to <index>', 'End index')
    .option('--ranges <ranges>', 'Multiple ranges (e.g., "5-9,11-15,17-25")')
    .option('--text <string>', 'Format text matching this string')
    .option('--all', 'Apply to all occurrences (with --text)')
    .option('-s, --segment <id>', 'Segment ID')
    .option('--remove', 'Remove bold formatting instead')
    .action(async (docIdInput: string, options) => {
      const format = formatCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const style: TextStyleUpdate = { bold: !options.remove };

      // Handle --text option (find and format)
      if (options.text) {
        const spinner = ora(`Finding "${options.text}"...`).start();
        try {
          const ranges = await client.findTextIndexes(docId, options.text, { all: options.all });
          if (ranges.length === 0) {
            spinner.fail(`Text "${options.text}" not found`);
            return;
          }
          spinner.text = `Applying bold to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}...`;
          await client.updateTextStyleBatch(docId, ranges, style, options.segment);
          spinner.succeed(`${options.remove ? 'Removed' : 'Applied'} bold formatting to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}`);

          if (format === 'json') {
            output({ success: true, style: 'bold', text: options.text, ranges }, format);
          }
        } catch (error) {
          spinner.fail('Failed to apply formatting');
          throw error;
        }
        return;
      }

      // Handle batch ranges
      if (options.ranges) {
        const ranges = parseRanges(options.ranges);
        const spinner = ora(`Applying bold to ${ranges.length} ranges...`).start();

        try {
          await client.updateTextStyleBatch(docId, ranges, style, options.segment);
          spinner.succeed(`${options.remove ? 'Removed' : 'Applied'} bold formatting to ${ranges.length} ranges`);

          if (format === 'json') {
            output({ success: true, style: 'bold', ranges }, format);
          }
        } catch (error) {
          spinner.fail('Failed to apply formatting');
          throw error;
        }
        return;
      }

      // Single range
      if (!options.from || !options.to) {
        throw new Error('Either --text, --ranges, or both --from and --to are required');
      }

      const startIndex = parseIndex(options.from, 1);
      const endIndex = parseIndex(options.to, startIndex + 1);
      const spinner = ora('Applying bold formatting...').start();

      try {
        await client.updateTextStyle(docId, startIndex, endIndex, style, options.segment);
        spinner.succeed(`${options.remove ? 'Removed' : 'Applied'} bold formatting (${startIndex}-${endIndex})`);

        if (format === 'json') {
          output({ success: true, style: 'bold', range: { startIndex, endIndex } }, format);
        }
      } catch (error) {
        spinner.fail('Failed to apply formatting');
        throw error;
      }
    });

  // Italic command
  formatCmd
    .command('italic [doc-id]')
    .description('Apply italic formatting to text')
    .option('--from <index>', 'Start index')
    .option('--to <index>', 'End index')
    .option('--text <string>', 'Format text matching this string')
    .option('--all', 'Apply to all occurrences (with --text)')
    .option('-s, --segment <id>', 'Segment ID')
    .option('--remove', 'Remove italic formatting instead')
    .action(async (docIdInput: string, options) => {
      const format = formatCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const style: TextStyleUpdate = { italic: !options.remove };

      // Handle --text option
      if (options.text) {
        const spinner = ora(`Finding "${options.text}"...`).start();
        try {
          const ranges = await client.findTextIndexes(docId, options.text, { all: options.all });
          if (ranges.length === 0) {
            spinner.fail(`Text "${options.text}" not found`);
            return;
          }
          spinner.text = `Applying italic to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}...`;
          await client.updateTextStyleBatch(docId, ranges, style, options.segment);
          spinner.succeed(`${options.remove ? 'Removed' : 'Applied'} italic formatting to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}`);
          if (format === 'json') {
            output({ success: true, style: 'italic', text: options.text, ranges }, format);
          }
        } catch (error) {
          spinner.fail('Failed to apply formatting');
          throw error;
        }
        return;
      }

      if (!options.from || !options.to) {
        throw new Error('Either --text or both --from and --to are required');
      }

      const startIndex = parseIndex(options.from, 1);
      const endIndex = parseIndex(options.to, startIndex + 1);
      const spinner = ora('Applying italic formatting...').start();

      try {
        await client.updateTextStyle(docId, startIndex, endIndex, style, options.segment);
        spinner.succeed(`${options.remove ? 'Removed' : 'Applied'} italic formatting (${startIndex}-${endIndex})`);

        if (format === 'json') {
          output({ success: true, style: 'italic', range: { startIndex, endIndex } }, format);
        }
      } catch (error) {
        spinner.fail('Failed to apply formatting');
        throw error;
      }
    });

  // Underline command
  formatCmd
    .command('underline [doc-id]')
    .description('Apply underline formatting to text')
    .option('--from <index>', 'Start index')
    .option('--to <index>', 'End index')
    .option('--text <string>', 'Format text matching this string')
    .option('--all', 'Apply to all occurrences (with --text)')
    .option('-s, --segment <id>', 'Segment ID')
    .option('--remove', 'Remove underline formatting instead')
    .action(async (docIdInput: string, options) => {
      const format = formatCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const style: TextStyleUpdate = { underline: !options.remove };

      // Handle --text option
      if (options.text) {
        const spinner = ora(`Finding "${options.text}"...`).start();
        try {
          const ranges = await client.findTextIndexes(docId, options.text, { all: options.all });
          if (ranges.length === 0) {
            spinner.fail(`Text "${options.text}" not found`);
            return;
          }
          spinner.text = `Applying underline to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}...`;
          await client.updateTextStyleBatch(docId, ranges, style, options.segment);
          spinner.succeed(`${options.remove ? 'Removed' : 'Applied'} underline formatting to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}`);
          if (format === 'json') {
            output({ success: true, style: 'underline', text: options.text, ranges }, format);
          }
        } catch (error) {
          spinner.fail('Failed to apply formatting');
          throw error;
        }
        return;
      }

      if (!options.from || !options.to) {
        throw new Error('Either --text or both --from and --to are required');
      }

      const startIndex = parseIndex(options.from, 1);
      const endIndex = parseIndex(options.to, startIndex + 1);
      const spinner = ora('Applying underline formatting...').start();

      try {
        await client.updateTextStyle(docId, startIndex, endIndex, style, options.segment);
        spinner.succeed(`${options.remove ? 'Removed' : 'Applied'} underline formatting (${startIndex}-${endIndex})`);

        if (format === 'json') {
          output({ success: true, style: 'underline', range: { startIndex, endIndex } }, format);
        }
      } catch (error) {
        spinner.fail('Failed to apply formatting');
        throw error;
      }
    });

  // Color command
  formatCmd
    .command('color [doc-id] <color>')
    .description('Change text color')
    .option('--from <index>', 'Start index')
    .option('--to <index>', 'End index')
    .option('--text <string>', 'Format text matching this string')
    .option('--all', 'Apply to all occurrences (with --text)')
    .option('-s, --segment <id>', 'Segment ID')
    .option('--background', 'Apply as background color instead')
    .action(async (docIdInput: string, color: string, options) => {
      const format = formatCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const rgbColor = parseColor(color);
      const style: TextStyleUpdate = options.background
        ? { backgroundColor: { color: { rgbColor } } }
        : { foregroundColor: { color: { rgbColor } } };

      // Handle --text option
      if (options.text) {
        const spinner = ora(`Finding "${options.text}"...`).start();
        try {
          const ranges = await client.findTextIndexes(docId, options.text, { all: options.all });
          if (ranges.length === 0) {
            spinner.fail(`Text "${options.text}" not found`);
            return;
          }
          spinner.text = `Applying ${options.background ? 'background ' : ''}color to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}...`;
          await client.updateTextStyleBatch(docId, ranges, style, options.segment);
          spinner.succeed(`Applied ${options.background ? 'background ' : ''}color to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}`);
          if (format === 'json') {
            output({ success: true, style: options.background ? 'backgroundColor' : 'foregroundColor', color: rgbColor, text: options.text, ranges }, format);
          }
        } catch (error) {
          spinner.fail('Failed to apply color');
          throw error;
        }
        return;
      }

      if (!options.from || !options.to) {
        throw new Error('Either --text or both --from and --to are required');
      }

      const startIndex = parseIndex(options.from, 1);
      const endIndex = parseIndex(options.to, startIndex + 1);
      const spinner = ora('Applying color...').start();

      try {
        await client.updateTextStyle(docId, startIndex, endIndex, style, options.segment);
        spinner.succeed(`Applied ${options.background ? 'background ' : ''}color (${startIndex}-${endIndex})`);

        if (format === 'json') {
          output({ success: true, style: options.background ? 'backgroundColor' : 'foregroundColor', color: rgbColor, range: { startIndex, endIndex } }, format);
        }
      } catch (error) {
        spinner.fail('Failed to apply color');
        throw error;
      }
    });

  // Font command
  formatCmd
    .command('font [doc-id] <font-name>')
    .description('Change font family')
    .option('--from <index>', 'Start index')
    .option('--to <index>', 'End index')
    .option('--text <string>', 'Format text matching this string')
    .option('--all', 'Apply to all occurrences (with --text)')
    .option('-s, --segment <id>', 'Segment ID')
    .action(async (docIdInput: string, fontName: string, options) => {
      const format = formatCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const style: TextStyleUpdate = {
        weightedFontFamily: { fontFamily: fontName },
      };

      // Handle --text option
      if (options.text) {
        const spinner = ora(`Finding "${options.text}"...`).start();
        try {
          const ranges = await client.findTextIndexes(docId, options.text, { all: options.all });
          if (ranges.length === 0) {
            spinner.fail(`Text "${options.text}" not found`);
            return;
          }
          spinner.text = `Applying font "${fontName}" to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}...`;
          await client.updateTextStyleBatch(docId, ranges, style, options.segment);
          spinner.succeed(`Applied font "${fontName}" to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}`);
          if (format === 'json') {
            output({ success: true, style: 'font', fontFamily: fontName, text: options.text, ranges }, format);
          }
        } catch (error) {
          spinner.fail('Failed to apply font');
          throw error;
        }
        return;
      }

      if (!options.from || !options.to) {
        throw new Error('Either --text or both --from and --to are required');
      }

      const startIndex = parseIndex(options.from, 1);
      const endIndex = parseIndex(options.to, startIndex + 1);
      const spinner = ora('Applying font...').start();

      try {
        await client.updateTextStyle(docId, startIndex, endIndex, style, options.segment);
        spinner.succeed(`Applied font "${fontName}" (${startIndex}-${endIndex})`);

        if (format === 'json') {
          output({ success: true, style: 'font', fontFamily: fontName, range: { startIndex, endIndex } }, format);
        }
      } catch (error) {
        spinner.fail('Failed to apply font');
        throw error;
      }
    });

  // Size command
  formatCmd
    .command('size [doc-id] <size>')
    .description('Change font size')
    .option('--from <index>', 'Start index')
    .option('--to <index>', 'End index')
    .option('--text <string>', 'Format text matching this string')
    .option('--all', 'Apply to all occurrences (with --text)')
    .option('-s, --segment <id>', 'Segment ID')
    .action(async (docIdInput: string, size: string, options) => {
      const format = formatCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const fontSize = parseFontSize(size);
      const style: TextStyleUpdate = {
        fontSize: { magnitude: fontSize, unit: 'PT' },
      };

      // Handle --text option
      if (options.text) {
        const spinner = ora(`Finding "${options.text}"...`).start();
        try {
          const ranges = await client.findTextIndexes(docId, options.text, { all: options.all });
          if (ranges.length === 0) {
            spinner.fail(`Text "${options.text}" not found`);
            return;
          }
          spinner.text = `Applying font size ${fontSize}pt to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}...`;
          await client.updateTextStyleBatch(docId, ranges, style, options.segment);
          spinner.succeed(`Applied font size ${fontSize}pt to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}`);
          if (format === 'json') {
            output({ success: true, style: 'fontSize', size: fontSize, text: options.text, ranges }, format);
          }
        } catch (error) {
          spinner.fail('Failed to apply font size');
          throw error;
        }
        return;
      }

      if (!options.from || !options.to) {
        throw new Error('Either --text or both --from and --to are required');
      }

      const startIndex = parseIndex(options.from, 1);
      const endIndex = parseIndex(options.to, startIndex + 1);
      const spinner = ora('Applying font size...').start();

      try {
        await client.updateTextStyle(docId, startIndex, endIndex, style, options.segment);
        spinner.succeed(`Applied font size ${fontSize}pt (${startIndex}-${endIndex})`);

        if (format === 'json') {
          output({ success: true, style: 'fontSize', size: fontSize, range: { startIndex, endIndex } }, format);
        }
      } catch (error) {
        spinner.fail('Failed to apply font size');
        throw error;
      }
    });

  // Heading command
  formatCmd
    .command('heading [doc-id] <level>')
    .description('Apply heading style (1-6, or 0 for normal)')
    .option('--from <index>', 'Start index')
    .option('--to <index>', 'End index')
    .option('--text <string>', 'Format paragraph containing this text')
    .option('--all', 'Apply to all occurrences (with --text)')
    .option('-s, --segment <id>', 'Segment ID')
    .action(async (docIdInput: string, level: string, options) => {
      const format = formatCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);

      let headingLevel: HeadingLevel;
      if (level === '0' || level.toLowerCase() === 'normal') {
        headingLevel = 'NORMAL_TEXT';
      } else if (level === 'title') {
        headingLevel = 'TITLE';
      } else if (level === 'subtitle') {
        headingLevel = 'SUBTITLE';
      } else {
        const numLevel = parseInt(level, 10);
        if (numLevel < 1 || numLevel > 6) {
          throw new Error('Heading level must be 1-6, or 0/normal for normal text');
        }
        headingLevel = `HEADING_${numLevel}` as HeadingLevel;
      }

      // Handle --text option
      if (options.text) {
        const spinner = ora(`Finding "${options.text}"...`).start();
        try {
          const ranges = await client.findTextIndexes(docId, options.text, { all: options.all });
          if (ranges.length === 0) {
            spinner.fail(`Text "${options.text}" not found`);
            return;
          }
          spinner.text = `Applying ${headingLevel} to ${ranges.length} paragraph${ranges.length > 1 ? 's' : ''}...`;
          for (const range of ranges) {
            await client.applyHeading(docId, range.start, range.end, headingLevel, options.segment);
          }
          spinner.succeed(`Applied ${headingLevel} to ${ranges.length} paragraph${ranges.length > 1 ? 's' : ''}`);
          if (format === 'json') {
            output({ success: true, style: headingLevel, text: options.text, ranges }, format);
          }
        } catch (error) {
          spinner.fail('Failed to apply heading');
          throw error;
        }
        return;
      }

      if (!options.from || !options.to) {
        throw new Error('Either --text or both --from and --to are required');
      }

      const startIndex = parseIndex(options.from, 1);
      const endIndex = parseIndex(options.to, startIndex + 1);
      const spinner = ora('Applying heading style...').start();

      try {
        await client.applyHeading(docId, startIndex, endIndex, headingLevel, options.segment);
        spinner.succeed(`Applied ${headingLevel} style (${startIndex}-${endIndex})`);

        if (format === 'json') {
          output({ success: true, style: headingLevel, range: { startIndex, endIndex } }, format);
        }
      } catch (error) {
        spinner.fail('Failed to apply heading');
        throw error;
      }
    });

  // Link command
  formatCmd
    .command('link [doc-id] <url>')
    .description('Add a hyperlink to text')
    .option('--from <index>', 'Start index')
    .option('--to <index>', 'End index')
    .option('--text <string>', 'Add link to text matching this string')
    .option('--all', 'Apply to all occurrences (with --text)')
    .option('-s, --segment <id>', 'Segment ID')
    .action(async (docIdInput: string, url: string, options) => {
      const format = formatCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const style: TextStyleUpdate = { link: { url } };

      // Handle --text option
      if (options.text) {
        const spinner = ora(`Finding "${options.text}"...`).start();
        try {
          const ranges = await client.findTextIndexes(docId, options.text, { all: options.all });
          if (ranges.length === 0) {
            spinner.fail(`Text "${options.text}" not found`);
            return;
          }
          spinner.text = `Adding links to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}...`;
          await client.updateTextStyleBatch(docId, ranges, style, options.segment);
          spinner.succeed(`Added link to ${ranges.length} match${ranges.length > 1 ? 'es' : ''}`);
          if (format === 'json') {
            output({ success: true, style: 'link', url, text: options.text, ranges }, format);
          }
        } catch (error) {
          spinner.fail('Failed to add link');
          throw error;
        }
        return;
      }

      if (!options.from || !options.to) {
        throw new Error('Either --text or both --from and --to are required');
      }

      const startIndex = parseIndex(options.from, 1);
      const endIndex = parseIndex(options.to, startIndex + 1);
      const spinner = ora('Adding link...').start();

      try {
        await client.updateTextStyle(docId, startIndex, endIndex, style, options.segment);
        spinner.succeed(`Added link to ${url} (${startIndex}-${endIndex})`);

        if (format === 'json') {
          output({ success: true, style: 'link', url, range: { startIndex, endIndex } }, format);
        }
      } catch (error) {
        spinner.fail('Failed to add link');
        throw error;
      }
    });

  return formatCmd;
}

export default createFormatCommand;
