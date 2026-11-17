# Real-Time Push — SSE + Postgres LISTEN/NOTIFY — Design

Date: 2026-11-17
Status: Approved

## Intent
Push odds changes, ticker changes, and Plinko/Crash round activity to already-open player and admin pages without waiting for a manual refresh.

## Finding
There is no polling, SSE, or WebSocket code today. Odds, ticker, and recent-round lists are server-rendered; games call `router.refresh()` only after the player's own action. The Supabase `DATABASE_URL` is a **direct** connection on port 5432, so `LISTEN/NOTIFY` is available.

## Goals
- One SSE endpoint carrying typed events: `odds`, `ticker`, `round`.
- Cross-container fan-out without Redis or a new dependency.
- No changes to settlement, ledger, or game-result logic.

## Non-goals
- No per-frame animation of another player's ball/ship. "Spectating" first pass = live appearance of new/intermediate Plinko and Crash rounds in recent-round lists.
- No client-side odds recalculation. Clients re-fetch server-rendered data via `router.refresh()`.
- No WebSockets, no Redis/Upstash, no event persistence/history replay.

## Design
### 1. Event source — `db/schema.sql` (idempotent)
- `create or replace function app_notify_event()` uses `TG_TABLE_NAME` to build a small JSONB payload and calls `pg_notify('app_events', payload::text)`:
  - `casino_markets`, `sport_markets` → `{type:'odds', operatorId, marketId}`
  - `sport_events` → `{type:'ticker', operatorId, eventId}`
  - `simulated_game_rounds` → `{type:'round', operatorId, gameType, roundId, status}`
- `drop trigger if exists` then `create trigger` for `after insert or update` on each table (idempotent with the existing schema file).
- Payload contains no seeds, stakes, payouts, or PII.

### 2. Listener — new `lib/realtime.ts`
- Global singleton (mirrors `lib/db.ts`) holding an `EventEmitter` and a dedicated `pg.Client` that runs `LISTEN app_events`.
- On `notification`, parse the payload and emit it locally.
- On `error`/`end`, retry connect after 3s; never crash the process.
- When `DATABASE_URL` is absent (PGlite / `npm run check`), `subscribe()` is a no-op returning a no-op unsubscribe.

### 3. Endpoint — new `app/api/events/route.ts`
- `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- Require `currentAccount()`; return 401 without a session.
- `ReadableStream` SSE: initial `: connected` comment, `data: <json>\n\n` per event, `: ping` heartbeat every 25s.
- Server-side filter: only forward events whose `operatorId` matches the viewer's `operator_id` (staff may see all).
- Clean up listener + heartbeat on `request.signal` abort and stream `cancel()`.
- Headers: `text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`.

### 4. Client — new `components/live-updates.tsx`
- `"use client"`, renders nothing. Opens one `EventSource("/api/events")`.
- On message, debounce `router.refresh()` by ~250ms to avoid refresh storms.
- Mount once in the player shell and once in the admin shell.
- EventSource reconnects natively; no custom retry loop.

## Verification
- With Supabase env: two browser tabs; admin odds edit → player odds update; admin result declaration → ticker/odds update; Plinko drop in tab A → recent rounds update in tab B.
- `npm run check` passes (PGlite path, no listener).
- `npm run build` passes.

## Risks
- Requires a direct Postgres connection; switching `DATABASE_URL` to Supabase's transaction pooler silently disables events.
- One EventSource per tab is within browser per-host limits.
