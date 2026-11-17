# IP Rate Limiting — Postgres Token Bucket — Design

Date: 2026-11-17
Status: Approved

## Intent
Throttle brute-force login attempts and rapid automated bet scripts at the Server Action boundary.

## Finding
No throttling exists. Guarded actions live in `lib/actions.ts` (login, betting) and `lib/simulated-actions.ts` (game-round entry points). No Redis is configured.

## Goals
- IP-based token bucket backed by the existing Postgres database, so it works across replicas with no new dependency.
- Distinct, user-visible "too many attempts" message on login; indistinct failure for other actions.

## Non-goals
- No `@upstash/ratelimit`, no Redis, no in-process `Map`.
- No guarding of admin mutations or in-flight step/cashout actions (those are already locked per round).
- No bucket cleanup job (keys are bounded by distinct client IPs and reused).

## Design
### 1. Table — `db/schema.sql` (idempotent)
```
create table if not exists rate_limit_buckets (
  key text primary key,
  tokens numeric not null,
  updated_at timestamptz not null default now()
);
alter table rate_limit_buckets enable row level security;
```
No policies, consistent with the other app tables; app connects as owner.

### 2. Helper — new `lib/rate-limit.ts`
- `clientIp()`: `headers()` in try/catch → first `x-forwarded-for` entry, then `x-real-ip`, then `"local"`. The catch keeps `npm run check` working outside a request.
- `consume(bucket, capacity, refillPerSecond)`: single atomic statement —
  `insert ... values ($1, capacity - 1, now()) on conflict (key) do update set tokens = greatest(0, least(capacity, tokens + elapsed * refill) - 1), updated_at = now() returning tokens >= 0 as allowed`.
- Config: login `{ capacity: 5, refillPerSecond: 1/60 }`; bet `{ capacity: 30, refillPerSecond: 0.5 }`.

### 3. Apply guards
- `lib/actions.ts`: `login` → redirect `/login?error=rate`; `placeBetAction`, `placeSportBetAction` → redirect to their `back` path with `?error=Too+many+requests`.
- `lib/simulated-actions.ts`: `startCrashRound`, `playPlinkoDrop`, `startMinesRound`, `startTowerRound` → throw `Too many requests. Please slow down.`.
- `components/login-form.tsx`: map `error === "rate"` to a distinct banner message; keep the existing message otherwise.

## Verification
- `npm run check` passes (no request headers; only the unguarded `settleCrashCashout` is called).
- `npm run build` passes.
- Manual: six rapid bad logins show the rate-limit banner; normal login after a pause still works.

## Risk
IP headers are only trustworthy behind a proxy that sets `x-forwarded-for`; if the app is directly exposed, the key can be spoofed.
