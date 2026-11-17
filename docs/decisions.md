# Decision log

Newest last. Each entry: what was decided, why, and what it costs.

## 2026-11-12 — Build an original product, not a clone

**Decision.** Implement the same feature categories as the reference back office
(points wallet, user tree, manual credits, casino/sports settlement, reports) from
scratch.

**Why.** The goal is a "similar application", not a reproduction. Copying code, design
or assets would carry copyright and trademark exposure and would not be maintainable.

**Cost.** Some workflows will feel different from the reference. That is accepted.

## 2026-11-12 — Points-based wallet, no payment gateway

**Decision.** Staff credit points manually. Clients have no self-service way to buy
points. No gateway, card rail or crypto is wired.

**Why.** Real-money gambling requires a licensed jurisdiction, KYC and responsible-
gambling controls. None of that is in place, so the compliant default is a closed
points book that works for demos and internal use.

**Cost.** Deposits depend on an agent's UPI number (`deposit_mobile`) and staff data
entry. A `deposit_requests` queue is planned to make that auditable.

**Gate.** Nothing in this list ships until a named licensed jurisdiction and operator
are on record: payment rails, client cash-out, public sign-up.

## 2026-11-12 — Next.js + Postgres, embedded for now

**Decision.** Next.js 16 App Router with server components and server actions over a
Postgres database.

**Why.** Requested stack. Server components let the pages read the DB directly and
server actions remove the need for a separate API server at this size.

**Shortcut.** The database is PGlite, an embedded Postgres, so the project runs with no
server install. All SQL is plain Postgres.

**Cost.** One writer, one process. Swap to `pg` + `DATABASE_URL` before more than a
handful of concurrent staff; the queries do not change.

## 2026-11-12 — Hand-written SQL, no ORM

**Decision.** A `sql` / `one` / `tx` helper in `lib/db.ts` and explicit queries.

**Why.** The ledger's correctness depends on a guarded `UPDATE` and a transaction that
also writes the statement row. An ORM would hide exactly the part that must stay
visible.

**Cost.** Boilerplate for simple reads. Acceptable while the schema is small.

## 2026-11-12 — Append-only ledger with a stored closing balance

**Decision.** `transactions` rows are never updated or deleted. Each row stores the
balance after it (`closing`). `accounts.balance` is a denormalised copy written in the
same transaction.

**Why.** Statements render without replaying history, and the balance guard is part of
the `UPDATE`, so concurrent debits cannot both pass. Reconciliation against the sum of
the ledger is one query.

**Cost.** Two places hold the balance; a reconciliation check must exist before real
reports ship. Ledger wins on disagreement.

## 2026-11-12 — scrypt + hashed session tokens, no auth library

**Decision.** `node:crypto` scrypt for passwords; a random 32-byte session token in an
httpOnly `sid` cookie, with only its SHA-256 hash stored.

**Why.** Small surface, no dependency, and a database dump does not hand over live
sessions.

**Cost.** No password reset, MFA, or email verification yet. Add when accounts are
handed to real users.

## 2026-11-12 — Usernames globally unique

**Decision.** `unique (lower(username))` across all operators, so one login form works
without asking for a brand.

**Why.** The reference has one login URL per operator and no tenant hint. A global
username is the smallest thing that works.

**Cost.** Two operators cannot both have an account called `admin`. Relax to
`(operator_id, lower(username))` when operators share a login URL.

## 2026-11-12 — Two independent lock states

**Decision.** Keep `user_status` (login) and `bet_status` (betting) separate, as the
reference does.

**Why.** A bookmaker needs to freeze betting without kicking a user out, and to lock a
login without implying the betting rule.

**Cost.** Two toggles to explain in support and admin docs.

## 2026-11-12 — Manual settlement for both books

**Decision.** Casino and sports markets both settle when a staff member declares a
winner per market. Both post through the same ledger path.

**Why.** There is no live result feed. One declaration shape keeps settlement atomic,
auditable and identical across books.

**Cost.** Settlement is human and must be audited (who declared, when, no re-declaration).
Auto-settlement stays on the roadmap for when a feed exists.

## 2026-11-12 — Stake debited at placement, payout at settlement

**Decision.** Placing a bet debits the stake through the ledger immediately. Winners are
credited `stake × odds` when staff declare the result. Odds are snapshotted on the bet.

**Why.** The balance has to reflect money at risk the moment the bet exists; otherwise a
client could stake the same points twice. Snapshotting odds means a later market edit
cannot rewrite a payout.

**Cost.** Void/refund needs a new state plus a reversal credit, which is not built.
Double settlement is prevented by a status guard on the market `UPDATE`.

## 2026-11-17 — Correctness and trust sweep

**Decision.** Simulated rounds settle atomically by locking the round row; `super_admin`
and `operator_admin` are treated identically as admins for reach, settlement and reports;
the UI renders balances from the server and drops claims the backend cannot honour (lay
bets, odds selection, dead footer links). Crash rounds abandoned mid-flight are swept to
a terminal state without ledger movement. Details in the fixed
[design](../superpowers/specs/2026-11-17-correctness-sweep-design.md).

**Why.** Concurrent cashouts could pay twice, report scope disagreed with action scope,
and the UI implied features that do not exist. These are correctness/trust bugs, not new
features.

**Cost.** The Exchange has no lay control or odds choice and there is no real back/lay
liability engine. One-off scripts are parked in `scripts/_archive/`.

## Open decisions

| Question | Why it is open | Needed by |
| --- | --- | --- |
| Meaning and formula of "soda" (commission) | Never confirmed with the reference owner | Agent commission posting |
| Whether `default_pct` posts a ledger row or is report-only | Affects P/L, not balances | Profit/loss reports |
| Named licensed jurisdiction + operator | Compliance gate, not an engineering choice | Any real-money feature |
| When to move off embedded PGlite | Concurrency unknown | First multi-staff deployment |
| Per-module agent permissions | Roles are enough until agents have staff | Agent tooling |
