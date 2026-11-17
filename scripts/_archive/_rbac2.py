p = r"D:\DEVELOPMENT\Stock Market\lib\auth.ts"
s = open(p, encoding="utf-8").read()
s = s.replace('export type Role = "operator_admin" | "agent" | "client";',
              'export type Role = "super_admin" | "operator_admin" | "agent" | "client";')
old = '''export async function canAct(viewer: Account, accountId: string): Promise<boolean> {
  if (viewer.role === "client") return false;
  if (viewer.role === "operator_admin") {
    return Boolean(
      await one(`select 1 from accounts where id = $1 and operator_id = $2`, [accountId, viewer.operator_id]),
    );
  }'''
new = '''export async function canAct(viewer: Account, accountId: string): Promise<boolean> {
  if (viewer.role === "client") return false;
  if (viewer.role === "super_admin" || viewer.role === "operator_admin") {
    return Boolean(
      await one(`select 1 from accounts where id = $1 and operator_id = $2`, [accountId, viewer.operator_id]),
    );
  }'''
assert old in s
s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
print("done")
