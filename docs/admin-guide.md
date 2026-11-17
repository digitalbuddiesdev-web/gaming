# Admin guide

Everything below assumes you are signed in as a `super_admin` / `operator_admin` (or an
`agent` for the sub-tree equivalents) at `/login`.

## Find an account

`/admin` — the account list. It shows each account's role, book (`real` / `demo`),
balance, credit limit, default %, and both lock pills (`U` = login, `B` = betting).

The three tiles at the top are **Accounts**, **Active**, and **Total points held**.
"Active" counts `user_status = 'active'`; the points total is the sum of balances in
your reach.

## Create an account

`/admin/new`

| Field | Rule |
| --- | --- |
| Username | ≥ 3 chars, globally unique (case-insensitive) |
| Password | ≥ 6 chars |
| Account type | client, agent, or operator admin (admins only) |
| Book | real or demo |
| Credit limit | number ≥ 0, informational today |
| Default % | 0–100 |
| Deposit mobile | optional, the agent's UPI number |

New accounts start at `0.00` balance and are created under you. A duplicate username
returns *Username already taken* rather than a stack trace. Only a `super_admin` can
create another `operator_admin`.

## Credit or debit points

`/admin/clients/<id>` → **Credit / debit**

1. Pick Credit or Debit.
2. Enter an amount and a description (e.g. `UPI deposit`, `settlement`, `correction`).
3. **Post**.

What happens: one transaction inserts a ledger row and updates the balance together.
The form never allows a debit larger than the balance — you get *Insufficient balance*
and no row is written. The statement below updates with the new closing balance.

Corrections are new opposite entries. Never edit an existing row.

## Lock or unlock an account

On the same detail page:

- **Login: active/locked — toggle** — blocks sign-in and invalidates existing sessions.
- **Betting: open/locked — toggle** — stops new bets without kicking the user out.

You cannot lock your own login. Doing so is refused with an error message.

## Run a casino market

1. `/admin/casinos` → **Create market**: pick a provider, name the round, set the two
   side labels and the payout odds. Markets are per operator; provider names are shared.
2. Clients (and staff) see open markets at `/play` and place a bet: side + stake.
   The stake leaves the balance immediately and appears on the statement as
   `Bet: <market>`.
3. When the round ends, pick the winning side in the market row and press **Declare**.
   Every open bet on that market settles in one transaction: the winning side is
   credited `stake × odds` (`Casino win: <market>`), the other side is marked lost.
4. Settled markets stay in the table with the winning side shown. Declaring again is
   refused — there is no double payout and no undo.

Either admin role can declare a winner. An agent sees the page but the action returns
*Only an admin can settle a market*.

## Run a sports market

1. `/admin/sports` → create an event, then a two-sided market (side labels + stored odds).
2. Clients bet from `/play/sports`; the stake is debited immediately as
   `Sports bet: <market>`.
3. Pick the winner and press **Declare**. All open bets on that market settle in one
   transaction (`Sports win: <market>`); declaring again is refused.

There is no live result feed — results are staff-declared, as with casino markets.

## Simulated games

Players run crash / mines / plinko / tower rounds themselves under `/play`; outcomes are
provably fair from hashed seeds, and cashouts post through the same ledger with no staff
action. A cashout is idempotent, and crash rounds left active are closed out on page load.
Winnings and open stakes appear in the P/L and exposure reports alongside casino and
sports bets.

## Read a statement

The statement lists newest first: date, description, credit, debit, closing. The
closing column is stored per row, so the running balance is always exact.

## Common problems

| Symptom | Cause | Fix |
| --- | --- | --- |
| `ENOENT ... .data\pg` on seed | data directory missing | `scripts/seed.mjs` creates it; re-run `npm run seed` |
| Seed hangs or errors about the database | a dev/prod server is holding the embedded DB | stop the server, then `npm run seed` |
| `Specified module format (CommonJs)` on build | `package.json` lost `"type": "module"` | restore it |
| Login says invalid after a fresh seed | seed re-hashes the password on every run, so the last seeded password wins | use `admin12345` unless `SEED_PASSWORD` was set |
| An account disappears from the list | it is outside your sub-tree (agent) or another operator | use an operator admin account |

## Before any real deployment

1. Change every seeded password; `admin12345` is public knowledge.
2. Put a named licensed jurisdiction and operator behind the money flows — see
   [decisions](decisions.md).
3. Move off embedded PGlite if more than a couple of staff will work concurrently.
