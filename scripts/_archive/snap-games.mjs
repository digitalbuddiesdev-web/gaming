import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // 1. Login
  await page.goto("http://localhost:3000/login");
  await page.click(".login-quick-btn.client");
  await page.click(".login-submit-btn");
  await page.waitForURL("**/play**", { timeout: 10000 });

  // 2. Open Crash Game
  await page.goto("http://localhost:3000/play/crash");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "output/dark-crash-idle.png" });
  console.log("Captured output/dark-crash-idle.png");

  // Launch rocket
  const launchBtn = page.locator(".sim-btn-launch");
  if (await launchBtn.isVisible()) {
    await launchBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "output/dark-crash-flying.png" });
    console.log("Captured output/dark-crash-flying.png");

    // Cash out with force: true to bypass pulse animation
    const cashoutBtn = page.locator(".sim-btn-cashout");
    if (await cashoutBtn.isVisible()) {
      await cashoutBtn.click({ force: true });
      await page.waitForTimeout(600);
      await page.screenshot({ path: "output/dark-crash-cashed.png" });
      console.log("Captured output/dark-crash-cashed.png");
    }
  }

  // 3. Open Mines Game
  await page.goto("http://localhost:3000/play/mines");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "output/dark-mines-idle.png" });
  console.log("Captured output/dark-mines-idle.png");

  // Start mines round
  const startMinesBtn = page.locator(".sim-btn-launch");
  if (await startMinesBtn.isVisible()) {
    await startMinesBtn.click();
    await page.waitForTimeout(500);

    // Click tiles 0, 1
    const tiles = page.locator(".mines-tile");
    await tiles.nth(0).click({ force: true });
    await page.waitForTimeout(400);
    await tiles.nth(1).click({ force: true });
    await page.waitForTimeout(400);

    await page.screenshot({ path: "output/dark-mines-active.png" });
    console.log("Captured output/dark-mines-active.png");

    // Cash out mines
    const cashoutMines = page.locator(".sim-btn-cashout");
    if (await cashoutMines.isVisible()) {
      await cashoutMines.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ path: "output/dark-mines-cashed.png" });
      console.log("Captured output/dark-mines-cashed.png");
    }
  }

  await browser.close();
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
