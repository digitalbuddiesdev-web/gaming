p = r"D:\DEVELOPMENT\Stock Market\app\admin\new\page.tsx"
s = open(p, encoding="utf-8").read()
# add import for currentAccount
s = s.replace('import { createAccount } from "@/lib/actions";',
              'import { createAccount } from "@/lib/actions";\nimport { currentAccount } from "@/lib/auth";')
# make component async and fetch viewer
s = s.replace('export default async function NewAccount({\n  searchParams,\n}: {\n  searchParams: Promise<{ error?: string }>;\n}) {\n  const { error } = await searchParams;',
              'export default async function NewAccount({\n  searchParams,\n}: {\n  searchParams: Promise<{ error?: string }>;\n}) {\n  const { error } = await searchParams;\n  const viewer = await currentAccount();\n  const canCreateAdmin = viewer?.role === "super_admin";')
# add admin option conditionally
s = s.replace('               <option value="client">Client</option>\n               <option value="agent">Agent</option>',
              '               {canCreateAdmin ? <option value="operator_admin">Admin</option> : null}\n               <option value="client">Client</option>\n               <option value="agent">Agent</option>')
open(p, "w", encoding="utf-8").write(s)
print("done")
