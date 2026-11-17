p = r"D:\DEVELOPMENT\Stock Market\app\globals.css"
s = open(p, encoding="utf-8").read()
extra = open(r"D:\DEVELOPMENT\Stock Market\scripts\_homecss.txt", encoding="utf-8").read()
s = s + "\n" + extra
open(p, "w", encoding="utf-8").write(s)
print("done")
