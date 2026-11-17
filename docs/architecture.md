# Architecture

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 | Server components read the DB directly; server actions remove the need for a separate API layer |
| Language | TypeScript 5, strict | |
| Database | PGlite (embedded Postgres) | Runs with no server install; plain Postgres SQL |
| Data access | Hand-written SQL + `sql` / `one` / `tx` helpers | No ORM; the ledger needs explicit control |
| Auth | `node:crypto` scrypt + hashed session token in an httpOnly cookie | No auth dependency |

`package.json` must keep `"type": "module"`. Next 16 fails with
`Specified module format (CommonJs) is not matching ... (EcmaScript Modules)`
when the package is CommonJS.

## Layers

```
app/**/page.tsx      server components: read-only rendering
lib/actions.ts       "use server" mutations, the only thing forms call
lib/auth.ts          roles, sessions, password hashing, canAct(), money()
lib/ledger.ts        moveIn() — the single write path for balances
lib/simulated-actions.ts  provably fair rounds; locks the round row while settling
lib/provably-fair.ts     seeded HMAC outcomes for crash/mines/plinko/tower
lib/reports.ts       scoped account report (casino, sports, simulated games)
lib/db.ts            PGlite singleton + sql/one/tx helpers
db/schema.sql        idempotent DDL, applied on boot
scripts/seed.mjs     operator + super admin + admin + demo client
```

Pages never write. Actions never trust the form. `lib/ledger.ts` is the only place
`accounts.balance` changes.

## Request flow: a credit

1. The form on `/admin/clients/[id]` posts to `adjustBalance` (server action).
2. `requireStaff()` loads the viewer from the `sid` cookie; clients are rejected.
3. `canAct(viewer, accountId)` checks the viewer's reach (whole operator, or own subtree).
4. `moveIn()` runs one Postgres transaction:
   - `update accounts set balance = balance + $delta ... and balance + $delta >= 0`
     — the non-negative guard is part of the `UPDATE`, so concurrent debits cannot both pass;
   - `insert into transactions` with the resulting `closing` balance;
   - `returning balance` is the only value returned.
5. `revalidatePath()` + `redirect()` back to the detail page.

A rejected debit throws *before* any row is written; the action renders the message
and the balance is untouched.

## Settlement atomicity

Payouts use one transaction: the round row is locked with `select ... for update`,
its status is checked, the credit is posted through `moveIn()`, and the row is marked
terminal. A second cashout of the same round sees the terminal status and cannot credit
again. Player pages render `balance` from the server and call `router.refresh()` after
a successful action — no client component keeps a local copy of the balance.

Crash rounds abandoned mid-flight are finalised on page load by a 30-minute stale
sweep; the stake was already debited at round start, so no ledger row moves there.

## Tenancy

Everything hangs off `operators` (one row per white-label brand). `accounts.operator_id`
is set from the viewer at creation time and every query is scoped by it. An operator
admin can never see or act on another operator's rows, even with a guessed UUID.

## Money

- All amounts are Postgres `numeric(18,2)`. No arithmetic in JS floats.
- `transactions` is append-only. Each row stores `closing`, the balance after that row,
  so a statement renders without replaying history.
- `accounts.balance` is a denormalised copy written in the same transaction as the
  ledger row. If they ever disagree, the ledger is the truth:
  `select sum(case kind when 'credit' then amount else -amount end) from transactions where account_id = $1`.

## Sessions

Random 32-byte token in an httpOnly, sameSite=lax cookie; only its SHA-256 hash is
stored, so a database dump does not hand over live sessions. Seven-day TTL, one row
per login, deleted on sign-out.

## Known shortcuts

Each is marked with a `shortcut:` comment at the code site.

| Shortcut | Current behaviour | Upgrade when |
| --- | --- | --- |
| Embedded PGlite | One writer, one process | More than a handful of concurrent staff → `pg` + `DATABASE_URL`; the SQL is unchanged |
| Global usernames | `unique (lower(username))` across all operators | Operators share a login URL → `(operator_id, lower(username))` |
| Schema on boot | `db/schema.sql` re-runs every boot, idempotent | First breaking column change → a real migration tool |
| No CSRF token | Relies on Next server actions + sameSite=lax | Adding a public JSON API |
| No rate limiting | Login is throttled only by scrypt cost | Any internet-facing deployment |
| Balance copy | `accounts.balance` must match the ledger | Add a reconciliation job / constraint when reports go live |
| Casino providers global | One catalog for every operator | A white-label needs its own game list → add `operator_id` to `casino_providers` |
| Two-sided markets | Bets only have `selection ∈ {a,b}` | A game needs more sides → normalise selections into their own table |
