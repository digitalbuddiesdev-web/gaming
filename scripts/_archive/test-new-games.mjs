import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("dialog", (dialog) => {
    console.log("Dialog opened:", dialog.message());
    dialog.accept();
  });

  console.log("1. Navigating to login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.click(".login-quick-btn.client");
  await page.click(".login-submit-btn");
  await page.waitForURL("**/play**", { timeout: 10000 });
  console.log("Logged in successfully. URL:", page.url());

  // Test Plinko Physics
  console.log("2. Testing Plinko Physics (/play/plinko)...");
  await page.goto("http://localhost:3000/play/plinko", { waitUntil: "networkidle" });
  await page.waitForSelector(".sim-plinko-canvas");
  
  // Click Drop Ball
  const dropBtn = page.locator(".sim-btn-primary");
  await dropBtn.click();
  console.log("Dropped ball on Plinko pegboard!");
  await page.waitForTimeout(2000); // Allow ball to drop and settle in bucket

  // Open Fairness Modal
  await page.click(".sim-fair-btn");
  await page.waitForSelector(".sim-modal-card");
  await page.click(".sim-btn-verify");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "scripts/plinko-test.png" });
  console.log("Plinko screenshot saved to scripts/plinko-test.png");
  await page.click(".sim-modal-header button"); // Close modal

  // Test Tower Ascent
  console.log("3. Testing Tower Ascent (/play/tower)...");
  await page.goto("http://localhost:3000/play/tower", { waitUntil: "networkidle" });
  await page.waitForSelector(".sim-tower-stage");

  // Click Ascend Tower
  const ascendBtn = page.locator(".sim-btn-primary");
  await ascendBtn.click();
  await page.waitForSelector(".sim-tower-floor.current", { timeout: 10000 });
  console.log("Tower ascent started, Floor 1 active!");

  // Click first tile on floor 1
  const activeTile = page.locator(".sim-tower-floor.current .sim-tower-tile.active-selectable").first();
  await activeTile.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "scripts/tower-test.png" });
  console.log("Tower screenshot saved to scripts/tower-test.png");

  // Test Casino Lobby Originals Showcase
  console.log("4. Testing Casino Lobby Originals (/play/casino)...");
  await page.goto("http://localhost:3000/play/casino", { waitUntil: "networkidle" });
  await page.waitForSelector(".sim-originals-section", { timeout: 10000 });
  await page.screenshot({ path: "scripts/casino-lobby.png" });
  console.log("Casino lobby screenshot saved to scripts/casino-lobby.png");

  await browser.close();
  console.log("All tests passed successfully!");
})().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

