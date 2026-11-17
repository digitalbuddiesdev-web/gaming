# Real-Time SSE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push odds, ticker, and round events from Postgres to open player/admin pages via one authenticated SSE stream.

**Architecture:** Idempotent DB triggers emit `pg_notify`; a process-wide `pg.Client` listener fans events out through an `EventEmitter`; a Next.js route handler streams them as SSE; a tiny client component debounces `router.refresh()`.

**Tech Stack:** Postgres `LISTEN/NOTIFY`, `pg` 8, Next.js 16 Route Handlers, `EventSource`.

**Spec:** `docs/superpowers/specs/2026-11-17-realtime-sse-design.md`

## Global Constraints
- Direct `DATABASE_URL` on port 5432 is confirmed; do not switch to a transaction pooler.
- No new dependency, no Redis, no changes to settlement/ledger/money paths.
- When `DATABASE_URL` is absent, every realtime export is a no-op so `npm run check` stays in-memory.
- Payload fields only: `type`, `operatorId`, plus one id/status field. No seeds, stakes, payouts, or PII.
- Do not commit; the working tree already contains earlier uncommitted work.

## Review Focus
- Unauthenticated stream → 401 before the stream opens. Test: curl `/api/events` without a cookie returns 401.
- Cross-operator data leak → server-side `operatorId` filter. Test: log in as demouser, assert stream never emits admin-operator events.
- Stream leaking after tab close → abort/cancel unsubscribes and clears heartbeat. Test: open/close tab, assert listener count returns to previous value.
- PGlite mode → no listener created. Test: `npm run check` passes with no `DATABASE_URL`.
- Refresh storm from burst events → 250ms debounce in the client hook. Test: static check + browser console shows one refresh per burst.

---

### Task 1: DB notification triggers

**Files:**
- Modify: `db/schema.sql` (append idempotent block)

**Interfaces:**
- Consumes: existing tables `casino_markets`, `sport_markets`, `sport_events`, `simulated_game_rounds`.
- Produces: notifications on channel `app_events` with JSON payload `{type, operatorId, ...}`.

- [ ] **Step 1:** Append `create or replace function app_notify_event() returns trigger` using `TG_TABLE_NAME` to choose type `odds` / `ticker` / `round` and call `pg_notify('app_events', payload::text)`. Return `null` (AFTER trigger).

- [ ] **Step 2:** For each of the four tables, `drop trigger if exists app_events_<table> on <table>;` then `create trigger app_events_<table> after insert or update on <table> for each row execute function app_notify_event();`.

- [ ] **Step 3:** Verify `npm run check` passes (schema applies cleanly to in-memory PGlite; `pg_notify` with no listeners is harmless).

### Task 2: Process-wide listener

**Files:**
- Create: `lib/realtime.ts`

**Interfaces:**
- Consumes: `pg` (already installed), `DATABASE_URL`.
- Produces: `subscribe(listener: (event: {type: string; operatorId?: string; [key: string]: unknown}) => void): () => void`.

- [ ] **Step 1:** Implement a global singleton with an `EventEmitter` and a dedicated `pg.Client`. Connect and run `LISTEN app_events`; on `notification`, JSON-parse and emit; on `error`/`end`, retry after 3s. Lazy: create only on first `subscribe()`.

- [ ] **Step 2:** When `DATABASE_URL` is absent, return a no-op unsubscribe without creating a client.

- [ ] **Step 3:** Verify `npm run check` passes.

### Task 3: SSE endpoint

**Files:**
- Create: `app/api/events/route.ts`

**Interfaces:**
- Consumes: `subscribe` from Task 2, `currentAccount` from `lib/auth.ts`.
- Produces: `GET /api/events` → `text/event-stream`.

- [ ] **Step 1:** Export `runtime = "nodejs"` and `dynamic = "force-dynamic"`. In `GET(request)`, call `currentAccount()` and return 401 when absent.

- [ ] **Step 2:** Return a `Response` backed by a `ReadableStream`: enqueue `: connected\n\n`, then `data: <json>\n\n` for each subscribed event whose `operatorId` matches `viewer.operator_id` (staff may see all), plus `: ping\n\n` every 25s.

- [ ] **Step 3:** Clean up on `request.signal` abort and stream `cancel()`: unsubscribe and clear interval. Set headers `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`.

### Task 4: Client subscriber and mounting

**Files:**
- Create: `components/live-updates.tsx`
- Modify: `components/player-shell.tsx` (add `<LiveUpdates />` near the top of the returned JSX)
- Modify: `app/admin/layout.tsx` (add `<LiveUpdates />`)

**Interfaces:**
- Consumes: `useRouter` from `next/navigation`; `/api/events`.
- Produces: no props, renders `null`.

- [ ] **Step 1:** Create a `"use client"` component that opens `new EventSource("/api/events")` in `useEffect` and closes it on cleanup. On `message`, debounce `router.refresh()` by 250ms.

- [ ] **Step 2:** Mount it once in `player-shell.tsx` and once in `app/admin/layout.tsx`.

- [ ] **Step 3:** Browser check with Supabase env: two tabs; admin odds edit → player odds update; Plinko drop in tab A → tab B recent history updates. Assert no 401 in console for signed-in tabs.

### Task 5: Verify

- [ ] **Step 1:** `npm run check` → PASS (no `DATABASE_URL`, no listener).
- [ ] **Step 2:** `npm run build` → PASS.
