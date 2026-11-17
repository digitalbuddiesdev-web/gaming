import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // 1. Check Login Page
  console.log("Testing Login Page...");
  await page.goto("http://localhost:3000/login");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "output/login-upgraded.png" });
  console.log("Saved output/login-upgraded.png");

  // 2. Click Quick Demo Client button
  const fillBtn = page.locator(".login-quick-btn.client");
  await fillBtn.click();
  await page.waitForTimeout(300);

  // 3. Submit Login
  await page.click(".login-submit-btn");
  await page.waitForURL("**/play**", { timeout: 10000 });
  console.log("Logged in successfully to /play");
  await page.waitForTimeout(500);

  // 4. Test Dropdown Feature
  const userBadgeBtn = page.locator(".ref-user-badge-btn");
  await userBadgeBtn.click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: "output/dropdown-active.png" });
  console.log("Saved output/dropdown-active.png");

  // 5. Test navigation to Statement via Dropdown
  const stmtLink = page.locator('.ref-dropdown-menu-active a:has-text("Account Statement")');
  await stmtLink.click();
  await page.waitForURL("**/play/statement**", { timeout: 10000 });
  await page.waitForTimeout(500);

  await page.screenshot({ path: "output/statement-themed.png" });
  console.log("Saved output/statement-themed.png");

  await browser.close();
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
