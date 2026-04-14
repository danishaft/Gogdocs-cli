# GoDocs CLI integration notes

This folder contains the Catharis `google-docs-cli` workspace. Use this note to
record Catharis-specific observations, shortcuts, or follow-up items that do
not belong in the main README.

## Key touchpoints
- `README.md` explains the CLI commands, OAuth workflow, and local config
  paths.
- `INTEGRATION.md`, `TOOL.md`, and `Desktop/Yard/tools/README.md` describe how
  Catharis agents should consume this repo alongside Peruz.

## Suggested notes to keep here
1. Document any local patches or wrappers we apply, such as credential helpers
   or agent scripts.
2. Record OAuth client IDs, scopes, or references to the Google Cloud project
   we are using.
3. Capture any command sequences that proved valuable for real agent flows, for
   example `google-docs-cli doc export` or `google-docs-cli text replace`.
