/**
 * Command examples for the help system
 */

import chalk from 'chalk';

export interface Example {
  command: string;
  title: string;
  examples: Array<{
    description: string;
    code: string;
    output?: string;
  }>;
}

export const examples: Example[] = [
  {
    command: 'auth',
    title: 'Authentication Examples',
    examples: [
      {
        description: 'Log in with Google OAuth',
        code: 'google-docs-cli auth login',
        output: '✓ Successfully authenticated with Google!\nLogged in as: user@example.com',
      },
      {
        description: 'Check authentication status',
        code: 'google-docs-cli auth status',
        output: 'Authentication Status\n\n✓ Authenticated\n\nAccount: user@example.com\nToken expires: in 45 minutes',
      },
      {
        description: 'Log out (clear tokens)',
        code: 'google-docs-cli auth logout',
      },
      {
        description: 'Log out and remove all credentials',
        code: 'google-docs-cli auth logout --all',
      },
    ],
  },
  {
    command: 'doc',
    title: 'Document Examples',
    examples: [
      {
        description: 'Create a new document',
        code: 'google-docs-cli doc create "Project Proposal"',
        output: '✓ Document created!\n\nProject Proposal (1abc...xyz)\nhttps://docs.google.com/document/d/1abc...xyz/edit',
      },
      {
        description: 'Create and immediately open in browser',
        code: 'google-docs-cli doc create "Meeting Notes" --open',
      },
      {
        description: 'Get document content',
        code: 'google-docs-cli doc get 1abc123xyz',
      },
      {
        description: 'Get document from full URL',
        code: 'google-docs-cli doc get "https://docs.google.com/document/d/1abc123xyz/edit"',
      },
      {
        description: 'Get document info with statistics',
        code: 'google-docs-cli doc info 1abc123xyz',
      },
      {
        description: 'Open document in browser',
        code: 'google-docs-cli doc open 1abc123xyz',
      },
      {
        description: 'Export as PDF',
        code: 'google-docs-cli doc export 1abc123xyz --format pdf --output report.pdf',
      },
      {
        description: 'List document tabs',
        code: 'google-docs-cli doc tabs 1abc123xyz',
      },
      {
        description: 'Read a specific tab',
        code: 'google-docs-cli doc get 1abc123xyz --tab TAB_ID',
      },
      {
        description: 'Get raw API response (for debugging)',
        code: 'google-docs-cli doc get 1abc123xyz --raw',
      },
    ],
  },
  {
    command: 'text',
    title: 'Text Operation Examples',
    examples: [
      {
        description: 'Insert text at the beginning',
        code: 'google-docs-cli text insert DOC_ID "Hello World" --at 1',
      },
      {
        description: 'Append text to the end',
        code: 'google-docs-cli text insert DOC_ID "\\n\\nNew paragraph" --end',
      },
      {
        description: 'Replace all occurrences',
        code: 'google-docs-cli text replace DOC_ID "old term" "new term" --all',
        output: '✓ Replaced 5 occurrences',
      },
      {
        description: 'Case-insensitive replace',
        code: 'google-docs-cli text replace DOC_ID "hello" "Hi" --no-case-sensitive',
      },
      {
        description: 'Delete a range of text',
        code: 'google-docs-cli text delete DOC_ID --from 10 --to 50',
      },
      {
        description: 'Find text with context',
        code: 'google-docs-cli text find DOC_ID "error"',
        output: '[1] ...the application had an error during startup...\n    Index: 45-50',
      },
      {
        description: 'Read entire document',
        code: 'google-docs-cli text read DOC_ID',
      },
      {
        description: 'Read a specific tab',
        code: 'google-docs-cli text read DOC_ID --tab TAB_ID',
      },
      {
        description: 'Search across all tabs',
        code: 'google-docs-cli text find DOC_ID "error" --all-tabs',
      },
      {
        description: 'Read with line numbers',
        code: 'google-docs-cli text read DOC_ID --line-numbers',
      },
      {
        description: 'Read specific range',
        code: 'google-docs-cli text read DOC_ID --from 100 --to 200',
      },
    ],
  },
  {
    command: 'format',
    title: 'Formatting Examples',
    examples: [
      {
        description: 'Make text bold',
        code: 'google-docs-cli format bold DOC_ID --from 1 --to 10',
      },
      {
        description: 'Apply italic',
        code: 'google-docs-cli format italic DOC_ID --from 5 --to 15',
      },
      {
        description: 'Remove bold formatting',
        code: 'google-docs-cli format bold DOC_ID --from 1 --to 10 --remove',
      },
      {
        description: 'Change text color (named color)',
        code: 'google-docs-cli format color DOC_ID red --from 1 --to 10',
      },
      {
        description: 'Change text color (hex)',
        code: 'google-docs-cli format color DOC_ID "#ff5500" --from 1 --to 10',
      },
      {
        description: 'Add background highlight',
        code: 'google-docs-cli format color DOC_ID yellow --from 1 --to 10 --background',
      },
      {
        description: 'Change font family',
        code: 'google-docs-cli format font DOC_ID "Roboto Mono" --from 1 --to 50',
      },
      {
        description: 'Change font size',
        code: 'google-docs-cli format size DOC_ID 14 --from 1 --to 50',
      },
      {
        description: 'Apply heading style',
        code: 'google-docs-cli format heading DOC_ID 1 --from 1 --to 20',
      },
      {
        description: 'Add a hyperlink',
        code: 'google-docs-cli format link DOC_ID "https://example.com" --from 10 --to 25',
      },
    ],
  },
  {
    command: 'table',
    title: 'Table Examples',
    examples: [
      {
        description: 'Create a 3x4 table',
        code: 'google-docs-cli table create DOC_ID 3 4 --at 1',
      },
      {
        description: 'List all tables',
        code: 'google-docs-cli table list DOC_ID',
        output: 'Found 2 tables\n\nTable 0: 3x4 (index 5-120)\nTable 1: 2x3 (index 150-200)',
      },
      {
        description: 'List tables in a specific tab',
        code: 'google-docs-cli table list DOC_ID --tab TAB_ID',
      },
      {
        description: 'Read table content',
        code: 'google-docs-cli table read DOC_ID 0',
      },
      {
        description: 'Insert row after row 2',
        code: 'google-docs-cli table insert-row DOC_ID 0 --after 2',
      },
      {
        description: 'Insert row before row 0 (at top)',
        code: 'google-docs-cli table insert-row DOC_ID 0 --after 0 --before',
      },
      {
        description: 'Insert column after column 1',
        code: 'google-docs-cli table insert-col DOC_ID 0 --after 1',
      },
      {
        description: 'Delete row 3',
        code: 'google-docs-cli table delete-row DOC_ID 0 3',
      },
      {
        description: 'Delete column 2',
        code: 'google-docs-cli table delete-col DOC_ID 0 2',
      },
    ],
  },
  {
    command: 'image',
    title: 'Image Examples',
    examples: [
      {
        description: 'Insert an image',
        code: 'google-docs-cli image insert DOC_ID "https://example.com/image.png" --at 1',
      },
      {
        description: 'Insert with specific dimensions',
        code: 'google-docs-cli image insert DOC_ID "https://example.com/logo.png" --at 1 --width 200 --height 100',
      },
      {
        description: 'List all images',
        code: 'google-docs-cli image list DOC_ID',
      },
    ],
  },
  {
    command: 'structure',
    title: 'Document Structure Examples',
    examples: [
      {
        description: 'Create a header',
        code: 'google-docs-cli structure header create DOC_ID',
        output: '✓ Header created\nHeader ID: kix.abc123',
      },
      {
        description: 'Create header with different first page',
        code: 'google-docs-cli structure header create DOC_ID --first-page-different',
      },
      {
        description: 'Create a footer',
        code: 'google-docs-cli structure footer create DOC_ID',
      },
      {
        description: 'List headers and footers',
        code: 'google-docs-cli structure list DOC_ID',
      },
      {
        description: 'Add text to header',
        code: 'google-docs-cli text insert DOC_ID "Company Name" --at 1 --segment kix.abc123',
      },
      {
        description: 'Insert page break',
        code: 'google-docs-cli structure page-break DOC_ID --at 100',
      },
      {
        description: 'Insert continuous section break',
        code: 'google-docs-cli structure section-break DOC_ID continuous --at 50',
      },
      {
        description: 'Insert next-page section break',
        code: 'google-docs-cli structure section-break DOC_ID next-page --at 50',
      },
      {
        description: 'Delete a header',
        code: 'google-docs-cli structure header delete DOC_ID kix.abc123',
      },
    ],
  },
  {
    command: 'range',
    title: 'Named Range Examples',
    examples: [
      {
        description: 'Create a named range',
        code: 'google-docs-cli range create DOC_ID "customer_name" --from 10 --to 30',
      },
      {
        description: 'List all named ranges',
        code: 'google-docs-cli range list DOC_ID',
      },
      {
        description: 'Get a named range with content',
        code: 'google-docs-cli range get DOC_ID "customer_name"',
      },
      {
        description: 'Update named range content',
        code: 'google-docs-cli range update DOC_ID "customer_name" "John Smith"',
      },
      {
        description: 'Delete a named range',
        code: 'google-docs-cli range delete DOC_ID "customer_name"',
      },
      {
        description: 'Template workflow - create placeholders',
        code: `# Create template ranges
google-docs-cli range create DOC_ID "name" --from 10 --to 20
google-docs-cli range create DOC_ID "date" --from 30 --to 40
google-docs-cli range create DOC_ID "amount" --from 50 --to 60`,
      },
      {
        description: 'Template workflow - fill values',
        code: `# Fill template
google-docs-cli range update DOC_ID "name" "Acme Corp"
google-docs-cli range update DOC_ID "date" "2024-01-15"
google-docs-cli range update DOC_ID "amount" "$1,500.00"`,
      },
    ],
  },
];

export function getExamples(command: string): Example | undefined {
  return examples.find(e => e.command.toLowerCase() === command.toLowerCase());
}

export function listExampleCommands(): string[] {
  return examples.map(e => e.command);
}

export function formatExamples(example: Example): string {
  let output = chalk.bold.underline(example.title) + '\n\n';

  for (const ex of example.examples) {
    output += chalk.cyan('# ' + ex.description) + '\n';
    output += chalk.white(ex.code) + '\n';
    if (ex.output) {
      output += chalk.dim(ex.output.split('\n').map(l => '  ' + l).join('\n')) + '\n';
    }
    output += '\n';
  }

  return output;
}

export default { examples, getExamples, listExampleCommands, formatExamples };
