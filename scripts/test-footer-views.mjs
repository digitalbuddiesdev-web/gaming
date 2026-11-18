import { chromium } from "playwright";

const artifactDir = "C:/Users/adity/.gemini/antigravity/brain/a7ccc615-88a3-4cdc-b13b-a558d283402c";

async function main() {
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  // 1. Desktop Test
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await desktopPage.click(".login-quick-btn.client");
  await desktopPage.click(".login-submit-btn");
  await desktopPage.waitForURL("**/play**", { timeout: 10000 });
  await desktopPage.waitForTimeout(1000);

  console.log("Capturing desktop full-width footer...");
  await desktopPage.locator(".platform-luxury-footer").scrollIntoViewIfNeeded();
  await desktopPage.waitForTimeout(500);
  await desktopPage.screenshot({ path: `${artifactDir}/screen_footer_fullwidth_desktop.png`, fullPage: false });

  // 2. Mobile Viewport Test (390x844)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await mobilePage.click(".login-quick-btn.client");
  await mobilePage.click(".login-submit-btn");
  await mobilePage.waitForURL("**/play**", { timeout: 10000 });
  await mobilePage.waitForTimeout(1000);

  console.log("Capturing mobile footer (collapsed dropdowns)...");
  await mobilePage.locator(".platform-luxury-footer").scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({ path: `${artifactDir}/screen_footer_mobile_collapsed.png`, fullPage: false });

  console.log("Expanding Sportsbook and Casino Originals dropdowns...");
  // Click to open Sportsbook and Casino Originals accordions
  const buttons = await mobilePage.locator(".footer-col-header-btn").all();
  if (buttons.length >= 2) {
    await buttons[0].click(); // Sportsbook
    await mobilePage.waitForTimeout(200);
    await buttons[1].click(); // Casino Originals
    await mobilePage.waitForTimeout(300);
  }

  await mobilePage.screenshot({ path: `${artifactDir}/screen_footer_mobile_expanded.png`, fullPage: false });
  console.log("Mobile footer screenshots captured successfully!");

  await browser.close();
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
