# Data model

Source of truth: [`db/schema.sql`](../db/schema.sql). It is idempotent and applied on
every boot.

## `operators` — white-label brands

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `slug` | text unique | e.g. `demo` |
| `name` | text | shown in the top bar |
| `created_at` | timestamptz | |

One row per tenant. Every account and ledger row carries its `operator_id`.

## `accounts` — the staff/client tree

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `operator_id` | uuid → operators | scopes every query |
| `parent_id` | uuid → accounts | `null` for top-level staff |
| `username` | text | globally unique, case-insensitive |
| `full_name` | text | optional |
| `password_hash` | text | `scrypt$<salt>$<hash>` |
| `role` | text | `super_admin` \| `operator_admin` \| `agent` \| `client` |
| `mode` | text | `real` \| `demo` |
| `balance` | numeric(18,2) | denormalised copy of the ledger |
| `credit_limit` | numeric(18,2) | staff-set, not enforced by the ledger |
| `default_pct` | numeric(6,2) | 0–100, commission share |
| `exposure_limit` | numeric(18,2) | shown in reports; not enforced yet |
| `user_status` | text | `active` \| `locked` — blocks **login** |
| `bet_status` | text | `open` \| `locked` — blocks **betting** only |
| `deposit_mobile` | text | agent UPI number shown to clients |
| `last_login_at` | timestamptz | |
| `created_at` | timestamptz | |

Indexes: `(operator_id, parent_id)` for tree walks; a global `unique (lower(username))` for login.

The two lock states are independent on purpose: a user can stay logged in while their
betting is frozen.

## `sessions`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `account_id` | uuid → accounts, `on delete cascade` | |
| `token_hash` | text unique | SHA-256 of the cookie value |
| `expires_at` | timestamptz | 7 days after issue |
| `created_at` | timestamptz | |

## `transactions` — append-only points ledger

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `operator_id` | uuid → operators | |
| `account_id` | uuid → accounts | whose statement this lands on |
| `kind` | text | `credit` \| `debit` |
| `amount` | numeric(18,2) | `> 0`, sign lives in `kind` |
| `closing` | numeric(18,2) | balance **after** this row |
| `description` | text | free text from the credit form |
| `counterparty_id` | uuid → accounts | reserved for agent-to-client transfers |
| `created_by` | uuid → accounts | staff member who posted it |
| `created_at` | timestamptz | |

Index: `(account_id, created_at desc)`.

### Invariants

1. Rows are never updated or deleted. A correction is a new opposite row.
2. `amount > 0`; direction is `kind`.
3. `closing` equals the previous row's `closing` ± `amount`, and equals
   `accounts.balance` after the same transaction commits.
4. A debit that would take the balance below zero is rejected by the `UPDATE`
   guard in `lib/ledger.ts`; nothing is written.
5. Reconciliation: the ledger wins over `accounts.balance`.

```sql
select sum(case when kind = 'credit' then amount else -amount end) as ledger_total
  from transactions where account_id = $1;
```

## `casino_providers` — game catalog

Seeder-owned, global across operators (shortcut: not white-labelled per operator).

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `slug` | text unique | `andar-bahar`, `roulette`, … |
| `name` | text | display name |
| `sort_order` | int | listing order |

## `casino_markets` — one round, settled by staff

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `operator_id` | uuid → operators | |
| `provider_id` | uuid → casino_providers | |
| `name` | text | e.g. `Practice round` |
| `option_a`, `option_b` | text | side labels, default Andar / Bahar |
| `odds` | numeric(8,2) | payout multiplier, ≥ 1.01 |
| `status` | text | `open` \| `settled` |
| `winner` | text | `a` \| `b`, set once |
| `settled_by` | uuid → accounts | staff member |
| `settled_at` | timestamptz | |

`unique (operator_id, provider_id, name)` keeps seeding idempotent. Settlement is a
single `UPDATE ... where status = 'open'`; a second declaration matches no row and
throws instead of paying twice.

## `bets`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `operator_id`, `account_id` | uuid | |
| `market_id` | uuid → casino_markets | set for casino bets |
| `sport_market_id` | uuid → sport_markets | nullable; set for sports bets |
| `selection` | text | `a` \| `b` |
| `stake` | numeric(18,2) | `> 0` |
| `odds` | numeric(8,2) | snapshotted from the market at placement |
| `status` | text | `open` \| `won` \| `lost` |
| `payout` | numeric(18,2) | `round(stake × odds, 2)` on a win |
| `placed_at`, `settled_at` | timestamptz | |

The `bets_one_market` check requires exactly one of `market_id` / `sport_market_id`
to be set, so a bet is always casino or sport, never both or neither. Stake is debited
at placement; payout is credited at settlement. Both are ordinary `transactions` rows
(`Bet: <market>` / `Casino win: <market>` / `Sports bet: <market>` /
`Sports win: <market>`), so the statement is the bet history.

## `sport_events` / `sport_markets` — fixtures and two-sided markets

Per operator, staff-seeded (there is no live result feed). `sport_markets` carries the
two side labels, stored `odds`, `status` and a one-shot `winner`. Declaring a winner
settles all open bets on the market in one transaction and cannot be repeated — the
same shape as casino settlement.

## `simulated_game_rounds` — provably fair rounds

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `operator_id`, `account_id` | uuid | |
| `game_type` | text | `crash` \| `mines` \| `dice` \| `plinko` \| `tower` |
| `server_seed`, `server_seed_hash`, `client_seed`, `nonce` | text/int | HMAC outcome inputs |
| `stake` | numeric(18,2) | `> 0`, debited at round start |
| `multiplier`, `payout` | numeric | result and credit, set at settlement |
| `status` | text | `active` \| `won` \| `lost` \| `cashed_out` |
| `game_data` | jsonb | game-specific state (e.g. crash point) |
| `created_at`, `settled_at` | timestamptz | |

One row per round. Settlement locks the row (`select ... for update`), checks its status,
posts the credit through the ledger and marks it terminal in one transaction, so a second
cashout cannot pay twice. Crash rounds left `active` for over 30 minutes are swept to
`lost` on page load with no ledger movement — the stake was already debited. These rounds
feed P/L and exposure reports alongside `bets`.

## Open questions (do not treat as settled)

- **Soda** — the reference calls commission "soda"; how it is computed and whether it
  posts as a ledger row or a report-only figure is undecided.
- **`default_pct`** — intended as the sub-agent's share of loss/profit. Not read by any
  code yet.
- **`exposure_limit`** — displayed in reports but not enforced yet; intended to cap open
  stake, not `balance`.

## Coming tables

Sketch only, to keep this model coherent when the rest of the platform lands:

- `deposit_requests` — client-submitted amount + reference, queued for staff approval,
  approved into the ledger via `moveIn()`.
- A live fixture/result feed: `sport_events` / `sport_markets` are staff-seeded today;
  settlement already reuses the casino winner-declaration shape.
