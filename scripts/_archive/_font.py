p = r"D:\DEVELOPMENT\Stock Market\app\globals.css"
s = open(p, encoding="utf-8").read()
s = s.replace('font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;',
              'font: 16px/1.5 "Roboto Condensed", "Segoe UI", system-ui, sans-serif;')
open(p, "w", encoding="utf-8").write(s)
print("done")
