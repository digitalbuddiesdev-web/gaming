import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  await page.goto("http://localhost:3000/login");
  await page.fill('input[name="username"]', "demouser");
  await page.fill('input[name="password"]', "admin12345");
  await page.click('button[type="submit"]');
  
  await page.waitForURL("**/play**", { timeout: 10000 });
  await page.waitForTimeout(500);

  // Click the first Back button
  const firstBackBtn = page.locator(".ref-btn-back").first();
  await firstBackBtn.click();
  await page.waitForTimeout(500);

  // Click +500 quick stake chip
  const plus500 = page.getByRole("button", { name: "+500", exact: true });
  if (await plus500.isVisible()) {
    await plus500.click();
  }
  await page.waitForTimeout(500);

  await page.screenshot({ path: "output/betslip-active.png", fullPage: false });
  console.log("Screenshot successfully saved to output/betslip-active.png");
  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
