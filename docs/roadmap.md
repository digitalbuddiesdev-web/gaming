# Roadmap

Build order is deliberate: each step reuses `moveIn()` and the account tree, so nothing
below needs a new write path for money.

## Done

- [x] Operators, accounts, sessions, ledger schema
- [x] Login / logout, scrypt passwords, hashed session tokens
- [x] Roles + `canAct()` reach checks (both admin roles operator-scoped)
- [x] Account list, create account, detail page
- [x] Credit / debit with statement and closing balances
- [x] Independent login / betting locks
- [x] Demo book (`mode = 'demo'`)
- [x] Seed script, idempotent schema
- [x] Casino provider catalog, market creation, client bet placement
- [x] Manual result declaration; settles all open bets atomically, single declaration only
- [x] Sports fixtures, markets, bets; manual result declaration (same atomic settlement)
- [x] Provably fair simulated games (crash, mines, plinko, tower) with atomic cashout;
      stale crash rounds are closed out without moving the ledger
- [x] Reports: statement, current bets, P/L (casino + sport + simulated), users2 summary
- [x] Money-path self-check against in-memory Postgres (`npm run check`)
- [x] Correctness & trust sweep —
      [design](../superpowers/specs/2026-11-17-correctness-sweep-design.md)

## Next

### 1. Live result feed / auto-settlement

Sports settle by staff declaration today. What remains is ingestion and automation:

- Fixture feed into `sport_events` (define our own adapter; the reference's
  `/api/admin/fixturedata2` is not a contract we inherit).
- Auto-settlement from the result feed, reusing the casino settlement routine.
- Exposure per account computed from open stake, enforced against `exposure_limit`.

Acceptance: a fixture with a result settles without staff action and the ledger still
reconciles with `accounts.balance`.

### 2. Deposit requests

- Client submits amount + UPI reference against the account's `deposit_mobile`.
- Staff queue approves or rejects; approval calls `moveIn()` with
  `description = 'Deposit <reference>'`.
- Rejection requires a reason, stored on the request.

Acceptance: approving twice cannot double-credit (idempotency on request id).

### 3. Third-party game integration

The contract to demand from any aggregator is in
[reference-ui-notes](reference-ui-notes.md#third-party-game-api-contract-to-require).

- `game_vendors` / `games` tables populated from the aggregator catalog; `/play` gains
  provider tabs and a tile grid, mirroring the reference lobby.
- Launch: server-side signed `launchUrl` per `(account, game)`, rendered in an iframe.
  The game never sees our password or session cookie.
- Wallet: `POST /api/wallet/{balance,debit,credit,rollback}` guarded by HMAC and idempotent
  on the aggregator's `transactionId`. `transactions` gains `external_ref text unique`.
- Provider balances mean we stop holding stake as a `bets` row for aggregator games: the
  ledger is the record. `bets` stays for our own two-sided markets.
- Results arrive by webhook; manual declaration remains the fallback.
- P/L gains a third-party split. Today P/L covers casino, sports and simulated rounds.

Acceptance: a game round debits and credits the wallet through the callback, replays of the
same `transactionId` change nothing, and the ledger still reconciles with `accounts.balance`.

### 4. If and when required

- Per-module permissions (`plist`) for agents.
- Agent commission posting ("soda") — depends on the open semantics in
  [data-model](data-model.md#open-questions-do-not-treat-as-settled).
- Multi-side markets (more than two selections) — the current model is deliberately
  two-sided.
- Email/SMS notifications, KYC, responsible-gambling limits.

## Deliberately out of scope until licensed

- Payment gateways, card or bank rails, crypto deposits.
- Anything that moves real money without a named licensed jurisdiction.

The ledger is points-based on purpose: staff credit points; there is no self-service
purchase path. That keeps the current build usable as a demo and an internal book
without touching regulated rails. See [decisions](decisions.md).
