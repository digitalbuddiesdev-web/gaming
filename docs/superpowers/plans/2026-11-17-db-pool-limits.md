# DB Pool Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the existing Supabase `pg.Pool` explicit, env-tunable connection limits while leaving PGlite and all money paths unchanged.

**Architecture:** One helper in `lib/db.ts` parses positive integers from env with fixed defaults, and those values are passed to `pg.Pool`. The existing `globalForDb` singleton and `tx()` body stay exactly as they are.

**Tech Stack:** Node `pg` 8, TypeScript, Next.js 16.

**Spec:** `docs/superpowers/specs/2026-11-17-db-pool-limits-design.md`

## Global Constraints
- No new dependency, no new table, no change to `tx()` or settlement/ledger/roles/reports.
- Defaults: `max = 5`, `idleTimeoutMillis = 30000`, `connectionTimeoutMillis = 5000`.
- Env names: `PGPOOL_MAX`, `PGPOOL_IDLE_TIMEOUT_MS`, `PGPOOL_CONNECTION_TIMEOUT_MS`.
- `npm run check` must stay on in-memory PGlite and must never touch Supabase.
- Do not commit; the working tree already contains earlier uncommitted work.

## Review Focus
- Invalid/negative env values → fall back to defaults, never `NaN` in pool config. Test: one-off node assertion on the helper with `"abc"`, `"-1"`, `"0"`.
- Multiple replicas exhausting Supabase connections → default 5 with a comment stating `max × replicas ≤ budget`. Test: read the code/comment.
- PGlite path accidentally reading pool env → helper is only called in the `pg` branch. Test: `npm run check` passes with the env vars unset.
- HMR creating duplicate pools → existing `globalForDb` guard preserved. Test: static check.

---

### Task 1: Env-tunable pool limits

**Files:**
- Modify: `lib/db.ts:26-43`

**Interfaces:**
- Consumes: `process.env.DATABASE_URL`, `pg.Pool` (already imported).
- Produces: no new exports; `query`/`sql`/`one`/`tx`/`close` signatures unchanged.

- [ ] **Step 1: Add the parser helper**

Add above `handle()`:
```
function positiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
```

- [ ] **Step 2: Pass the three limits to `pg.Pool`**

Replace `new pg.Pool({ connectionString: process.env.DATABASE_URL })` with the same call plus `max`, `idleTimeoutMillis`, `connectionTimeoutMillis` from `positiveInt(...)`, and a one-line comment: `shortcut: max × replicas must stay within the DB connection budget`. Keep the PGlite `else` branch untouched.

- [ ] **Step 3: Assert fallback behaviour**

Run a node one-off that imports the module with `DATABASE_URL` unset and calls `sql("select 1")`, then repeat with deliberately invalid `PGPOOL_MAX` values against Supabase if available. Expected: no `NaN`/connection error and the fallback is used.

### Task 2: Verify

- [ ] **Step 1:** `npm run check` → PASS with the existing success line.
- [ ] **Step 2:** `npm run build` → PASS.
