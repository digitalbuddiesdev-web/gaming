import { chromium } from "playwright";

const artifactDir = "C:/Users/adity/.gemini/antigravity/brain/a7ccc615-88a3-4cdc-b13b-a558d283402c";

async function main() {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  console.log("Capturing /login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: `${artifactDir}/screen_login.png`, fullPage: false });

  console.log("Logging in via demo client...");
  await page.click(".login-quick-btn.client");
  await page.click(".login-submit-btn");
  await page.waitForURL("**/play**", { timeout: 10000 });
  await page.waitForTimeout(1000);

  console.log("Capturing /play...");
  await page.screenshot({ path: `${artifactDir}/screen_play.png`, fullPage: false });

  console.log("Capturing /play/roulette...");
  await page.goto("http://localhost:3000/play/roulette", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/screen_roulette.png`, fullPage: false });

  console.log("Capturing /play/cards...");
  await page.goto("http://localhost:3000/play/cards", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${artifactDir}/screen_cards.png`, fullPage: false });

  console.log("Capturing /play footer...");
  await page.locator(".platform-luxury-footer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${artifactDir}/screen_footer.png`, fullPage: false });

  console.log("All screenshots captured successfully!");
  await browser.close();
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
