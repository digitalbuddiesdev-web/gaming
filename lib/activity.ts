import type { Account } from "./auth.ts";
import { scopeParams, visibleAccountScope } from "./access.ts";
import { sql } from "./db.ts";
import { findAccountByReferralCode } from "./referral.ts";

export type ActivityRow = {
  id: string;
  actor_id: string | null;
  target_id: string | null;
  actor: string | null;
  target: string | null;
  action: string;
  detail: string | null;
  created_at: string;
};

export type ActivityInput = {
  operatorId: string;
  actorId?: string | null;
  targetId?: string | null;
  action: string;
  detail?: string | null;
};

export async function logActivity(input: ActivityInput): Promise<void> {
  await sql(
    `insert into activity_log (operator_id, actor_id, target_id, action, detail)
     values ($1, $2, $3, $4, $5)`,
    [input.operatorId, input.actorId ?? null, input.targetId ?? null, input.action, input.detail ?? null],
  );
}

export type ActivityFilters = { query?: string; action?: string; targetId?: string };

/** Rows where the actor or the target is in the viewer's subtree, newest first. */
export async function activityFeed(viewer: Account, filters: ActivityFilters = {}): Promise<ActivityRow[]> {
  const params: unknown[] = scopeParams(viewer);
  let where = "";
  const query = filters.query?.trim() ?? "";

  if (query) {
    const byCode = /^[0-9a-f]{8}$/i.test(query)
      ? await findAccountByReferralCode(viewer.operator_id, query)
      : null;
    params.push(byCode ? byCode.id : `%${query}%`);
    where += byCode
      ? ` and (l.actor_id = $${params.length} or l.target_id = $${params.length})`
      : ` and (lower(coalesce(actor.username, '')) like lower($${params.length})
            or lower(coalesce(target.username, '')) like lower($${params.length}))`;
  }
  if (filters.targetId) {
    params.push(filters.targetId);
    where += ` and l.target_id = $${params.length}`;
  }
  if (filters.action) {
    params.push(filters.action);
    where += ` and l.action = $${params.length}`;
  }

  return sql<ActivityRow>(
    `${visibleAccountScope}
     select l.id, l.actor_id, l.target_id, actor.username as actor, target.username as target,
            l.action, l.detail, l.created_at
       from activity_log l
       left join accounts actor on actor.id = l.actor_id
       left join accounts target on target.id = l.target_id
      where l.operator_id = $1
        and (l.actor_id in (select id from scope) or l.target_id in (select id from scope))
        ${where}
      order by l.created_at desc
      limit 200`,
    params,
  );
}
