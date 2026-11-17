# Platform docs

An original, white-label betting back office: operators credit points to an agent/client
tree, staff settle markets, and every movement lands in an append-only ledger.

This is **not** a copy of any reference product. It implements the same *feature
categories* (points wallet, user tree, manual credits, casino/sports settlement,
reports) from scratch. No reference code, design or assets were used.

## Status at a glance

| Area | State |
| --- | --- |
| Tenancy, accounts, auth | Built |
| Points ledger (credit/debit + statement) | Built |
| Account locks (login / betting) | Built |
| Demo book | Built |
| Casino catalog, manual result declaration | Built |
| Sports fixtures, markets, bets, manual result declaration | Built — no live result feed |
| Simulated games (crash, mines, plinko, tower) | Built — provably fair, atomic settlement |
| Deposit-request queue | Planned |
| Reports (statement, current bets, P/L, users2 summary) | Built |
| Real-money payment rails | **Not built, deliberately** — see [decisions](decisions.md) |

## Run it locally

```bash
npm install
npm run seed      # first time only; needs the server stopped
npm run dev       # http://localhost:3000
```

Seeded accounts (change before this reaches a real environment):

| Account | Password | Role |
| --- | --- | --- |
| `superadmin` | `admin12345` | super admin |
| `admin` | `admin12345` | operator admin |
| `demouser` | `admin12345` | client, demo book, 1500 points |

Production build:

```bash
npm run build
npm run start
npm run check     # money-path self-check, in-memory, no server needed
```

`npm run seed` writes to `.data/pg` and must run while no server is attached
(embedded database, single writer). See [architecture](architecture.md).

## Read next

- [architecture.md](architecture.md) — stack, layers, request flow, known shortcuts
- [data-model.md](data-model.md) — tables, columns, ledger invariants
- [roles-and-permissions.md](roles-and-permissions.md) — who can do what, and where it is enforced
- [admin-guide.md](admin-guide.md) — day-to-day operating tasks
- [roadmap.md](roadmap.md) — what is left, in build order
- [decisions.md](decisions.md) — decision log, including the licensing gate
- [reference-ui-notes.md](reference-ui-notes.md) — player/admin UI patterns observed in the
  reference product, and the third-party game API contract we would need
