# Hierarchical RBAC, Referral Codes, and Scoped Activity Design

## Intent

Add four-level hierarchy enforcement, an immutable referral code per account, and a
simple activity view where each role only sees activity from its own subtree.

## Decisions already settled with the user

- Roles: `super_admin` > `operator_admin` (shown as "Admin") > `agent` > `client`
  (shown as "User"). Existing role strings stay; no migration to `admin`/`user`.
- `parent_id` remains the single source of truth for creator/referrer. No
  `referred_by` column.
- `referral_code` is unique, generated on insert, and immutable.
- Activity is actor **or** target based, shown in one clean table per viewer.
- Visibility: super admin = all accounts in operator; admin = own subtree;
  agent = own subtree; user = self only.

## Approaches considered

1. **New separate referral relationship table** — rejected: duplicates `parent_id`
   and creates two sources of truth.
2. **Application-only activity logging in every game function** — rejected: ~10
   scattered call sites in `lib/simulated-actions.ts`; easy to miss one. Chosen
   instead: DB triggers on `bets` and `simulated_game_rounds` capture every wager,
   plus explicit `logActivity()` calls for staff/login actions.
3. **Per-role hardcoded SQL per page** — rejected: `lib/reports.ts` already has a
   recursive `scopeCte`; centralize reach in `lib/access.ts` and reuse it.

## Design

- `lib/access.ts`: `visibleAccountScope(viewer)` returns `{ cte, params }` with
  `$1` operator, `$2` viewer id, `$3` wide flag (true only `super_admin`);
  `canAct()` and `scopeCte` both use it. `canCreateRole(creator, requested)`
  enforces: super admin → admin/agent/user; admin → agent/user; agent →
  agent/user; client → none.
- `db/schema.sql`: `accounts.referral_code` with generated default, backfill,
  unique index, and immutability trigger; `activity_log` table; insert triggers
  on `bets` and `simulated_game_rounds`; RLS enabled.
- `lib/referral.ts`: `findAccountByReferralCode(operatorId, code)`.
- `lib/activity.ts`: `logActivity(...)`, `activityFeed(viewer, filters)` using
  the shared scope; rows where `actor_id` or `target_id` is in scope.
- UI: referral code columns + admin search; `/admin/activity` and
  `/play/activity` pages; nav links and report card; plain CSS reusing existing
  admin table styles.
- Tests: extend `scripts/check.mjs` (in-memory, no Supabase) for referral
  uniqueness/immutability, role matrix, subtree reach, and scoped activity.

## Non-goals

- Signup by referral code (resolving a code to `parent_id` can be added later).
- Cross-operator super-admin visibility (each tenant stays isolated).
- Redeploying production (only local code + tests in this change).
