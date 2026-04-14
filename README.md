# google-docs-cli

`google-docs-cli` lets you create, edit, format, and export Google Docs from
your terminal.

## Features

- **Document Management**: Create, retrieve, and open Google Docs
- **Exports**: Export documents to Markdown, PDF, Docx, and more
- **Text Operations**: Insert, delete, find, and replace text
- **Formatting**: Bold, italic, underline, colors, fonts, headings, links
- **Tables**: Create, read, and modify table structure and content
- **Images**: Insert inline images from URLs
- **Structure**: Page breaks, section breaks, headers, footers
- **Named Ranges**: Create template placeholders for programmatic updates
- **Tabs**: List and read tabbed documents

## Installation

Install the package globally to make the `google-docs-cli` command available on
your system.

```bash
npm install -g google-docs-cli
```

Requires Node.js 18+.

## Quick Start

### 1. Set Up Google Cloud Credentials

You need your own Google Cloud OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable **Google Docs API** and **Google Drive API**
4. Create OAuth 2.0 credentials (Desktop app type)
5. Download the JSON and save as `~/.google-docs-cli/credentials.json`

### 2. Authenticate

```bash
google-docs-cli auth login
```

This opens your browser for Google sign-in.

If you already used the old `gdocs` setup, `google-docs-cli` automatically
moves config files from `~/.gdocs/` to `~/.google-docs-cli/` the first time you
run it.

If you upgrade and need new scopes (like Drive export), run:
```bash
google-docs-cli auth logout --all
google-docs-cli auth login
```

### 3. Start Using

```bash
# Create a document
google-docs-cli doc create "My Document"

# Set as default working document
google-docs-cli use DOC_ID

# Add content
google-docs-cli text insert "Hello World" --at 1
google-docs-cli format bold --from 1 --to 5
```

## Usage Examples

```bash
# Create and edit
google-docs-cli doc create "Meeting Notes" --open
google-docs-cli text insert "Agenda\n\n1. Introductions" --at 1
google-docs-cli format heading 1 --from 1 --to 6

# Find and replace
google-docs-cli text find DOC_ID "TODO"
google-docs-cli text replace DOC_ID "TODO" "DONE" --all

# Tables
google-docs-cli table create DOC_ID 3 4 --at 1
google-docs-cli table set-cell DOC_ID 0 --row 0 --col 0 "Header"

# Formatting
google-docs-cli format color DOC_ID red --from 1 --to 10
google-docs-cli format font DOC_ID "Roboto Mono" --from 1 --to 50

# Templates with named ranges
google-docs-cli range create DOC_ID "customer" --from 10 --to 20
google-docs-cli range update DOC_ID "customer" "Acme Corp"

# Export
google-docs-cli doc export DOC_ID --format pdf --output report.pdf

# Tabs
google-docs-cli doc tabs DOC_ID
google-docs-cli text read DOC_ID --tab TAB_ID
```

## Command Reference

Run `google-docs-cli --help` or `google-docs-cli <command> --help` for detailed usage.

| Command | Description |
|---------|-------------|
| `auth login/logout/status` | Manage authentication |
| `doc create/get/info/open/export/tabs` | Document operations |
| `use` | Set default working document |
| `text insert/read/find/replace/delete` | Text manipulation |
| `format bold/italic/color/font/size/heading/link` | Apply formatting |
| `table create/list/read/set-cell/insert-row/insert-col` | Table operations |
| `image insert/list` | Image insertion |
| `structure page-break/section-break/header/footer` | Document structure |
| `range create/list/get/update/delete` | Named ranges |

## Configuration

`google-docs-cli` stores credentials, session state, and preferences in a
single config directory.

All config files are stored in `~/.google-docs-cli/`:

| File | Purpose |
|------|---------|
| `credentials.json` | OAuth client credentials (you provide) |
| `token.json` | Access tokens (generated on login) |
| `session.json` | Current working document |
| `google-docs-cli-config.json` | User preferences |

## License

MIT
