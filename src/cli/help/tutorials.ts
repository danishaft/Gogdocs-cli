/**
 * Interactive tutorials for the help system
 */

import chalk from 'chalk';

export interface Tutorial {
  name: string;
  title: string;
  description: string;
  steps: Array<{
    title: string;
    content: string;
    command?: string;
  }>;
}

export const tutorials: Tutorial[] = [
  {
    name: 'quickstart',
    title: 'Quick Start Guide',
    description: 'Get started with google-docs-cli in 5 minutes',
    steps: [
      {
        title: 'Step 1: Set Up Authentication',
        content: `Before using google-docs-cli, you need to set up OAuth credentials.

1. Go to ${chalk.cyan('https://console.cloud.google.com/')}
2. Create a new project (or select an existing one)
3. Search for "Google Docs API" and enable it
4. Go to "APIs & Services" > "Credentials"
5. Click "Create Credentials" > "OAuth client ID"
6. Choose "Desktop app" as the application type
7. Download the JSON file
8. Save it as: ${chalk.yellow('~/.google-docs-cli/credentials.json')}`,
      },
      {
        title: 'Step 2: Log In',
        content: `Run the login command to authenticate with Google.
This will open your browser for the OAuth consent flow.`,
        command: 'google-docs-cli auth login',
      },
      {
        title: 'Step 3: Create Your First Document',
        content: `Let's create a new Google Doc.`,
        command: 'google-docs-cli doc create "My First Document" --open',
      },
      {
        title: 'Step 4: Add Some Content',
        content: `Insert text into your document.
Replace DOC_ID with your actual document ID from step 3.`,
        command: 'google-docs-cli text insert DOC_ID "Hello, World!" --at 1',
      },
      {
        title: 'Step 5: Format the Text',
        content: `Make the text bold and larger.`,
        command: `google-docs-cli format bold DOC_ID --from 1 --to 14
google-docs-cli format size DOC_ID 24 --from 1 --to 14`,
      },
      {
        title: 'Step 6: View Your Document',
        content: `Read back the content to verify your changes.`,
        command: 'google-docs-cli text read DOC_ID',
      },
      {
        title: 'Congratulations!',
        content: `You've created and formatted your first document with google-docs-cli!

${chalk.bold('Next Steps:')}
• Run ${chalk.cyan('google-docs-cli help')} to see all available commands
• Run ${chalk.cyan('google-docs-cli examples <command>')} for more examples
• Run ${chalk.cyan('google-docs-cli concepts <topic>')} to learn key concepts`,
      },
    ],
  },
  {
    name: 'templating',
    title: 'Document Templating',
    description: 'Learn to create and use document templates with named ranges',
    steps: [
      {
        title: 'Introduction',
        content: `Named ranges are perfect for creating reusable document templates.
You can create a document once, define placeholders, and fill them programmatically.

${chalk.bold('Use Cases:')}
• Invoices and receipts
• Contracts and agreements
• Form letters
• Reports with dynamic data`,
      },
      {
        title: 'Step 1: Create a Template Document',
        content: `First, create a document with placeholder text.`,
        command: 'google-docs-cli doc create "Invoice Template" --open',
      },
      {
        title: 'Step 2: Add Placeholder Text',
        content: `Add the template structure. We'll use bracketed placeholders for clarity.`,
        command: `google-docs-cli text insert DOC_ID "Invoice #[INVOICE_NUMBER]

Date: [DATE]
Customer: [CUSTOMER_NAME]

Total: [AMOUNT]" --at 1`,
      },
      {
        title: 'Step 3: Find Placeholder Positions',
        content: `Use find to locate each placeholder's position.`,
        command: 'google-docs-cli text find DOC_ID "[INVOICE_NUMBER]"',
      },
      {
        title: 'Step 4: Create Named Ranges',
        content: `Create a named range for each placeholder.
Use the indexes from the find command.`,
        command: `google-docs-cli range create DOC_ID "invoice_number" --from 10 --to 26
google-docs-cli range create DOC_ID "date" --from 35 --to 41
google-docs-cli range create DOC_ID "customer_name" --from 55 --to 70
google-docs-cli range create DOC_ID "amount" --from 82 --to 90`,
      },
      {
        title: 'Step 5: Fill the Template',
        content: `Now you can fill in the template with real data!`,
        command: `google-docs-cli range update DOC_ID "invoice_number" "INV-2024-001"
google-docs-cli range update DOC_ID "date" "January 15, 2024"
google-docs-cli range update DOC_ID "customer_name" "Acme Corporation"
google-docs-cli range update DOC_ID "amount" "$1,500.00"`,
      },
      {
        title: 'Automating with Scripts',
        content: `You can automate this with a bash script:

${chalk.dim(`#!/bin/bash
DOC_ID="your-template-id"

# Read data from a file or database
INVOICE_NUM="INV-2024-002"
DATE=$(date +"%B %d, %Y")
CUSTOMER="Widget Inc"
AMOUNT="$2,350.00"

# Fill template
google-docs-cli range update $DOC_ID "invoice_number" "$INVOICE_NUM"
google-docs-cli range update $DOC_ID "date" "$DATE"
google-docs-cli range update $DOC_ID "customer_name" "$CUSTOMER"
google-docs-cli range update $DOC_ID "amount" "$AMOUNT"

echo "Invoice generated!"
google-docs-cli doc open $DOC_ID`)}`,
      },
    ],
  },
  {
    name: 'automation',
    title: 'Document Automation',
    description: 'Automate document workflows with scripts',
    steps: [
      {
        title: 'Introduction',
        content: `google-docs-cli is designed for automation. Use it in scripts to:
• Generate reports automatically
• Process batch documents
• Integrate with other tools
• Create CI/CD documentation workflows`,
      },
      {
        title: 'JSON Output for Scripting',
        content: `Use --format json to get machine-readable output.`,
        command: `google-docs-cli doc create "Test" --format json
# Output: {"documentId":"1abc...","title":"Test","url":"..."}`,
      },
      {
        title: 'Parsing with jq',
        content: `Combine with jq for powerful scripting.`,
        command: `DOC_ID=$(google-docs-cli doc create "Report" --format json | jq -r '.documentId')
echo "Created document: $DOC_ID"`,
      },
      {
        title: 'Environment Variables',
        content: `Store commonly used document IDs in environment variables.`,
        command: `export REPORT_DOC="1abc123xyz"
google-docs-cli text read $REPORT_DOC`,
      },
      {
        title: 'Batch Processing',
        content: `Process multiple documents in a loop.

${chalk.dim(`#!/bin/bash
# Update copyright year in multiple documents
NEW_YEAR="2024"

for doc_id in doc1 doc2 doc3; do
  google-docs-cli text replace "$doc_id" "2023" "$NEW_YEAR" --all
  echo "Updated $doc_id"
done`)}`,
      },
      {
        title: 'Error Handling',
        content: `Check exit codes for robust scripts.

${chalk.dim(`#!/bin/bash
set -e  # Exit on error

if ! google-docs-cli auth status --format json | jq -e '.authenticated' > /dev/null; then
  echo "Not authenticated. Please run: google-docs-cli auth login"
  exit 1
fi

# Continue with document operations...`)}`,
      },
      {
        title: 'Quiet Mode',
        content: `Use --quiet to suppress non-essential output in scripts.`,
        command: 'google-docs-cli text insert $DOC_ID "Content" --end --quiet',
      },
    ],
  },
  {
    name: 'formatting',
    title: 'Advanced Formatting',
    description: 'Master text formatting techniques',
    steps: [
      {
        title: 'Introduction',
        content: `Learn advanced formatting techniques to create professional documents.`,
      },
      {
        title: 'Combining Styles',
        content: `Apply multiple styles to the same text range.`,
        command: `# Make text bold AND italic
google-docs-cli format bold DOC_ID --from 1 --to 20
google-docs-cli format italic DOC_ID --from 1 --to 20`,
      },
      {
        title: 'Heading Hierarchy',
        content: `Create a proper document structure with headings.`,
        command: `# Title
google-docs-cli format heading DOC_ID title --from 1 --to 15

# Section headings
google-docs-cli format heading DOC_ID 1 --from 20 --to 40
google-docs-cli format heading DOC_ID 2 --from 100 --to 120`,
      },
      {
        title: 'Color Schemes',
        content: `Use consistent colors for a professional look.

${chalk.bold('Common Color Uses:')}
• ${chalk.red('Red')} (#cc0000) - Errors, warnings
• ${chalk.green('Green')} (#00aa00) - Success, positive
• ${chalk.blue('Blue')} (#0066cc) - Links, info
• ${chalk.gray('Gray')} (#666666) - Secondary text`,
        command: `# Error text
google-docs-cli format color DOC_ID "#cc0000" --from 50 --to 70

# Success text
google-docs-cli format color DOC_ID "#00aa00" --from 80 --to 100`,
      },
      {
        title: 'Removing Formatting',
        content: `Remove formatting using the --remove flag.`,
        command: `# Remove bold
google-docs-cli format bold DOC_ID --from 1 --to 20 --remove

# Reset to normal text
google-docs-cli format heading DOC_ID 0 --from 1 --to 50`,
      },
      {
        title: 'Code Formatting',
        content: `Format code snippets with monospace font.`,
        command: `google-docs-cli format font DOC_ID "Roboto Mono" --from 100 --to 200
google-docs-cli format color DOC_ID "#666666" --from 100 --to 200 --background`,
      },
    ],
  },
];

export function getTutorial(name: string): Tutorial | undefined {
  return tutorials.find(t => t.name.toLowerCase() === name.toLowerCase());
}

export function listTutorials(): Array<{ name: string; title: string; description: string }> {
  return tutorials.map(t => ({
    name: t.name,
    title: t.title,
    description: t.description,
  }));
}

export function formatTutorial(tutorial: Tutorial): string {
  let output = '';

  output += chalk.bold.underline(tutorial.title) + '\n';
  output += chalk.dim(tutorial.description) + '\n\n';

  for (let i = 0; i < tutorial.steps.length; i++) {
    const step = tutorial.steps[i];
    output += chalk.bold.cyan(step.title) + '\n';
    output += step.content + '\n';

    if (step.command) {
      output += '\n' + chalk.bgGray.white(' Command: ') + '\n';
      output += chalk.yellow('  ' + step.command.split('\n').join('\n  ')) + '\n';
    }

    output += '\n' + chalk.dim('─'.repeat(50)) + '\n\n';
  }

  return output;
}

export default { tutorials, getTutorial, listTutorials, formatTutorial };
