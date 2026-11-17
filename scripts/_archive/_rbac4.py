p = r"D:\DEVELOPMENT\Stock Market\app\admin\page.tsx"
s = open(p, encoding="utf-8").read()
s = s.replace('viewer.role === "operator_admin"', 'viewer.role === "super_admin" || viewer.role === "operator_admin"')
open(p, "w", encoding="utf-8").write(s)
print("done")
