# UI Motion + Tower Difficulty Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native, user said "do it").

**Goal:** Add restrained site-wide motion with reduced-motion support and redesign Tower Ascend's difficulty selector into a color-coded risk ladder.

**Architecture:** All visual work lives in `app/globals.css`; the only TSX change is the difficulty selector markup in `components/tower-game.tsx`. No JS animation runtime, no dependencies, no Tailwind.

**Tech Stack:** Next.js 16 (Turbopack), plain CSS.

**Spec:** `docs/superpowers/specs/2026-11-17-ui-motion-tower-tiles-design.md`

## Global Constraints
- Plain CSS in `app/globals.css` only, plus the JSX fix in `components/tower-game.tsx`.
- No new dependencies, no Tailwind, no game-logic/DB changes.
- Responsive at 320/375/768/1280px; `prefers-reduced-motion` disables motion.
- Verify with `npm run check` and `npm run build`.

## Review Focus
- Reduced-motion users get no animation/transition → `@media (prefers-reduced-motion: reduce)` override in Task 1.
- Difficulty subtitles show literal `&bull;` → real `·` in Task 2.
- Tiles overflow at 320px → browser sweep verification in Task 3.
- Active difficulty state stays obvious and disabled state works while playing → Task 2 CSS.

---

### Task 1: Shared motion tokens + site-wide entrance/hover motion

**Files:**
- Modify: `app/globals.css` (append at end)

- [ ] **Step 1:** Append `:root` tokens `--motion-fast: 140ms`, `--motion-base: 220ms`, `--ease-out: cubic-bezier(.16,1,.3,1)`; `html { scroll-behavior: smooth; }`.
- [ ] **Step 2:** Add `@keyframes ui-fade-in` (opacity 0→1, translateY 6px→0) and apply to `.card`, `.sim-controls-card`, `.mines-board-card`, `.sim-tower-stage`, `.login` with a short stagger.
- [ ] **Step 3:** Add unified hover/press transitions for `button`, `.price`, `.mines-tile`, `.sim-tower-tile`, `.ref-nav-item` using shared tokens.
- [ ] **Step 4:** Add `@media (prefers-reduced-motion: reduce)` block that zeroes animation/transition durations and sets `scroll-behavior: auto`.

### Task 2: Tower difficulty risk-ladder redesign

**Files:**
- Modify: `components/tower-game.tsx:299-316`
- Modify: `app/globals.css` (replace `.sim-difficulty-btn` rules near line 3260)

- [ ] **Step 1:** Replace the `grid grid-cols-2` of `.sim-difficulty-btn` with `.sim-difficulty-list` containing four `.sim-difficulty-row` buttons. Each row: `.difficulty-rank` badge (1–4), `.difficulty-name`, `.difficulty-meter` (4 spans, filled = index+1), `.difficulty-detail` with real `·` separators. Keep `disabled={gameState === "playing"}` and active class.
- [ ] **Step 2:** Replace `.sim-difficulty-btn` CSS with `.sim-difficulty-list` / `.sim-difficulty-row` styles: vertical flex, colored left accent (emerald/amber/orange/red via `data-level` or `:nth-child`), meter fill colors, active state with tinted background + glow, disabled opacity.
- [ ] **Step 3:** Add `@media (max-width: 480px)` tightening for row padding and meter.

### Task 3: Verify

- [ ] **Step 1:** Playwright sweep at 320/375/768/1280px over `/play`, `/play/tower`, `/play/mines`, `/login` — assert `document.body.scrollWidth <= clientWidth + 1` and no console errors.
- [ ] **Step 2:** `npm run check` → PASS.
- [ ] **Step 3:** `npm run build` → PASS.
