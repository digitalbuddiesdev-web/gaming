import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // 1. Capture Login
  await page.goto("http://localhost:3000/login");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "output/emerald-login.png" });
  console.log("Captured output/emerald-login.png");

  // 2. Login
  await page.click(".login-quick-btn.client");
  await page.click(".login-submit-btn");
  await page.waitForURL("**/play**", { timeout: 10000 });
  await page.waitForTimeout(500);

  // 3. Capture Home
  await page.screenshot({ path: "output/emerald-home.png" });
  console.log("Captured output/emerald-home.png");

  // 4. Capture Bet Slip
  const firstBackBtn = page.locator(".ref-btn-back").first();
  await firstBackBtn.click();
  await page.waitForTimeout(400);

  const plus1000 = page.getByRole("button", { name: "+1000" });
  if (await plus1000.isVisible()) {
    await plus1000.click();
  }
  await page.waitForTimeout(400);

  await page.screenshot({ path: "output/emerald-betslip.png" });
  console.log("Captured output/emerald-betslip.png");

  await browser.close();
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
