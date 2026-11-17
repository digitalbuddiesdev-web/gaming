p = r"D:\DEVELOPMENT\Stock Market\app\admin\new\page.tsx"
s = open(p, encoding="utf-8").read()
old = '              <option value="client">Client</option>\n              <option value="agent">Agent</option>'
new = '              {canCreateAdmin ? <option value="operator_admin">Admin</option> : null}\n              <option value="client">Client</option>\n              <option value="agent">Agent</option>'
assert old in s, "not found"
s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
print("done")
