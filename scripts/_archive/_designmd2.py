p = r"D:\DEVELOPMENT\Stock Market\app\globals.css"
s = open(p, encoding="utf-8").read()
s = s.replace("  --bg: #0d1117;", "  --bg: #000000;")
s = s.replace("  --panel: #161b22;", "  --panel: #111111;")
s = s.replace("  --line: #263041;", "  --line: #bbbbbb;")
s = s.replace("  --text: #e6edf3;", "  --text: #ffffff;")
s = s.replace("  --muted: #8b98a9;", "  --muted: #bbbbbb;")
s = s.replace("  --accent: #2f81f7;", "  --accent: #0088cc;")
# add secondary + radius + chrome if missing
s = s.replace("  --warn: #d29922;\n}", "  --warn: #d29922;\n  --secondary: #0d6efd;\n  --chrome: #2c3e50;\n  --radius: 3px;\n}")
s = s.replace("border-radius: 0;", "border-radius: var(--radius);")
open(p, "w", encoding="utf-8").write(s)
print("done")
