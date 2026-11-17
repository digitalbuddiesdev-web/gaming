# Correctness & trust sweep — design

Date: 2026-11-17

## Intent

Resolve every finding from the 2026-11-17 codebase analysis without inventing new
product features or reversing recorded architecture decisions. The app is a points-based
demo book; the fixes must keep balances authoritative, keep the UI honest about what
it actually does, and leave the docs describing reality.

## Goals

1. No simulated-game action can pay out twice, including under concurrent calls.
2. Authorization is consistent: `canAct()`, report scoping, and settlement roles agree.
3. Simulated-game winnings and exposure appear in reports.
4. The Exchange UI never implies a lay bet or an odds choice the backend ignores.
5. Crash rounds cannot be abandoned with a debited stake and no terminal state.
6. UI balances come from the server, not local guesses.
7. The small UI defects (sport filter, draw side, dead links, duplicate column, etc.) are fixed.
8. Docs match the code; throwaway scripts are out of the active `scripts/` directory.

## Non-goals

- No CSRF tokens, rate limiting, MFA, password reset, or payment rails.
- No per-module agent permissions, multi-side markets, or third-party game integration.
- No back/lay liability engine — `decisions.md` deliberately chose a two-sided book.
- No schema migrations beyond what existing idempotent DDL already handles.

## Approaches

- **A — Correctness & trust sweep (chosen).** Bounded to the 11 findings. No new
  features, no architecture reversals.
- **B — A plus internet-facing hardening.** Rejected: needs email/SMS and deployment
  decisions the user has not made.
- **C — A plus a real exchange backend.** Rejected: reverses the recorded two-sided
  book decision and is the largest change by far.

## Decisions

- **Backend status guards, not client flags.** Each simulated-game settlement locks the
  round row with `SELECT … FOR UPDATE` inside one transaction and all reads/writes use
  that transaction's handle. A second caller sees the settled status and cannot credit.
- **Remove the cosmetic lay UI rather than build lay betting.** Keep selection A/B,
  real stored odds, and the working stake form. Delete the lay price column, liability
  maths, odds input, and back/lay badges from `ExchangeHome`.
- **Fixed crash abandonment at the source.** Wire the existing `finalizeCrashLoss`
  into the round lifecycle so a round that is never cashed out reaches a terminal state;
  remove the unreachable ref if it cannot be used.
- **Server is the only balance source.** Game components call `router.refresh()` after
  each server action and stop debiting/crediting local state; balances are rendered
  from the DB on every refresh.
- **Docs are corrected, not rewritten.** Patch the specific stale claims and add the
  missing simulated-games, `super_admin`, and sports/report sections.
- **Scripts are archived, not deleted.** This directory is not a git repo, so the
  one-off scripts and PNG artifacts move to `scripts/_archive/` instead of being removed.

## Work items

1. `lib/simulated-actions.ts` — lock-and-settle helper; refactor crash/mines/tower
   cashouts and mines/tower progressive steps to use it.
2. `lib/reports.ts` — include `super_admin` and `operator_admin` in scope; fold
   simulated rounds into P/L and exposure.
3. `lib/actions.ts` — allow both admin roles to declare casino/sport results.
4. `components/exchange-home.tsx` — strip lay/odds pretense and fix the draw side.
5. Crash/mining/plinko/tower game components — server-authoritative balance refresh;
   wire crash finalization.
6. Small UI fixes in `player-shell`, `player-header`, `player-sidebar`,
   `play/layout`, `play/sports/page`, `play/games/[slug]`, `admin/page`,
   `admin/reports/users2`.
7. `scripts/check.mjs` — regression check for double settlement and report scope.
8. Docs: README, architecture, data-model, roadmap, decisions, roles-and-permissions,
   admin-guide.
9. Archive one-off scripts and artifacts into `scripts/_archive/`.

## Verification

- `npm run build` and `npm run check` must pass.
- Grep for leftover lay/odds submit fields and local balance mutation.
- Manual browser pass over `/play`, `/play/sports`, `/play/crash`, `/admin/reports/*`.

## What is left to the builder

Exact file edits, the regression assertion shape, and whether the browser pass is
feasible in this environment.
