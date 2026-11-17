# Archive Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exclude `scripts/_archive/` and local artifacts from npm/Docker bundles without deleting any files.

**Architecture:** Two new ignore files at the repo root, mirroring the existing `.gitignore` plus `scripts/_archive/`.

**Tech Stack:** Plain text ignore files.

**Spec:** `docs/superpowers/specs/2026-11-17-archive-cleanup-design.md`

## Global Constraints
- Do not delete, move, or rename any file under `scripts/_archive/`.
- Ignore list exactly: `scripts/_archive/`, `.data/`, `.next/`, `.git/`, `.env*`, `node_modules/`, `output/`, `*.log`, `.superpowers/`, `.playwright-cli/`, `.playwright-mcp/`, `tsconfig.tsbuildinfo`.
- Do not commit; the working tree already contains earlier uncommitted work.

## Review Focus
- Secrets leaking into a package → `.env*` present in both files. Test: `npm pack --dry-run --json` contains no `.env`.
- Archive shipping to production → `scripts/_archive/` present in both files. Test: same pack output has no `_archive` entry.
- Legit source accidentally excluded → no broad patterns like `scripts/`. Test: pack output still contains `lib/db.ts` and `app/`.

---

### Task 1: Add ignore files

**Files:**
- Create: `.npmignore`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: existing `.gitignore` list.
- Produces: nothing consumed by code.

- [ ] **Step 1:** Create both files with the twelve ignore entries from Global Constraints, one per line.

- [ ] **Step 2:** Run `npm pack --dry-run --json` and assert the file list has no `scripts/_archive/`, no `.env`, and still includes `lib/db.ts`.

### Task 2: Verify

- [ ] **Step 1:** `npm run check` → PASS.
- [ ] **Step 2:** `npm run build` → PASS.
