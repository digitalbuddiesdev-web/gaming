import fs from "fs";

function extractClasses(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const set = new Set();
  const regex = /className=["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    match[1].split(/\s+/).forEach((c) => {
      if (c) set.add(c);
    });
  }
  return Array.from(set);
}

console.log("Plinko:", extractClasses("components/plinko-game.tsx").filter(c => c.startsWith("sim-")));
console.log("Tower:", extractClasses("components/tower-game.tsx").filter(c => c.startsWith("sim-")));
console.log("Crash:", extractClasses("components/crash-game.tsx").filter(c => c.startsWith("sim-")));
console.log("Mines:", extractClasses("components/mines-game.tsx").filter(c => c.startsWith("sim-")));
