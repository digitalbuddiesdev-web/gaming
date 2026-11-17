# IP Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an IP-keyed Postgres token bucket and guard login plus bet entry-point Server Actions.

**Architecture:** An idempotent table in `db/schema.sql`, a single atomic `INSERT … ON CONFLICT` helper in `lib/rate-limit.ts`, and a two-line guard at the top of each targeted action. No Redis, no new package.

**Tech Stack:** Postgres SQL, Next.js Server Actions, `next/headers`.

**Spec:** `docs/superpowers/specs/2026-11-17-rate-limit-design.md`

## Global Constraints
- No new dependency. No change to settlement, ledger, roles, or reports.
- Login bucket `{ capacity: 5, refillPerSecond: 1/60 }`; bet bucket `{ capacity: 30, refillPerSecond: 0.5 }`.
- `clientIp()` must work outside a request context (for `npm run check`).
- RLS enabled on the new table, no policies, consistent with the other app tables.
- Do not commit; the working tree already contains earlier uncommitted work.

## Review Focus
- `headers()` called outside a request → try/catch fallback to `"local"`. Test: `npm run check` passes.
- Concurrent requests bypassing the limit → single atomic statement. Test: 40 parallel `consume` calls allow at most 30.
- Legitimate login after a pause → refill math. Test: two calls 61s apart with capacity 1 both allowed (small one-off SQL check).
- IP spoofing behind a trusted proxy → use first `x-forwarded-for` entry. Test: static check.
- Login banner confusion → `error=rate` shows a distinct message. Test: browser check on `/login?error=rate`.

---

### Task 1: Bucket table and helper

**Files:**
- Modify: `db/schema.sql` (append idempotent block)
- Create: `lib/rate-limit.ts`

**Interfaces:**
- Consumes: `query`/`sql` from `lib/db.ts`, `headers` from `next/headers`.
- Produces: `consume(bucket: string, capacity: number, refillPerSecond: number): Promise<boolean>` — `true` means allowed.

- [ ] **Step 1:** Append to `db/schema.sql`: `create table if not exists rate_limit_buckets (key text primary key, tokens numeric not null, updated_at timestamptz not null default now());` and `alter table rate_limit_buckets enable row level security;`.

- [ ] **Step 2:** Create `lib/rate-limit.ts` exporting `consume(bucket, capacity, refillPerSecond)`. Key = `bucket + ":" + await clientIp()`. Use one statement: `insert … values ($1, $2 - 1, now()) on conflict (key) do update set tokens = greatest(0, least($2, rate_limit_buckets.tokens + extract(epoch from (now() - rate_limit_buckets.updated_at)) * $3) - 1), updated_at = now() returning tokens >= 0 as allowed`. Return `allowed`. Keep `clientIp()` private with `headers()` in try/catch.

- [ ] **Step 3:** Verify `npm run check` passes (the helper is not called there, but the schema must stay valid).

### Task 2: Guard login and bets

**Files:**
- Modify: `lib/actions.ts:34-50, 161-212`
- Modify: `lib/simulated-actions.ts:94-99, 282-287, 513-519, 617-622`
- Modify: `components/login-form.tsx:79-84`

**Interfaces:**
- Consumes: `consume(...)` from Task 1. Login config `{ capacity: 5, refillPerSecond: 1/60 }`; bet config `{ capacity: 30, refillPerSecond: 0.5 }`.
- Produces: no new exports.

- [ ] **Step 1:** At the top of `login`, after reading `username`/`password`, call `consume("login", 5, 1 / 60)`; if false, `redirect("/login?error=rate")`.

- [ ] **Step 2:** At the top of `placeBetAction` and `placeSportBetAction`, call `consume("bet", 30, 0.5)`; if false, `redirect(back + "?error=Too+many+requests")` (compute `back` first).

- [ ] **Step 3:** At the top of `startCrashRound`, `playPlinkoDrop`, `startMinesRound`, `startTowerRound`, call the bet guard; if false, `throw new Error("Too many requests. Please slow down.")`.

- [ ] **Step 4:** In `components/login-form.tsx`, show "Too many attempts. Please try again shortly." when `error === "rate"`, otherwise keep the existing banner text.

### Task 3: Verify

- [ ] **Step 1:** Browser check: open `/login?error=rate`, assert the distinct banner text appears.
- [ ] **Step 2:** Run 40 parallel `consume("test", 30, 0.5)` calls in a one-off node script against Supabase; assert at most 30 return true.
- [ ] **Step 3:** `npm run check` → PASS.
- [ ] **Step 4:** `npm run build` → PASS.
