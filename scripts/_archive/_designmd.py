p = r"D:\DEVELOPMENT\Stock Market\app\globals.css"
s = open(p, encoding="utf-8").read()
# Replace :root block
import re
old_root = """:root {
  --bg: #0d1117;
  --panel: #161b22;
  --line: #263041;
  --text: #e6edf3;
  --muted: #8b98a9;
  --accent: #2f81f7;
  --credit: #3fb950;
  --debit: #f85149;
  --warn: #d29922;
  --chrome: #2c3e50;
}"""
new_root = """:root {
  --bg: #000000;
  --panel: #111111;
  --line: #bbbbbb;
  --text: #ffffff;
  --muted: #bbbbbb;
  --accent: #0088cc;
  --secondary: #0d6efd;
  --credit: #3fb950;
  --debit: #f85149;
  --warn: #d29922;
  --chrome: #2c3e50;
  --radius: 3px;
}"""
assert old_root in s, "root not found"
s = s.replace(old_root, new_root)
# radius 0 -> 3px for card, btn, chip, tile, ladder-row, price, etc.
s = s.replace("border-radius: 0;", "border-radius: var(--radius);")
open(p, "w", encoding="utf-8").write(s)
print("done")
