# DB Concurrency — Pool Limits — Design

Date: 2026-11-17
Status: Approved

## Intent
Make the existing Supabase `pg.Pool` safe for multiple container replicas by giving it explicit, env-tunable connection limits.

## Finding
`lib/db.ts` **already** uses `new pg.Pool({ connectionString: DATABASE_URL })` with `BEGIN`/`COMMIT`/`ROLLBACK` transactions, and keeps PGlite only for `memory://` / local dev. The migration asked for is already in place. The only real gap is that pool limits are library defaults.

## Goals
- Explicit `max`, `idleTimeoutMillis`, `connectionTimeoutMillis` on the pool, overridable by env vars.
- Safe defaults that do not exhaust Supabase's connection budget.
- PGlite / `npm run check` path unchanged.

## Non-goals
- No new dependency, no new table, no change to `tx()` or any money/settlement path.
- No switch to a transaction pooler (would break `LISTEN/NOTIFY` used by the real-time design).

## Design
- In `lib/db.ts`, add one small `positiveInt(name, fallback)` helper and pass to `pg.Pool`:
  - `max = PGPOOL_MAX` (default `5`)
  - `idleTimeoutMillis = PGPOOL_IDLE_TIMEOUT_MS` (default `30000`)
  - `connectionTimeoutMillis = PGPOOL_CONNECTION_TIMEOUT_MS` (default `5000`)
- Keep the existing `globalForDb` singleton so dev HMR does not leak pools.
- Document the capacity rule in one comment: `max × replicas ≤ DB connection budget`.
- Direct connection is currently `db.hdpkdjehxigfpagfprab.supabase.co:5432`. If replica count later exceeds the budget, use a separate direct URL only for the real-time listener rather than switching the app pool to a transaction pooler.

## Verification
- `npm run check` (no `DATABASE_URL`, in-memory PGlite) passes.
- `npm run build` passes.
- With Supabase env, a query through `sql()` succeeds and the pool reports the configured `max` in a one-off debug assertion (not committed).
