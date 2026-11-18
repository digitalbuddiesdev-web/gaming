# Responsive Games + Roulette Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the five new casino games usable at 320/375/768/1440px and turn roulette into a polished classic-felt table without touching game logic.

**Architecture:** All visual work lands in the single existing `app/globals.css`; the new components only need their undefined `sim-*` class names defined once and a few wrappers. A small static UI-contract section in `scripts/check.mjs` provides the red/green test cycle for CSS; `npm run build` is the second gate.

**Tech Stack:** Next.js 16.4.6, plain CSS, existing `scripts/check.mjs` harness.

**Spec:** `docs/superpowers/specs/2026-11-18-game-responsive-redesign-design.md`

## Global Constraints

- Plain CSS in `app/globals.css` only. No Tailwind, no CSS-in-JS, no new dependencies.
- No changes to settlement, ledger, roles, reports, auth, DB, schema or config. No new dependencies.
- Keep the direct Postgres `DATABASE_URL` + PGlite fallback untouched; `npm run check` stays in-memory and never contacts Supabase.
- Preserve the existing 3.4s wheel spin and counter-spinning ball animation.
- Preserve the green-felt + brass identity (allpanel9 is a structural reference only, not branding).
- Breakpoint targets: 320, 375, 768, 1440px.
- **Do not commit or push.** The working tree already contains the user's uncommitted game work and the approved Critical fixes; the user commits.

## Review Focus

1. **320px phone with the roulette wheel** — expect the whole wheel visible, not clipped. Task 3 test asserts a fluid `--wheel` custom property and no fixed 320px stage/ring/rotor values.
2. **Phone with a long rules/audit modal** — expect a fixed backdrop and a scrollable dialog. Task 1 test asserts `sim-modal-overlay/dialog/head` are defined with `max-height` + `overflow-y`.
3. **Phone with the 12-column felt** — expect readable, tappable cells via horizontal scroll rather than 14px cells. Task 4 test asserts a `min-width` + `overflow-x: auto` rule in a max-width media query.
4. **Baccarat/dragon-tiger/blackjack at ≤600px** — expect stacked arenas and a 2-column action grid. Task 5 test asserts those selectors appear in a new media block after the current last one.
5. **Undefined `sim-*` classes generally** — expect every used class to have CSS. Task 1 test asserts all names listed in the spec exist in `globals.css`.

---

### Task 1: UI contract test (RED)

**Files:**
- Modify: `scripts/check.mjs`
- Test: `npm run check`

**Interfaces:**
- Consumes: nothing.
- Produces: a `checkUiContract()` assertion that later tasks turn green.

- [x] **Step 1: Add the failing UI-contract assertion**

```js
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
for (const cls of ["sim-modal-overlay", "sim-modal-dialog", "sim-modal-head",
                   "sim-header-titles", "sim-game-badge", "sim-game-name",
                   "sim-history-table-wrapper", "sim-audit-v", "sim-actions-stack"]) {
  assert(css.includes(`.${cls}`), `${cls} must be styled in globals.css`);
}
```

Also assert: a `max-height` and `overflow-y` rule exists for the modal dialog; at least one `@media (max-width: ...)` block appears after the current final one; `--wheel` appears in the roulette CSS; `roulette-felt-grid` appears with `overflow-x` inside a media query; the four game selectors in Review Focus 4 appear in a media query.

- [x] **Step 2: Run `npm run check` and confirm it fails with the missing-class message**

Expected: FAIL naming the first undefined class.

### Task 2: Shared shell classes and wrapping

**Files:**
- Modify: `app/globals.css` (shared `sim-*` section)

**Interfaces:**
- Consumes: class names from Task 1.
- Produces: styled shared shell for all five games.

- [x] **Step 1: Define the missing shell classes**

Add `.sim-header-titles`, `.sim-game-badge`, `.sim-game-name`, `.sim-game-sub`, `.sim-actions-stack`, `.sim-history-section/title/table-wrapper`, `.sim-audit-row/k/v`, plus aliases `.sim-modal-overlay` → backdrop behaviour and `.sim-modal-dialog` / `.sim-modal-head` → existing dialog/header behaviour. Use `clamp()` for header type, `max-height: 90dvh; overflow-y: auto` for dialogs, `overflow-x: auto` for history tables, `overflow-wrap: anywhere` for audit hashes.

- [x] **Step 2: Make the non-wrapping rows adapt**

Add `flex-wrap: wrap; min-width: 0` to `.sim-meta-chips`, `.bj-chips-rack`, `.card-games-tab-bar`, `.slot-auto-spin-row`; retarget the 640px `.sim-header-actions` rule at `.sim-meta-chips`.

- [x] **Step 3: Run `npm run check`**

Expected: PASS for the Task 1 shell assertions; still failing wheel/media assertions.

### Task 3: Fluid roulette wheel

**Files:**
- Modify: `app/globals.css` (roulette wheel section, ~5410–5594)

**Interfaces:**
- Consumes: `--wheel` custom property introduced here.
- Produces: a wheel that scales from 320px up without changing rotation transforms.

- [x] **Step 1: Introduce `--wheel: min(320px, 100%)` on `.roulette-wheel-cabinet`**

Convert `.roulette-wheel-stage`, `.roulette-wheel-outer-ring`, `.roulette-wheel-rotor`, `.roulette-pocket-spoke`, `.roulette-ball-track` and `.roulette-center-turret` from fixed px to proportional `calc()` values with `aspect-ratio: 1`. Keep `left`, `height` and `transform-origin` of spokes proportional so the 37 pockets stay aligned.

- [x] **Step 2: Improve wheel detail**

Add layered conic/radial gradients for a brass/wood ring and pocket dividers; raise pocket-label contrast and use fluid font-size. Do not modify the rotation `style` props or transition strings in `components/roulette-game.tsx`.

- [x] **Step 3: Run `npm run check`**

Expected: wheel assertion passes.

### Task 4: Roulette felt, badges and theme

**Files:**
- Modify: `app/globals.css` (roulette felt section, ~5596–5722)
- Modify if needed: `components/roulette-game.tsx` (class name on stake badge only)

**Interfaces:**
- Consumes: scrollable felt from Task 2's shell rules.
- Produces: readable 12-column felt at every width.

- [x] **Step 1: Make the felt scroll on small screens**

Inside a new `@media (max-width: 600px)` block, give `.roulette-felt-grid` `overflow-x: auto` and its direct children a `min-width` (~400px) so cells stay ~30px wide. Keep the authentic 3×12 layout on desktop. Use `clamp()` for cell height and font-size.

- [x] **Step 2: Fix badges and theme**

Move `.spot-chip-badge` to a cell corner so it does not cover numbers; deepen the emerald/brass palette, soften the spotlight, and add `flex-shrink: 0` to `.roulette-hist-label`.

- [x] **Step 3: Run `npm run check`**

Expected: felt assertion passes.

### Task 5: Responsive rules for the other four games

**Files:**
- Modify: `app/globals.css` (append after the current last media query)

**Interfaces:**
- Consumes: shared wrapping from Task 2.
- Produces: tablet/phone layouts for slots, blackjack, baccarat, dragon tiger.

- [x] **Step 1: Add one consolidated media block (900/640/480/360px)**

At ≤600px stack `.baccarat-hands-arena` and `.dt-battle-arena` to one column and let their felt bet spots/absolute stake pills adapt. At ≤480px make `.bj-actions-grid` 2 columns and give `.card-games-tab-bar` horizontal scrolling with `white-space: nowrap`. Make slot reel geometry fluid with `clamp()` and shrink the spin button in the existing 600px slot block.

- [x] **Step 2: Run `npm run check`**

Expected: all Task 1 assertions pass.

### Task 6: Final verification

**Files:** none.

- [x] **Step 1: Run both gates**

Run: `npm run check && npm run build`
Expected: exit 0 for both; check stays in-memory.

- [x] **Step 2: Visual sanity check at 320/375/768/1440px**

If a browser run is practical, load the four game pages and confirm no clipped wheel, no horizontal page scroll from the games, readable bet cells, and usable modals. If not practical, report that this was skipped.

- [x] **Step 3: Report**

Summarise changed files, what was skipped, and any remaining risk. Do not commit or push.
