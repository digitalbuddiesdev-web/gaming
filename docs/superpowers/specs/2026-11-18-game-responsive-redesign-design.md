# Design: Responsive games + roulette UI refresh

Date: 2026-11-18

## Goal

Make the newly added casino games (roulette, slots, cards/blackjack, baccarat, dragon tiger) work cleanly on phone, tablet and desktop, and refresh the roulette screen so it looks like a polished classic table instead of a rough mockup.

## Decisions (confirmed with user)

- Direction: **polished classic felt** — keep the green-felt/brass identity, fix the execution.
- Complaints to fix: the wheel, the betting grid, colours/theme, layout/spacing.
- Wheel animation: **keep** the spin + counter-spinning ball, improve its detail and proportions.

## Scope

CSS and JSX class names only. No game logic, settlement, ledger, auth, DB or config changes.

Files in scope:
- `app/globals.css` — all new styles and media queries.
- `components/roulette-game.tsx` — structural class fixes around the wheel/grid only.
- `components/slot-game.tsx`, `components/card-game.tsx`, `components/baccarat-game.tsx`, `components/dragon-tiger-game.tsx` — class-name swaps only where needed.

Non-goals: Tailwind, new dependencies, new breakpoints library, layout JS, changing bet mechanics.

## Findings to fix

1. The last media query in `globals.css` is at line 4463 — blackjack, baccarat, dragon tiger and roulette have **no** small-screen rules at all.
2. Several class names used by the new components have no CSS: `sim-header-titles`, `sim-game-badge`, `sim-game-name`, `sim-game-sub`, `sim-modal-overlay`, `sim-modal-dialog`, `sim-modal-head`, `sim-history-*`, `sim-audit-*`, `sim-actions-stack`. These are unstyled flow elements today.
3. `.sim-meta-chips`, `.bj-chips-rack`, `.card-games-tab-bar`, `.slot-auto-spin-row` never wrap; the 640px rule targets `.sim-header-actions`, which no game uses.
4. Roulette wheel is a fixed 320px chain inside an `overflow:hidden` cabinet — clipped below ~360px.
5. Roulette felt is a fixed 12-column grid with 13px text and no scroll/collapse; chip badges sit on top of the number text.
6. Baccarat/dragon-tiger arenas are `1fr auto 1fr` with no collapse; blackjack actions are always 3 columns; slots keep 5 fixed reels and an unwrapping spin row.
7. Global `html, body { overflow-x: hidden }` currently hides all of the above instead of fixing them.

## Approach

### Shared shell (all five games)

- Define the missing classes once, using existing `sim-*` tokens/patterns: fluid `clamp()` title/badge/sub typography, full-screen modal backdrop with `max-height: 90dvh; overflow-y: auto` body, scrollable history table wrapper, `overflow-wrap: anywhere` audit hashes, simple `sim-actions-stack` spacing.
- Add `flex-wrap: wrap` / `min-width: 0` to the non-wrapping flex rows and fix the mis-targeted 640px header rule.
- Add one consolidated media block at the end of the game CSS (breakpoints 900 / 640 / 480 / 360px) covering the games that currently have none.

### Roulette refresh

- Wheel: replace the fixed px chain with a `--wheel: min(320px, 100%)` custom property and proportional `calc()` children, `aspect-ratio: 1`, fluid label type. Add pocket dividers and a richer brass/wood ring using layered gradients. Keep the existing rotation transforms and 3.4s animation untouched.
- Felt: keep the authentic 3×12 layout on desktop; below ~600px make the felt horizontally scrollable with a `min-width` so cells stay tappable, reduce font/height with `clamp()`, and move chip stake badges to a corner so numbers stay readable.
- Outside bets: keep 3/6 columns but let them shrink fluidly inside the scroll container.
- Theme: deeper emerald felt, warmer brass, subtler spotlight, clearer red/black contrast, tighter header/control spacing.
- History bar: label does not shrink; chips keep horizontal scroll.

### Other games

- Baccarat & dragon tiger: stack `1fr auto 1fr` arenas to one column at ≤600px; make felt bet spots and stake pills adapt.
- Blackjack: 2-column action grid at ≤480px, scrollable tab bar, keep the wrapping card tray.
- Slots: fluid reel sizing via `clamp()`, wrap the auto-spin row, shrink spin button at small widths.

## Verification

- `npm run check` and `npm run build` must pass.
- Visual sanity check at 320, 375, 768 and 1440px if a browser run is feasible; otherwise verify CSS by inspection.
- No commit or push unless asked.
