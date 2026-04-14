/**
 * Help system - unified module for all help content
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { concepts, getConcept, listConcepts, Concept } from './concepts.js';
import { examples, getExamples, listExampleCommands, formatExamples, Example } from './examples.js';
import { tutorials, getTutorial, listTutorials, formatTutorial, Tutorial } from './tutorials.js';
import { text } from '../output/index.js';

export { concepts, getConcept, listConcepts } from './concepts.js';
export { examples, getExamples, listExampleCommands, formatExamples } from './examples.js';
export { tutorials, getTutorial, listTutorials, formatTutorial } from './tutorials.js';

export function createHelpCommands(): Command[] {
  const commands: Command[] = [];

  // Concepts command
  const conceptsCmd = new Command('concepts')
    .description('Learn key concepts about the Google Docs API')
    .argument('[topic]', 'Concept topic to learn about')
    .action((topic?: string) => {
      if (!topic) {
        // List all concepts
        console.log(text.header('Available Concepts'));
        console.log();
        for (const concept of concepts) {
          console.log(`  ${chalk.cyan(concept.name.padEnd(15))} ${concept.title}`);
        }
        console.log();
        console.log(chalk.dim('Usage: google-docs-cli concepts <topic>'));
        return;
      }

      const concept = getConcept(topic);
      if (!concept) {
        console.log(text.error(`Unknown concept: ${topic}`));
        console.log();
        console.log('Available concepts:');
        console.log(text.list(listConcepts()));
        return;
      }

      console.log(concept.content);
    });

  commands.push(conceptsCmd);

  // Examples command
  const examplesCmd = new Command('examples')
    .description('See examples for specific commands')
    .argument('[command]', 'Command to see examples for')
    .action((command?: string) => {
      if (!command) {
        // List all example categories
        console.log(text.header('Available Example Categories'));
        console.log();
        for (const example of examples) {
          console.log(`  ${chalk.cyan(example.command.padEnd(15))} ${example.title}`);
        }
        console.log();
        console.log(chalk.dim('Usage: google-docs-cli examples <command>'));
        return;
      }

      const example = getExamples(command);
      if (!example) {
        console.log(text.error(`No examples found for: ${command}`));
        console.log();
        console.log('Available example categories:');
        console.log(text.list(listExampleCommands()));
        return;
      }

      console.log(formatExamples(example));
    });

  commands.push(examplesCmd);

  // Tutorials command
  const tutorialsCmd = new Command('tutorial')
    .alias('tutorials')
    .description('Interactive tutorials to learn google-docs-cli')
    .argument('[name]', 'Tutorial name')
    .action((name?: string) => {
      if (!name) {
        // List all tutorials
        console.log(text.header('Available Tutorials'));
        console.log();
        for (const tutorial of listTutorials()) {
          console.log(`  ${chalk.cyan(tutorial.name.padEnd(15))} ${tutorial.title}`);
          console.log(`  ${chalk.dim(' '.repeat(15) + tutorial.description)}`);
          console.log();
        }
        console.log(chalk.dim('Usage: google-docs-cli tutorial <name>'));
        return;
      }

      const tutorial = getTutorial(name);
      if (!tutorial) {
        console.log(text.error(`Unknown tutorial: ${name}`));
        console.log();
        console.log('Available tutorials:');
        for (const t of listTutorials()) {
          console.log(`  • ${t.name}`);
        }
        return;
      }

      console.log(formatTutorial(tutorial));
    });

  commands.push(tutorialsCmd);

  return commands;
}

/**
 * Print the main help screen
 */
export function printMainHelp(): void {
  console.log(`
${chalk.bold.cyan('google-docs-cli')} - Google Docs CLI

${chalk.bold('USAGE')}
  google-docs-cli <command> [options]

${chalk.bold('COMMANDS')}
  ${chalk.cyan('auth')}        Manage Google authentication (login, logout, status)
  ${chalk.cyan('doc')}         Document operations (create, get, info, open, export, tabs)
  ${chalk.cyan('text')}        Text operations (insert, replace, delete, find, read)
  ${chalk.cyan('format')}      Text formatting (bold, italic, color, font, size, heading)
  ${chalk.cyan('table')}       Table operations (create, list, read, insert-row/col)
  ${chalk.cyan('image')}       Image operations (insert, list)
  ${chalk.cyan('structure')}   Headers, footers, page breaks, sections
  ${chalk.cyan('range')}       Named range operations (create, list, update, delete)

${chalk.bold('LEARNING')}
  ${chalk.cyan('concepts')}    Learn key concepts (indexes, ranges, formatting)
  ${chalk.cyan('examples')}    See command examples
  ${chalk.cyan('tutorial')}    Interactive tutorials

${chalk.bold('GLOBAL OPTIONS')}
  -f, --format <type>   Output format: json, table, text (default: text)
  -q, --quiet           Suppress non-essential output
  -v, --verbose         Show detailed output
  -h, --help            Show help for a command
  --version             Show version

${chalk.bold('EXAMPLES')}
  ${chalk.dim('# Create a new document')}
  google-docs-cli doc create "My Document"

  ${chalk.dim('# Insert text')}
  google-docs-cli text insert DOC_ID "Hello World" --at 1

  ${chalk.dim('# Format text')}
  google-docs-cli format bold DOC_ID --from 1 --to 10

${chalk.bold('DOCUMENTATION')}
  Run ${chalk.cyan('google-docs-cli <command> --help')} for detailed help on any command.
  Run ${chalk.cyan('google-docs-cli tutorial quickstart')} to get started.

${chalk.dim('Google Docs API Reference: https://developers.google.com/docs/api')}
`);
}

export default {
  createHelpCommands,
  printMainHelp,
  concepts,
  getConcept,
  listConcepts,
  examples,
  getExamples,
  listExampleCommands,
  formatExamples,
  tutorials,
  getTutorial,
  listTutorials,
  formatTutorial,
};
