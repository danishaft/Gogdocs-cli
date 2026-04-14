# GoDocs CLI (Google Docs automation)

- **Purpose:** Provide `google-docs-cli` alongside Peruz so agents can script
  Google Docs without a browser.
- **Location:** `/home/ayodele/Desktop/catharis/active/google-docs-cli`
- **Quick checklist for use:**
  1. Run `npm install` inside the repo, then any agent can run
     `npx google-docs-cli --help` or `google-docs-cli <command>`.
  2. Place your OAuth client at `~/.google-docs-cli/credentials.json`
     (Google Docs + Drive APIs) and run `google-docs-cli auth login` to mint
     tokens in `~/.google-docs-cli/`.
  3. Use the local `README.md` for command reference and keep
     `INTEGRATION.md` and `Desktop/Yard/tools/README.md` in sync when you add
     new shortcuts or wrappers.
- **Reference:** See `Desktop/Yard/tools/README.md`’s GoDocs CLI entry for the
  shared registry, plus `README.md` inside this repo.
