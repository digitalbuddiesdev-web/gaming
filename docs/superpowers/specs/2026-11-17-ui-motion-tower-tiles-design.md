# UI Motion + Tower Difficulty Tiles — Design

Date: 2026-11-17
Status: Approved (short design; user chose "do it")

## Intent
Make the whole site feel responsive and alive with restrained, consistent motion, and redesign the Tower Ascend "Difficulty Level" tiles into a clearer, more informative selector.

## Goals
- One shared motion language: consistent duration/easing tokens, subtle entrance and hover feedback, and a `prefers-reduced-motion` kill switch.
- Difficulty selector reads as a risk ladder with icon, name, difficulty meter, and trap/tile detail; color-coded green → red; clear active state.
- Fix the literal `&bull;` in the difficulty subtitles.

## Non-goals / Anti-goals
- No JS animation library, no new dependencies, no Tailwind.
- No flashy or long animations that slow down gameplay; no motion that hurts accessibility.
- Do not change game logic, settlement, or any DB path.

## Constraints
- Plain CSS in `app/globals.css` only (plus the one JSX text fix in `components/tower-game.tsx`).
- Existing color palette stays; amber/emerald accents preserved.
- Must remain responsive at 320–1280px and pass `npm run check` + `npm run build`.

## Approaches considered
1. **Motion:** scattered per-component keyframes (rejected — more duplication) vs. one shared token block with a reduced-motion guard (chosen).
2. **Tiles:** (A) horizontal risk ladder with badge + meter + detail (chosen); (B) compact pills, loses detail; (C) restyle existing 2×2 grid, least improvement.

## Design
### Motion block (end of `app/globals.css`)
- `:root` tokens: `--motion-fast: 140ms`, `--motion-base: 220ms`, `--ease-out: cubic-bezier(.16,1,.3,1)`.
- `@keyframes ui-fade-in` (opacity 0→1, translateY 6px→0); apply to `.card`, `.sim-controls-card`, `.mines-board-card`, major panels with a tiny stagger via `nth-child`.
- Hover/press feedback unified on `button`, `.sim-difficulty-btn`, `.mines-tile`, `.price`, `.tiles .tile` using the shared tokens.
- `@media (prefers-reduced-motion: reduce)` sets `animation-duration: .01ms !important`, `transition-duration: .01ms !important`, `scroll-behavior: auto !important`.
- `html { scroll-behavior: smooth; }` (disabled above under reduced-motion).

### Tower difficulty tiles (`components/tower-game.tsx` + `app/globals.css`)
- Replace the `grid grid-cols-2` of `.sim-difficulty-btn` with `.sim-difficulty-list` (single column, 4 rows).
- Each row: left badge (1–4), name, difficulty meter (▮ filled / ▯ empty using spans), detail text with a real `·` separator.
- Replace `.sim-difficulty-btn` CSS with `.sim-difficulty-row` styles: flex layout, colored left accent per level (emerald/amber/orange/red), active state with tinted background + glow + scale.
- Responsive: rows stay single-column but tighten padding/gap under 480px.

## Left to builder
- Exact spacing/color values, kept consistent with existing tokens.
- Verification via browser sweep at 320/375/768/1280px, then `npm run check` and `npm run build`.
