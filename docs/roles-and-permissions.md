# Roles and permissions

## Roles

| Role | Scope | Lands on |
| --- | --- | --- |
| `super_admin` | every account in its operator; may create other admins | `/admin` |
| `operator_admin` | every account in its operator | `/admin` |
| `agent` | own sub-tree (self + all descendants) | `/admin` |
| `client` | own account only | `/play` |

`role` is stored per account and fixed at creation. There is no self-service role change.

## Capability matrix

| Action | super_admin | operator_admin | agent | client |
| --- | --- | --- | --- | --- |
| Sign in | yes | yes | yes | yes |
| See account list | operator-wide | operator-wide | own sub-tree, excludes self | no |
| Create account | any role | any role except operator_admin | agent/client under self | no |
| Credit / debit | any account in operator | any account in operator | own sub-tree | no |
| Toggle login lock | any except self | any except self | own sub-tree, not self | no |
| Toggle betting lock | any except self | any except self | own sub-tree, not self | no |
| Declare casino / sport result | yes | yes | no | no |
| Place a casino bet | yes (own account) | yes (own account) | yes (own account) | yes (own account) |
| Reports | operator-wide | operator-wide | own sub-tree | own statement |

Legend: "no" means the server refuses, not just the UI hiding a button.

## How it is enforced

Three checks, always in this order, all server-side:

1. **Session** — `currentAccount()` joins `sessions` → `accounts` and requires
   `expires_at > now()` and `user_status = 'active'`. A locked user's existing cookie
   stops working immediately.
2. **Staff gate** — `requireStaff()` in `lib/actions.ts` redirects clients to `/login`.
3. **Reach** — `canAct(viewer, accountId)` in `lib/auth.ts`:
   - client → `false`
   - super/operator admin → target row exists in the same `operator_id`
   - agent → target is in the recursive downline rooted at the agent

Settlement actions and report scope use the same admin-role rule, so an admin cannot
declare a result or see figures for an account `canAct()` would refuse. Only a
`super_admin` can create another `operator_admin`.

Pages repeat the reach check before rendering (`/admin/clients/[id]` calls `canAct` and
returns 404 on failure), because an action can be invoked directly.

## Two independent locks

| Field | Blocks | Does not block |
| --- | --- | --- |
| `user_status = 'locked'` | login, and invalidates live sessions | nothing else |
| `bet_status = 'locked'` | placing new bets | login, credits, statement |

Self-lock is refused: staff cannot lock themselves out.

## Not built yet

- Per-module permissions (`plist` in the reference back office) — currently the role
  alone decides access.
- Agent-level casino/sports permissions.
- Audit trail of *who changed a lock*; today only ledger rows record `created_by`.

Add these with the report layer, not before, so the permission model stays one table.
