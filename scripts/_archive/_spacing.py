p = r"D:\DEVELOPMENT\Stock Market\app\globals.css"
s = open(p, encoding="utf-8").read()
s = s.replace(".sporttabs {\n  display: flex; gap: 2px; flex-wrap: wrap; padding: 6px 12px;",
            ".sporttabs {\n  display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 12px;")
s = s.replace(".sporttabs a { padding: 4px 10px; background: #fff; border: 1px solid var(--line); color: var(--text); font-size: 13px; }",
            ".sporttabs a { padding: 6px 14px; background: #fff; border: 1px solid var(--line); color: var(--text); font-size: 13px; margin-right: 4px; }")
open(p, "w", encoding="utf-8").write(s)
print("done")
