# UI color coding and API-ready game tiles — design

Date: 2026-11-17. Scope: presentation only. No aggregator integration, no new dependencies.

## Intent

Two things the operator asked for:

1. Color coding should mean the same thing everywhere on the site.
2. Games should look good no matter how they arrive — today from `npm run seed`, later
   from an aggregator API — without another UI redesign when the API lands.

There is no aggregator yet. The agreed approach is to make the presentation layer
catalog-shape-agnostic now, and leave ingest for its own project.

## Goals

- One semantic color vocabulary: green = credit/win/open, red = debit/loss, amber =
  warning/pending, blue = info, grey = muted. Use the existing tokens in
  `app/globals.css` instead of per-component hex values.
- Fix surfaces where text inherits the wrong color (dark row, dark text).
- Game tiles accept an optional image URL and render a fallback when it is absent. A
  future API row with a thumbnail then looks right with no component change.
- One copy of the "Provably Fair Originals" showcase, styled with real CSS rather than
  utility classes that do nothing.

## Non-goals / anti-goals

- No API client, catalog sync, launch URLs, wallet callbacks, or new tables beyond one
  nullable image column.
- No rebrand, dark mode, or white-label theme switch. `--ref-*` colors stay untouched.
- No change to money paths, settlement, roles, or reports.
- Do not edit the fixed correctness-sweep design doc.

## Constraints

- Next.js 16 App Router, server components; plain CSS in `app/globals.css`.
- No Tailwind is installed, yet `components/game-lobby.tsx` and
  `app/play/casino/page.tsx` use Tailwind utility classes extensively — those styles
  are currently dead. Replace them with named classes, do not add Tailwind.
- `db/schema.sql` is idempotent and re-run by seed/check; adding a nullable column is safe.

## Approaches considered

1. **Rebrand the palette** (rejected): large cosmetic diff, no functional gain, and the
   white-label notes say the operator supplies colors.
2. **Build the aggregator catalog now** (rejected): no contract or credentials exist;
   this is a separate, much larger project.
3. **Chosen — consolidate semantics and make tiles optional-image-aware.** Small diff,
   fixes the visible defects, and the API can later fill `image_url` with no UI work.

## Decided how

- Add `--info` and dark-surface text tokens to `:root`; repoint duplicate green/red/amber
  shades at the existing semantic tokens where the meaning is identical.
- Fix dark-on-dark text on `.result-chip` and any remaining dark-surface components.
- `db/schema.sql`: add `image_url text` (nullable) to `casino_games`.
- `LobbyGame` gains `image_url?: string | null`. The tile renders an `<img>` with
  `object-fit: cover` and `loading="lazy"` when set, otherwise the existing initials and
  slug-hash gradient. Image is decorative (`alt=""`); the name stays as text.
- Extract the duplicated showcase into one shared component with named CSS classes.
- Selectors read from the catalog row, not a hardcoded game list, so API-added games
  enter the normal tile grid automatically.

## Left to the builder

- Exact class names and hex values, keeping contrast readable.
- Whether any one-off hardcoded color is genuinely a different semantic (leave it if so).
- Verification with `npm run build` and `npm run check`.
