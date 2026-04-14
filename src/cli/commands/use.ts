/**
 * Use command: set/show/clear the current working document
 */

import { Command } from 'commander';
import chalk from 'chalk';
import config from '../../utils/config.js';
import { parseDocumentId, buildDocUrl, formatDocId } from '../../utils/parser.js';
import { output, text } from '../output/index.js';
import type { OutputFormat } from '../../types/index.js';

export function createUseCommand(): Command {
  const useCmd = new Command('use')
    .description('Set, show, or clear the current working document')
    .argument('[doc-id]', 'Document ID or URL to use as default')
    .option('--clear', 'Clear the current document')
    .option('--persist', 'Save as persistent default (survives session)')
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Set current document')}
  google-docs-cli use 1Qyy4PQcYgut0NcviwUM-ocxIhfZ9INgfGEj6DfQ0Sh0

  ${chalk.dim('# Set from URL')}
  google-docs-cli use "https://docs.google.com/document/d/1abc.../edit"

  ${chalk.dim('# Show current document')}
  google-docs-cli use

  ${chalk.dim('# Clear current document')}
  google-docs-cli use --clear

  ${chalk.dim('# Set as persistent default')}
  google-docs-cli use 1abc... --persist

${chalk.bold('After setting a document, you can omit the doc-id:')}
  google-docs-cli table list
  google-docs-cli text read
  google-docs-cli format bold --from 1 --to 10

${chalk.bold('Priority order:')}
  1. Explicit doc-id argument in command
  2. GOOGLE_DOCS_CLI_DOC environment variable
  3. Session document (set with 'google-docs-cli use')
  4. Persistent default (set with 'google-docs-cli use --persist')
`)
    .action(async (docIdInput?: string, options?: { clear?: boolean; persist?: boolean }) => {
      const format = useCmd.parent?.opts().format as OutputFormat ?? 'text';

      // Clear
      if (options?.clear) {
        config.clearSessionDocument();
        if (format === 'json') {
          output({ success: true, action: 'cleared' }, format);
        } else {
          console.log(text.success('Cleared current document'));
        }
        return;
      }

      // Set document
      if (docIdInput) {
        const docId = parseDocumentId(docIdInput);

        if (options?.persist) {
          config.setDefaultDocId(docId);
          if (format === 'json') {
            output({ success: true, documentId: docId, persistent: true }, format);
          } else {
            console.log(text.success('Set persistent default document'));
            console.log(text.labelValue('Document ID', formatDocId(docId, 40)));
            console.log(text.labelValue('URL', chalk.cyan(buildDocUrl(docId))));
          }
        } else {
          config.setSessionDocument(docId);
          if (format === 'json') {
            output({ success: true, documentId: docId, persistent: false }, format);
          } else {
            console.log(text.success('Set current document'));
            console.log(text.labelValue('Document ID', formatDocId(docId, 40)));
            console.log(text.labelValue('URL', chalk.cyan(buildDocUrl(docId))));
            console.log();
            console.log(chalk.dim('You can now run commands without specifying the document:'));
            console.log(chalk.cyan('  google-docs-cli table list'));
            console.log(chalk.cyan('  google-docs-cli text read'));
          }
        }
        return;
      }

      // Show current document
      const current = config.getCurrentDocument();
      const session = config.getSessionDocument();
      const persistent = config.getDefaultDocId();
      const envVar = process.env.GOOGLE_DOCS_CLI_DOC;

      if (format === 'json') {
        output({
          current,
          sources: {
            environment: envVar,
            session,
            persistent,
          },
        }, format);
        return;
      }

      console.log(text.header('Current Document'));
      console.log();

      if (current) {
        console.log(text.labelValue('Active', formatDocId(current, 40)));
        console.log(text.labelValue('URL', chalk.cyan(buildDocUrl(current))));
        console.log();

        // Show source
        if (envVar === current) {
          console.log(chalk.dim('Source: GOOGLE_DOCS_CLI_DOC environment variable'));
        } else if (session === current) {
          console.log(chalk.dim('Source: Session (google-docs-cli use)'));
        } else if (persistent === current) {
          console.log(chalk.dim('Source: Persistent default (google-docs-cli use --persist)'));
        }
      } else {
        console.log(text.warning('No document set'));
        console.log();
        console.log('Set a document with:');
        console.log(chalk.cyan('  google-docs-cli use <document-id>'));
        console.log();
        console.log('Or use environment variable:');
        console.log(chalk.cyan('  export GOOGLE_DOCS_CLI_DOC=<document-id>'));
      }

      // Show all sources if verbose
      if (envVar || session || persistent) {
        console.log();
        console.log(text.subheader('All configured sources:'));
        if (envVar) {
          console.log(text.labelValue('  GOOGLE_DOCS_CLI_DOC', formatDocId(envVar, 30)));
        }
        if (session) {
          console.log(text.labelValue('  Session', formatDocId(session, 30)));
        }
        if (persistent) {
          console.log(text.labelValue('  Persistent', formatDocId(persistent, 30)));
        }
      }
    });

  return useCmd;
}

export default createUseCommand;
