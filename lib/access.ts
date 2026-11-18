import { one } from "./db.ts";
import type { Account, Role } from "./auth.ts";

/**
 * Shared staff scope. $1 operator, $2 viewer account, $3 wide flag.
 * Only a super admin is wide; admins and agents stay inside their own subtree.
 */
export const visibleAccountScope = `
  with recursive downline as (
    select id from accounts where id = $2 and operator_id = $1
    union all
    select a.id from accounts a join downline d on a.parent_id = d.id
     where a.operator_id = $1
  ),
  scope as (
    select id from accounts
     where operator_id = $1 and ($3::boolean or id in (select id from downline))
  )
`;

export const scopeParams = (viewer: Pick<Account, "id" | "operator_id" | "role">) => [
  viewer.operator_id,
  viewer.id,
  viewer.role === "super_admin",
];

export async function canAct(viewer: Account, accountId: string): Promise<boolean> {
  if (viewer.role === "client") return false;
  return Boolean(
    await one(`${visibleAccountScope} select 1 from scope where id = $4`, [...scopeParams(viewer), accountId]),
  );
}

const CREATABLE: Record<Role, Role[]> = {
  super_admin: ["operator_admin", "agent", "client"],
  operator_admin: ["agent", "client"],
  agent: ["agent", "client"],
  client: [],
};

/** Roles a viewer may create. Anything else falls back to `client`. */
export function canCreateRole(creator: Role, requested: string): requested is Role {
  return (CREATABLE[creator] ?? []).includes(requested as Role);
}
