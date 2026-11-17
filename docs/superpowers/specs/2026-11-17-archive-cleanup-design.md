# Archive Cleanup — Build Ignore Files — Design

Date: 2026-11-17
Status: Approved

## Intent
Keep `scripts/_archive/` (36 deprecated files) out of production bundles without deleting history.

## Finding
No `.npmignore`, `.dockerignore`, or `Dockerfile` exists. `.gitignore` already covers `.next/`, `.data/`, `.git`-adjacent artifacts, `.env*`, `node_modules/`, and `output/`.

## Goals
- Add `.npmignore` and `.dockerignore` that exclude `scripts/_archive/` plus the same local artifacts.
- Keep all files in place; zero runtime behaviour change.

## Non-goals
- No deletion or move of archive files, no repo restructure, no new Dockerfile.

## Design
Both new files contain:
```
scripts/_archive/
.data/
.next/
.git/
.env*
node_modules/
output/
*.log
.superpowers/
.playwright-cli/
.playwright-mcp/
tsconfig.tsbuildinfo
```

## Verification
- `npm pack --dry-run --json` output contains no `scripts/_archive/` entry.
- `npm run build` passes and `npm run check` passes.
