p = r"D:\DEVELOPMENT\Stock Market\lib\actions.ts"
s = open(p, encoding="utf-8").read()
old = '  const role = str(form, "role") === "agent" ? "agent" : "client";'
new = '''  const requested = str(form, "role");
  let role = "client";
  if (viewer.role === "super_admin" && requested === "operator_admin") role = "operator_admin";
  else if (requested === "agent") role = "agent";'''
assert old in s
s = s.replace(old, new)
open(p, "w", encoding="utf-8").write(s)
print("done")
