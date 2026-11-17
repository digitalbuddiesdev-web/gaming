p = r"D:\DEVELOPMENT\Stock Market\db\schema.sql"
s = open(p, encoding="utf-8").read()
s = s.replace("check (role in ('operator_admin', 'agent', 'client'))",
              "check (role in ('super_admin', 'operator_admin', 'agent', 'client'))")
open(p, "w", encoding="utf-8").write(s)
print("done")
