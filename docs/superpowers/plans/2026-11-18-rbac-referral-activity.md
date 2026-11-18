# Plan: Hierarchical RBAC, Referral Codes, Scoped Activity

## Files to touch

- `db/schema.sql`, `lib/auth.ts`, `lib/reports.ts`, `lib/actions.ts`
- new: `lib/access.ts`, `lib/referral.ts`, `lib/activity.ts`
- `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/new/page.tsx`,
  `app/admin/clients/[id]/page.tsx`, `app/admin/reports/page.tsx`
- new: `app/admin/activity/page.tsx`, `app/play/activity/page.tsx`
- `components/player-header.tsx`, `app/globals.css`
- `scripts/check.mjs`
- design doc above (already written)

## Step 1 — Schema and shared access helpers (commit 1)

1. Add failing assertions to `scripts/check.mjs`:
   - two inserted accounts get distinct non-null `referral_code`;
   - `update accounts set referral_code = ...` is rejected;
   - `canCreateRole` matrix and `canAct` subtree cases (admin vs sibling admin's
     client, agent vs sibling, super admin, client);
   - activity rows appear after a bet/round insert and `activityFeed` scoping.
2. `db/schema.sql`: add `referral_code text` with generated default
   `upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))`, backfill nulls,
   unique index, and a before-update trigger rejecting changes. Add
   `activity_log (id, operator_id, actor_id, target_id, action, detail, created_at)`
   plus indexes and RLS. Add AFTER INSERT triggers on `bets` and
   `simulated_game_rounds` that write `bet_placed` / `game_round` rows.
3. New `lib/access.ts`: `visibleAccountScope`, `canAct`, `canCreateRole`,
   `isAdminRole`. Update `lib/auth.ts` to re-export `canAct` from `access.ts`
   (keep existing imports working) and add `referral_code` to `Account`.
4. Update `lib/reports.ts` `scopeCte`/`scopeParams` to use the shared wide flag
   (only `super_admin`), so admin reports are subtree-scoped.
5. Run `npm run check`; all new assertions pass. Commit.

## Step 2 — Activity writes and referral lookups (commit 2)

1. New `lib/activity.ts`: `logActivity(input)` and `activityFeed(viewer, filters)`
   (filters: query string matched against username/referral_code, action).
   Feed selects rows where `actor_id` or `target_id` is in the viewer scope,
   joins accounts for names, orders by `created_at desc`, limits 200.
2. New `lib/referral.ts`: `findAccountByReferralCode(operatorId, code)` with
   uppercase/trim normalization.
3. `lib/actions.ts`: after successful mutation, log `login`, `account_created`,
   `balance_credit/debit`, `status_change`, `market_created`, `market_settled`,
   `event_created`, `sport_market_created`. Use `returning id` in
   `createAccount` so the new account can be the target.
4. Enforce `canCreateRole` in `createAccount`; invalid role redirects with error.
5. Run `npm run check`, `npx tsc --noEmit`. Commit.

## Step 3 — UI (commit 3)

1. `app/admin/page.tsx`: add Referral Code column and a GET search box filtering
   username/full_name/referral_code; keep existing role badges.
2. `app/admin/clients/[id]/page.tsx`: show referral code; add a compact recent
   activity list for that account using `activityFeed` with a target filter.
3. New `app/admin/activity/page.tsx`: filters + table (When / Actor / Action /
   Target / Detail). Add nav link in `app/admin/layout.tsx` and card in
   `app/admin/reports/page.tsx`. Fix role pill labels while there.
4. New `app/play/activity/page.tsx` with own activity; link in
   `components/player-header.tsx`.
5. Add only the minimal plain-CSS classes needed in `app/globals.css`, reusing
   `.admin-table-wrapper` / `.admin-table`.
6. Run `npm run check`, `npm run build`, and a browser smoke test of
   `/admin/activity` and `/play/activity`. Commit.

## Verification

- `npm run check` (in-memory, no `DATABASE_URL`) — must pass.
- `npm run build` — must pass.
- Login to local dev and open both activity pages; verify scoping visually.
- No production deploy unless asked.
