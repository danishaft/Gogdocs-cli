/**
 * Concept explanations for the help system
 */

import chalk from 'chalk';

export interface Concept {
  name: string;
  title: string;
  content: string;
}

export const concepts: Concept[] = [
  {
    name: 'indexes',
    title: 'Document Indexes',
    content: `
${chalk.bold('Understanding Document Indexes')}

Google Docs uses a 1-based indexing system to identify positions within a document.

${chalk.cyan('How Indexes Work:')}
• Index 1 is the start of the document (after the initial structural element)
• Each character, including newlines, occupies one index position
• Structural elements (paragraphs, tables) also occupy index positions

${chalk.cyan('Finding Indexes:')}
  ${chalk.dim('# Use the find command to locate text positions')}
  google-docs-cli text find DOC_ID "search term"

  ${chalk.dim('# Read with line numbers to estimate positions')}
  google-docs-cli text read DOC_ID --line-numbers

${chalk.cyan('Index Ranges:')}
• Ranges are specified as [startIndex, endIndex)
• The startIndex is inclusive
• The endIndex is exclusive
• Example: range 1-5 includes characters at positions 1, 2, 3, 4

${chalk.cyan('Special Cases:')}
• Use --end flag to append to the document
• Headers, footers, and footnotes have separate index spaces (segments)
• Use --segment <id> to work with these areas

${chalk.cyan('Example:')}
  Document: "Hello World"

  Position:  1 2 3 4 5 6 7 8 9 10 11
  Character: H e l l o   W o r l  d

  To make "World" bold:
  google-docs-cli format bold DOC_ID --from 7 --to 12
`,
  },
  {
    name: 'ranges',
    title: 'Named Ranges',
    content: `
${chalk.bold('Understanding Named Ranges')}

Named ranges are user-defined labels that mark specific text regions in a document.
They're powerful for templating and programmatic document manipulation.

${chalk.cyan('Use Cases:')}
• Document templates with placeholder values
• Programmatic content updates
• Tracking specific sections for later modification

${chalk.cyan('Creating Named Ranges:')}
  ${chalk.dim('# Create a named range spanning indexes 10-25')}
  google-docs-cli range create DOC_ID "customer_name" --from 10 --to 25

${chalk.cyan('Template Workflow:')}
  1. Create a document with placeholder text
  2. Define named ranges for each placeholder
  3. Use "range update" to fill in values

  ${chalk.dim('# Example: Invoice template')}
  google-docs-cli range create DOC_ID "invoice_number" --from 15 --to 25
  google-docs-cli range create DOC_ID "customer_name" --from 40 --to 60
  google-docs-cli range create DOC_ID "total_amount" --from 100 --to 115

  ${chalk.dim('# Fill in the template')}
  google-docs-cli range update DOC_ID "invoice_number" "INV-2024-001"
  google-docs-cli range update DOC_ID "customer_name" "Acme Corporation"
  google-docs-cli range update DOC_ID "total_amount" "$1,500.00"

${chalk.cyan('Important Notes:')}
• Named ranges survive document edits (indexes adjust automatically)
• Deleting a named range doesn't delete the text content
• Multiple ranges can have the same name (for discontinuous selections)
• Range names are case-sensitive
`,
  },
  {
    name: 'formatting',
    title: 'Text Formatting',
    content: `
${chalk.bold('Text Formatting in Google Docs')}

The API supports two types of formatting: character formatting and paragraph formatting.

${chalk.cyan('Character Formatting:')}
These apply to specific text ranges:
• Bold, Italic, Underline, Strikethrough
• Font family and size
• Text color (foreground and background)
• Hyperlinks

  ${chalk.dim('# Apply bold')}
  google-docs-cli format bold DOC_ID --from 1 --to 10

  ${chalk.dim('# Change color')}
  google-docs-cli format color DOC_ID "#ff5500" --from 1 --to 10

  ${chalk.dim('# Add a link')}
  google-docs-cli format link DOC_ID "https://example.com" --from 1 --to 10

${chalk.cyan('Paragraph Formatting:')}
These apply to entire paragraphs:
• Heading styles (Heading 1-6, Title, Subtitle)
• Normal text

  ${chalk.dim('# Make text a heading')}
  google-docs-cli format heading DOC_ID 1 --from 1 --to 20

${chalk.cyan('Color Formats:')}
• Named: red, blue, green, yellow, purple, cyan, magenta, etc.
• Hex: #ff0000, #00ff00, #0000ff
• RGB: rgb(255, 0, 0)

${chalk.cyan('Available Fonts:')}
Any Google Fonts font can be used. Common choices:
• Arial, Roboto, Open Sans
• Times New Roman, Georgia
• Courier New, Roboto Mono

${chalk.cyan('Formatting Inheritance:')}
• Unset properties inherit from the paragraph style
• Paragraph styles inherit from the document default
`,
  },
  {
    name: 'tables',
    title: 'Tables',
    content: `
${chalk.bold('Working with Tables')}

Tables in Google Docs are structured as rows and columns of cells.

${chalk.cyan('Table Indexing:')}
• Tables are numbered starting from 0
• Rows and columns are also 0-indexed
• The first table in a document is table 0

${chalk.cyan('Creating Tables:')}
  ${chalk.dim('# Create a 3-row, 4-column table')}
  google-docs-cli table create DOC_ID 3 4 --at 1

${chalk.cyan('Listing Tables:')}
  ${chalk.dim('# See all tables with their indexes')}
  google-docs-cli table list DOC_ID

  Output shows:
  • Table index (0, 1, 2...)
  • Dimensions (rows x columns)
  • Document position (start-end indexes)

${chalk.cyan('Reading Table Content:')}
  ${chalk.dim('# Read content of table 0')}
  google-docs-cli table read DOC_ID 0

${chalk.cyan('Modifying Structure:')}
  ${chalk.dim('# Add a row after row 2')}
  google-docs-cli table insert-row DOC_ID 0 --after 2

  ${chalk.dim('# Add a column before column 1')}
  google-docs-cli table insert-col DOC_ID 0 --after 0 --before

  ${chalk.dim('# Delete row 3')}
  google-docs-cli table delete-row DOC_ID 0 3

${chalk.cyan('Cell Content:')}
To modify cell content, you need to:
1. Find the cell's index using "google-docs-cli doc get DOC_ID --raw"
2. Use text commands with the cell's index

${chalk.cyan('Limitations:')}
• Cannot directly address cells by row/column
• Cell styling requires raw API access
• Merged cells have special handling
`,
  },
  {
    name: 'segments',
    title: 'Document Segments',
    content: `
${chalk.bold('Document Segments')}

A Google Doc consists of multiple segments, each with its own index space.

${chalk.cyan('Segment Types:')}
• ${chalk.bold('Body')}: The main document content (default)
• ${chalk.bold('Headers')}: Top of page content
• ${chalk.bold('Footers')}: Bottom of page content
• ${chalk.bold('Footnotes')}: Footnote content areas

${chalk.cyan('Working with Segments:')}
Each segment has its own index numbering starting from 1.
Use the --segment flag to target non-body segments.

  ${chalk.dim('# Create a header')}
  google-docs-cli structure header create DOC_ID

  ${chalk.dim('# Add text to the header (using header ID)')}
  google-docs-cli text insert DOC_ID "Page Header" --at 1 --segment kix.abc123

  ${chalk.dim('# List headers and footers')}
  google-docs-cli structure list DOC_ID

${chalk.cyan('Finding Segment IDs:')}
  ${chalk.dim('# Get full document structure')}
  google-docs-cli doc get DOC_ID --raw --format json | jq '.headers'

${chalk.cyan('Header Types:')}
• DEFAULT: Regular header for all pages
• FIRST: Different header for first page only

  ${chalk.dim('# Create with different first page')}
  google-docs-cli structure header create DOC_ID --first-page-different
`,
  },
  {
    name: 'auth',
    title: 'Authentication',
    content: `
${chalk.bold('Authentication with Google')}

google-docs-cli uses OAuth 2.0 to authenticate with your Google account.

${chalk.cyan('Initial Setup:')}
1. Go to ${chalk.underline('https://console.cloud.google.com/')}
2. Create a new project or select existing
3. Enable the "Google Docs API"
4. Go to APIs & Services > Credentials
5. Create OAuth 2.0 Client ID (Desktop application)
6. Download the JSON credentials file
7. Save as ~/.google-docs-cli/credentials.json

${chalk.cyan('Login Flow:')}
  ${chalk.dim('# Start the OAuth flow')}
  google-docs-cli auth login

  This will:
  1. Open your browser to Google's consent screen
  2. Ask you to authorize google-docs-cli
  3. Store the access token locally

${chalk.cyan('Token Storage:')}
• Tokens are stored in ~/.google-docs-cli/token.json
• Access tokens expire after 1 hour
• Refresh tokens are used to get new access tokens automatically

${chalk.cyan('Security Notes:')}
• Credentials are stored with 600 permissions (owner-only)
• Never share your credentials.json or token.json
• Use "google-docs-cli auth logout" to clear stored tokens

${chalk.cyan('Scopes:')}
google-docs-cli requests these permissions:
• ${chalk.dim('documents')} - Read and write Google Docs
• ${chalk.dim('drive.file')} - Access files created by the app
`,
  },
  {
    name: 'batching',
    title: 'Batch Operations',
    content: `
${chalk.bold('Batch Operations')}

The Google Docs API uses a batch update model where multiple operations
can be applied atomically in a single request.

${chalk.cyan('How It Works:')}
• All modifications go through a single "batchUpdate" endpoint
• Operations are applied in order
• If any operation fails, all are rolled back

${chalk.cyan('CLI Behavior:')}
Each CLI command typically makes one batch request.
For efficiency, you can:

1. ${chalk.bold('Use replace-all for bulk changes:')}
   ${chalk.dim('# Replace all occurrences at once')}
   google-docs-cli text replace DOC_ID "old" "new" --all

2. ${chalk.bold('Script multiple commands:')}
   ${chalk.dim('# Bash script for multiple operations')}
   #!/bin/bash
   DOC_ID="your-doc-id"
   google-docs-cli text insert $DOC_ID "Title" --at 1
   google-docs-cli format heading $DOC_ID 1 --from 1 --to 6
   google-docs-cli text insert $DOC_ID "\\n\\nContent here" --end

3. ${chalk.bold('Use named ranges for templating:')}
   ${chalk.dim('# Update multiple placeholders')}
   for field in name date amount; do
     google-docs-cli range update $DOC_ID "$field" "$(get_value $field)"
   done

${chalk.cyan('Performance Tips:')}
• Minimize API calls by combining operations where possible
• Use --format json for scripting to parse output
• Consider caching document IDs in environment variables
`,
  },
];

export function getConcept(name: string): Concept | undefined {
  return concepts.find(c => c.name.toLowerCase() === name.toLowerCase());
}

export function listConcepts(): string[] {
  return concepts.map(c => c.name);
}

export default { concepts, getConcept, listConcepts };
