p = r"D:\DEVELOPMENT\Stock Market\app\admin\page.tsx"
s = open(p, encoding="utf-8").read()
s = s.replace('{row.role === "operator_admin" ? "Operator admin" : row.role === "agent" ? "Agent" : "Client"}',
              '{row.role === "super_admin" ? "Super admin" : row.role === "operator_admin" ? "Admin" : row.role === "agent" ? "Agent" : "Client"}')
open(p, "w", encoding="utf-8").write(s)
print("done")
