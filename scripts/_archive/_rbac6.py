p = r"D:\DEVELOPMENT\Stock Market\scripts\seed.mjs"
s = open(p, encoding="utf-8").read()

# Insert superadmin creation after admin creation block. Find the admin block.
old_admin = """const admin = (
  await db.query(
    `insert into accounts (operator_id, username, full_name, password_hash, role)
     values ($1, $2, $3, $4, 'operator_admin')
     on conflict (operator_id, username) do update set password_hash = excluded.password_hash
     returning id`,
    [operator.id, "admin", "Operator Admin", hash(PASSWORD)],
  )
).rows[0];"""

new_admin = old_admin + """

const superadmin = (
  await db.query(
    `insert into accounts (operator_id, username, full_name, password_hash, role)
     values ($1, $2, $3, $4, 'super_admin')
     on conflict (operator_id, username) do update set password_hash = excluded.password_hash, role = 'super_admin'
     returning id`,
    [operator.id, "superadmin", "Super Admin", hash(PASSWORD)],
  )
).rows[0];"""

assert old_admin in s
s = s.replace(old_admin, new_admin)

# Update console.log
s = s.replace("console.log(`  admin    : admin / ${PASSWORD}`);",
              "console.log(`  superadmin : superadmin / ${PASSWORD}`);\nconsole.log(`  admin      : admin / ${PASSWORD}`);")

open(p, "w", encoding="utf-8").write(s)
print("done")
