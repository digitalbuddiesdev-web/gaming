# Correctness & Trust Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every finding from the 2026-11-17 codebase analysis without new features or architecture reversals.

**Architecture:** Keep the existing Next.js server-action + PGlite structure. Money settlements become atomic by locking the round row inside one transaction; authorization reuses one admin-role rule; UI drops claims the backend cannot honor.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, PGlite, node:crypto HMAC.

**Spec:** `docs/superpowers/specs/2026-11-17-correctness-sweep-design.md`

## Global Constraints

- `package.json` must keep `"type": "module"`.
- All money arithmetic stays in Postgres `numeric`; PGlite is the only DB.
- `lib/ledger.ts` `moveIn()` remains the single balance write path.
- No new dependencies.
- No git repo — no commit steps; verify with commands instead.

## Review Focus

- Concurrent cashout of one round must credit at most once.
- `operator_admin` must see the whole operator in reports, matching `canAct()`.
- A draw/lay bet must never be silently booked as option A.
- An abandoned crash round must reach a terminal state without repeated debit.
- Displayed odds must be the odds stored on the market.

---

### Task 1: Atomic simulated-game settlement

**Files:** Modify `lib/simulated-actions.ts`

**Interfaces:** Produces `lockRound(db, roundId, accountId)`; all settlement actions use one transaction handle.

- [x] Add `lockRound(db: Transaction, roundId, accountId)` using `SELECT … FOR UPDATE`.
- [x] Refactor `cashoutCrashRound`, `finalizeCrashLoss`, `revealMinesTile`, `cashoutMinesRound`, `stepTowerTile`, `cashoutTowerRound` so the read, status check, ledger credit and status update all happen inside one `tx()` using `lockRound`.
- [x] Export a testable `settleCrashCashout(viewer, params)` wrapper used by `cashoutCrashRound`.
- [x] Verify with `npm run build`.

### Task 2: Consistent authorization and complete reports

**Files:** Modify `lib/reports.ts`, `lib/actions.ts`

- [x] Change `scopeParams()` so both `super_admin` and `operator_admin` bypass the downline filter.
- [x] Add a `simulated_game_rounds` aggregate to `accountReport()` and fold its net into `pl` and its active stake into `exposure`.
- [x] Allow both admin roles to declare casino and sport results.
- [x] Verify with `npm run check`.

### Task 3: Honest Exchange UI

**Files:** Modify `components/exchange-home.tsx`, `app/play/layout.tsx`

- [x] Remove lay buttons, invented odds fallbacks, fabricated live/TV/f/bm badges, and profit/liability maths.
- [x] Make side "2" use the second market (`m1`) and its real odds.
- [x] Keep the X column visibly unavailable ("—") because no draw market exists.
- [x] Replace the hardcoded ticker with real event names queried in `app/play/layout.tsx`.
- [x] Verify by grepping for `ref-btn-lay`, `calculateLiability`, `lay1` and reading the diff.

### Task 4: Server-authoritative game balances and abandoned rounds

**Files:** Modify `components/{crash,mines,plinko,tower}-game.tsx`, `app/play/crash/page.tsx`, `lib/simulated-actions.ts`

- [x] Remove local balance mutation from all four game components; render `initialBalance` from props and call `router.refresh()` after each successful action.
- [x] Remove the unreachable `handleCrashOut` and `targetCrashPointRef`.
- [x] Add a server-side sweep that finalizes stale active crash rounds on page load.
- [x] Verify with `npm run build`.

### Task 5: Small UI defects

**Files:** `components/player-shell.tsx`, `components/player-header.tsx`, `components/player-sidebar.tsx`, `app/play/sports/page.tsx`, `app/play/games/[slug]/page.tsx`, `app/play/statement/page.tsx`, `app/admin/page.tsx`, `app/admin/reports/users2/page.tsx`

- [x] Fix footer links, inert search, sport filter query param, sidebar active state/counts, duplicate import, `#totals` anchor, admin auth guard, duplicate report column.
- [x] Verify with `npm run build` and targeted greps.

### Task 6: Regression check

**Files:** Modify `scripts/check.mjs`

- [x] Assert `settleCrashCashout` credits once when called twice for the same round.
- [x] Assert `operator_admin` report scope returns all operator accounts.
- [x] Run `npm run check`.

### Task 7: Docs and cruft

**Files:** Docs in `docs/`; scripts moved to `scripts/_archive/`

- [x] Patch stale status claims, add `super_admin` and simulated games, correct data-model details.
- [x] Move one-off scripts and PNG artifacts into `scripts/_archive/`.
- [x] Verify with a final build and grep.

## Execution

Native: implement all tasks in this session, then verify with `npm run build` and `npm run check`.
