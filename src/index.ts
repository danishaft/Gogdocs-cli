#!/usr/bin/env node
/**
 * google-docs-cli - Google Docs CLI
 *
 * A full-featured command-line interface for manipulating Google Docs.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createAuthCommand } from './cli/commands/auth.js';
import { createDocCommand } from './cli/commands/doc.js';
import { createTextCommand } from './cli/commands/text.js';
import { createFormatCommand } from './cli/commands/format.js';
import { createTableCommand } from './cli/commands/table.js';
import { createImageCommand } from './cli/commands/image.js';
import { createStructureCommand } from './cli/commands/structure.js';
import { createRangeCommand } from './cli/commands/range.js';
import { createUseCommand } from './cli/commands/use.js';
import { createHelpCommands, printMainHelp } from './cli/help/index.js';
import { handleError } from './utils/errors.js';

const VERSION = '1.0.0';

async function main() {
  const program = new Command();

  program
    .name('google-docs-cli')
    .description('A full-featured CLI for manipulating Google Docs')
    .version(VERSION, '-V, --version', 'Show version number')
    .option('-f, --format <type>', 'Output format: json, table, text', 'text')
    .option('-q, --quiet', 'Suppress non-essential output')
    .option('-v, --verbose', 'Show detailed output')
    .configureHelp({
      sortSubcommands: true,
      sortOptions: true,
    })
    .addHelpText('after', `
${chalk.bold('Examples:')}
  ${chalk.dim('# Create a new document')}
  google-docs-cli doc create "My Document"

  ${chalk.dim('# Get document content')}
  google-docs-cli doc get <document-id>

  ${chalk.dim('# Insert text')}
  google-docs-cli text insert <document-id> "Hello World" --at 1

  ${chalk.dim('# Format text')}
  google-docs-cli format bold <document-id> --from 1 --to 10

${chalk.bold('Documentation:')}
  ${chalk.cyan('google-docs-cli concepts <topic>')}   Learn key concepts
  ${chalk.cyan('google-docs-cli examples <command>')} See usage examples
  ${chalk.cyan('google-docs-cli tutorial <name>')}    Interactive tutorials

Run ${chalk.cyan('google-docs-cli <command> --help')} for detailed help on any command.
`);

  // Add main commands
  program.addCommand(createAuthCommand());
  program.addCommand(createUseCommand());
  program.addCommand(createDocCommand());
  program.addCommand(createTextCommand());
  program.addCommand(createFormatCommand());
  program.addCommand(createTableCommand());
  program.addCommand(createImageCommand());
  program.addCommand(createStructureCommand());
  program.addCommand(createRangeCommand());

  // Add help commands
  for (const helpCmd of createHelpCommands()) {
    program.addCommand(helpCmd);
  }

  // Custom help command that shows our enhanced help
  program
    .command('help [command]')
    .description('Show help for google-docs-cli or a specific command')
    .action((cmd?: string) => {
      if (!cmd) {
        printMainHelp();
        return;
      }

      // Find the command and show its help
      const targetCmd = program.commands.find(c => c.name() === cmd || c.aliases().includes(cmd));
      if (targetCmd) {
        targetCmd.outputHelp();
      } else {
        console.log(chalk.red(`Unknown command: ${cmd}`));
        console.log();
        console.log('Available commands:');
        for (const c of program.commands) {
          if (c.name() !== 'help') {
            console.log(`  ${chalk.cyan(c.name().padEnd(15))} ${c.description()}`);
          }
        }
      }
    });

  // Handle unknown commands gracefully
  program.on('command:*', (operands) => {
    console.error(chalk.red(`Unknown command: ${operands[0]}`));
    console.log();

    // Suggest similar commands
    const availableCommands = program.commands.map(c => c.name());
    const similar = availableCommands.filter(cmd =>
      cmd.includes(operands[0]) || operands[0].includes(cmd)
    );

    if (similar.length > 0) {
      console.log('Did you mean?');
      for (const cmd of similar) {
        console.log(`  google-docs-cli ${chalk.cyan(cmd)}`);
      }
      console.log();
    }

    console.log(`Run ${chalk.cyan('google-docs-cli --help')} to see available commands.`);
    process.exit(1);
  });

  // Parse and execute
  try {
    await program.parseAsync(process.argv);

    // If no command was provided, show help
    if (process.argv.length === 2) {
      printMainHelp();
    }
  } catch (error) {
    handleError(error);
  }
}

main().catch(handleError);
