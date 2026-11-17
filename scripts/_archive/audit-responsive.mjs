import { chromium } from "playwright";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const PAGES_TO_TEST = [
  { path: "/login", name: "login", auth: false },
  { path: "/play", name: "play-home", auth: true },
  { path: "/play/casino", name: "play-casino", auth: true },
  { path: "/play/crash", name: "play-crash", auth: true },
  { path: "/play/mines", name: "play-mines", auth: true },
  { path: "/play/plinko", name: "play-plinko", auth: true },
  { path: "/play/tower", name: "play-tower", auth: true },
  { path: "/admin", name: "admin-home", auth: "admin" },
];

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    // 1. Check Login
    await page.goto("http://localhost:3002/login", { waitUntil: "networkidle" });
    const loginOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await page.screenshot({ path: `output/responsive-${vp.name}-login.png` });
    results.push({ page: "login", viewport: vp.name, overflow: loginOverflow });

    // 2. Client Login
    await page.click(".login-quick-btn.client");
    await page.click(".login-submit-btn");
    await page.waitForURL("**/play**", { timeout: 10000 });

    // 3. Test player pages
    for (const item of PAGES_TO_TEST) {
      if (!item.auth || item.auth === "admin") continue;
      await page.goto(`http://localhost:3002${item.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      const overflowWidth = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: window.innerWidth,
          diff: document.documentElement.scrollWidth - window.innerWidth
        };
      });

      await page.screenshot({ path: `output/responsive-${vp.name}-${item.name}.png` });
      console.log(`[${vp.name}] ${item.name}: overflow=${hasOverflow} (scrollWidth=${overflowWidth.scrollWidth}, clientWidth=${overflowWidth.clientWidth}, diff=${overflowWidth.diff})`);
      results.push({ page: item.name, viewport: vp.name, overflow: hasOverflow, ...overflowWidth });
    }

    // 4. Test admin login & admin page
    await page.goto("http://localhost:3002/login", { waitUntil: "networkidle" });
    await page.click(".login-quick-btn.admin");
    await page.click(".login-submit-btn");
    await page.waitForURL("**/admin**", { timeout: 10000 });
    await page.waitForTimeout(400);

    const adminOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const adminDetails = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: window.innerWidth,
      diff: document.documentElement.scrollWidth - window.innerWidth
    }));
    await page.screenshot({ path: `output/responsive-${vp.name}-admin.png` });
    console.log(`[${vp.name}] admin: overflow=${adminOverflow} (scrollWidth=${adminDetails.scrollWidth}, clientWidth=${adminDetails.clientWidth}, diff=${adminDetails.diff})`);
    results.push({ page: "admin", viewport: vp.name, overflow: adminOverflow, ...adminDetails });

    await context.close();
  }

  await browser.close();
  console.log("\n=== Full Audit Results ===");
  console.table(results);
})().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
