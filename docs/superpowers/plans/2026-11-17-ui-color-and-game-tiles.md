# UI Color Coding and API-Ready Game Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make color meaning consistent site-wide and render catalog games through one resilient tile/showcase that accepts an optional image from a future API without further UI work.

**Architecture:** Plain CSS tokens in `app/globals.css` remain the single color source; hardcoded duplicate shades are repointed at them. `casino_games` gains one nullable `image_url`; `GameLobby` renders an image when present and the existing initials/gradient otherwise. The duplicated showcase becomes one server component with named CSS classes, since Tailwind is not installed.

**Tech Stack:** Next.js 16 App Router, React 19 server components, plain CSS, PGlite/Postgres via `lib/db.ts`, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-17-ui-color-and-game-tiles-design.md`

## Global Constraints

- No new dependencies. No Tailwind — no Tailwind config or PostCSS config exists.
- No aggregator client, catalog sync, launch, wallet callbacks, or new tables. Only `image_url text` on `casino_games`.
- Do not change money paths, settlement, roles, reports, or the fixed correctness-sweep design doc.
- Keep `--ref-*` variables untouched (white-label reference values).
- Verify with `npm run check` and `npm run build` after each task's edits.
- No git repository exists in this workspace — omit commit steps.

## Review Focus

- An API row with `image_url` set must show the image; a broken/empty value must never blank the tile → Task 2 asserts the conditional branch and the fallback.
- Long game names and missing provider names must not break the tile grid → Task 2 adds CSS clamping and checks the grid still has one card per game.
- Dark surfaces must not inherit dark text (`.result-chip`, ladder rows) → Task 1 sets light foreground tokens and greps the rules.
- The showcase uses Tailwind-only classes today, which render as nothing → Task 3 replaces them with named classes and greps for leftovers.
- Seeded rows have no image column value; schema changes must stay idempotent → Task 2 runs `npm run check`, which recreates the schema from `db/schema.sql`.

---

### Task 1: Semantic color tokens and dark-surface text

**Files:**
- Modify: `app/globals.css:21-42`, `:180-203`, `:222-226`

**Interfaces:**
- Produces: `--info`, `--on-dark`, `--on-dark-muted` CSS custom properties for Tasks 2–3.

- [ ] **Step 1: Add the missing semantic tokens**

In `:root`, add `--info: #0284c7;` (blue = informational), `--on-dark: #e2e8f0;`, and `--on-dark-muted: #94a3b8;`. Keep all existing `--ref-*` values unchanged.

- [ ] **Step 2: Repoint duplicate semantic colors at the tokens**

In the chip block (`:182-188`) and the result-chip block (`:223-226`), replace hardcoded `#047857` with `var(--accent)` and add `color: var(--on-dark);` to `.result-chip`. Leave brand accents such as `#00c278` alone — they are not semantic.

- [ ] **Step 3: Verify**

Run: `npm run build` and `grep -n -- '--on-dark\|--info' app/globals.css`
Expected: build succeeds; all three tokens defined and `.result-chip` uses `var(--on-dark)`.

### Task 2: Optional image on game tiles

**Files:**
- Modify: `db/schema.sql:78-86`
- Modify: `components/provider-lobby.tsx:26-33`
- Modify: `components/game-lobby.tsx:4-11`, `:167-183`
- Modify: `app/globals.css:189-203`

**Interfaces:**
- Consumes: none beyond Task 1 tokens.
- Produces: `LobbyGame.image_url?: string | null` consumed by the tile renderer; `g.image_url` selected by `ProviderLobby`.

- [ ] **Step 1: Add the nullable column**

In `create table if not exists casino_games`, add `image_url text` after `category`. No default, no backfill; existing seeded rows stay valid.

- [ ] **Step 2: Extend the row type and query**

Add `image_url?: string | null` to `LobbyGame` in `components/game-lobby.tsx`. Add `g.image_url` to the select in `components/provider-lobby.tsx:27`.

- [ ] **Step 3: Render image-or-fallback in the tile**

Keep the existing `.tile-art` wrapper. When `game.image_url` is a non-empty string, render `<img className="tile-art-img" src={game.image_url} alt="" loading="lazy" />` inside it and drop the inline gradient; otherwise keep the current initials plus slug-hash gradient. The name remains rendered as `.tile-name` text in both cases.

- [ ] **Step 4: Style the image**

Add `overflow: hidden` to `.tile-art` and a `.tile-art-img` rule with `display: block; width: 100%; height: 100%; object-fit: cover;`. Add text clamping to `.tile-name` so long catalog names do not stretch the grid.

- [ ] **Step 5: Verify**

Run: `npm run check` and `npm run build`
Expected: check recreates schema with the new column and passes; build compiles. Confirm markup branches by grepping `tile-art-img` in `components/game-lobby.tsx` and `app/globals.css`.

### Task 3: One showcase, styled with real CSS

**Files:**
- Create: `components/provably-fair-showcase.tsx`
- Modify: `components/game-lobby.tsx:1-136`
- Modify: `app/play/casino/page.tsx:1-125`
- Modify: `app/globals.css:2752-2772`

**Interfaces:**
- Produces: `ProvablyFairShowcase`, a no-prop server component used by both `GameLobby` and `CasinoLobby`.

- [ ] **Step 1: Extract the component**

Create `components/provably-fair-showcase.tsx` exporting `ProvablyFairShowcase`. Move the `PROVABLY_FAIR_GAMES` data and the four lucide icon imports there. Use the existing four entries verbatim (names, hrefs, tags, descriptions, colors).

- [ ] **Step 2: Replace Tailwind classes with named classes**

In the new component, replace utility classes with: `.showcase-head`, `.showcase-title`, `.showcase-badge`, `.showcase-grid`, `.showcase-icon`, `.showcase-tag`, `.showcase-name`, `.showcase-desc`. Define these in `app/globals.css` next to `.sim-original-card`, using existing tokens. Keep the per-card inline gradient/border/color from the data.

- [ ] **Step 3: Use it in both hosts**

Delete the local data constant, showcase JSX, and now-unused icon imports from `components/game-lobby.tsx` and `app/play/casino/page.tsx`; render `<ProvablyFairShowcase />` in both. Replace the surrounding `space-y-6` and `pt-2 border-t border-slate-200` utility classes with one `.lobby-stack` / `.lobby-section` pair defined in `app/globals.css`.

- [ ] **Step 4: Verify**

Run: `grep -rn 'grid-cols-1\|text-emerald-600\|space-y-6\|line-clamp-2\|border-slate-200' components/game-lobby.tsx app/play/casino/page.tsx components/provably-fair-showcase.tsx`, then `npm run build` and `npm run check`.
Expected: grep returns no matches in those files; build and check pass; both lobbies render the showcase from one component.
