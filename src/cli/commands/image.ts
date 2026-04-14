/**
 * Image commands: insert, list
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

export function createImageCommand(): Command {
  const imageCmd = new Command('image')
    .alias('img')
    .description('Image operations: insert, list')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Insert an image at position 1')}
  google-docs-cli image insert DOC_ID "https://example.com/image.png" --at 1

  ${chalk.dim('# Insert an image with specific dimensions')}
  google-docs-cli image insert DOC_ID "https://example.com/image.png" --at 1 --width 200 --height 150

  ${chalk.dim('# List all images in the document')}
  google-docs-cli image list DOC_ID

${chalk.bold('Image Requirements:')}
  • Images must be publicly accessible via URL
  • Supported formats: PNG, JPG, GIF, BMP, WebP
  • Size dimensions are in points (PT)
`);

  // Insert command
  imageCmd
    .command('insert [doc-id] <url>')
    .description('Insert an inline image')
    .option('--at <index>', 'Insert at this document index', '1')
    .option('-w, --width <pt>', 'Image width in points')
    .option('-h, --height <pt>', 'Image height in points')
    .option('--tab <id>', 'Target tab ID')
    .action(async (docIdInput: string, url: string, options) => {
      const format = imageCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const index = parseIndex(options.at, 1);
      const width = options.width ? parseFloat(options.width) : undefined;
      const height = options.height ? parseFloat(options.height) : undefined;
      const tabId = options.tab as string | undefined;

      // Validate URL
      try {
        new URL(url);
      } catch {
        throw new Error('Invalid URL. Please provide a valid, publicly accessible image URL.');
      }

      const spinner = ora('Inserting image...').start();

      try {
        await client.insertImage(docId, url, index, width, height, tabId);
        spinner.succeed(`Inserted image at index ${index}`);

        if (format === 'json') {
          output({
            success: true,
            url,
            insertedAt: index,
            width,
            height,
            ...(tabId ? { tabId } : {}),
          }, format);
        } else {
          console.log(text.labelValue('URL', url));
          if (width) console.log(text.labelValue('Width', `${width}pt`));
          if (height) console.log(text.labelValue('Height', `${height}pt`));
        }
      } catch (error) {
        spinner.fail('Failed to insert image');
        console.log();
        console.log(chalk.yellow('Note: The image URL must be publicly accessible.'));
        console.log(chalk.yellow('Private or authenticated images cannot be inserted.'));
        throw error;
      }
    });

  // List command
  imageCmd
    .command('list [doc-id]')
    .description('List all images in the document')
    .option('--tab <id>', 'List images in a specific tab')
    .action(async (docIdInput: string, options) => {
      const format = imageCmd.parent?.opts().format as OutputFormat ?? 'text';
      const docId = resolveDocId(docIdInput);
      const tabId = options.tab as string | undefined;

      const spinner = ora('Fetching images...').start();

      try {
        const images = await client.listImages(docId, tabId);
        spinner.stop();

        if (images.length === 0) {
          console.log(text.info('No images found in the document.'));
          if (format === 'json') {
            output({ images: [], count: 0, ...(tabId ? { tabId } : {}) }, format);
          }
          return;
        }

        if (format === 'json') {
          output({ images, count: images.length, ...(tabId ? { tabId } : {}) }, format);
          return;
        }

        console.log(text.header(`Found ${images.length} image${images.length !== 1 ? 's' : ''}`));
        console.log();

        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          console.log(chalk.bold(`Image ${i + 1}:`));
          console.log(text.labelValue('  Object ID', img.objectId));
          if (img.uri) {
            console.log(text.labelValue('  Source', chalk.cyan(img.uri)));
          }
          if (img.width || img.height) {
            const dims = [
              img.width ? `${img.width}pt` : '?',
              img.height ? `${img.height}pt` : '?',
            ].join(' x ');
            console.log(text.labelValue('  Size', dims));
          }
          console.log();
        }
      } catch (error) {
        spinner.fail('Failed to list images');
        throw error;
      }
    });

  return imageCmd;
}

export default createImageCommand;
