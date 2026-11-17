import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to login...");
  await page.goto("http://localhost:3002/login", { waitUntil: "networkidle" });
  await page.click(".login-quick-btn.client");
  await page.click(".login-submit-btn");
  await page.waitForURL("**/play**", { timeout: 10000 });
  console.log("Logged in, currently at /play");

  await page.waitForSelector(".ref-user-badge-btn");
  console.log("Clicking user badge button to open dropdown...");
  await page.click(".ref-user-badge-btn");

  await page.waitForSelector(".ref-dropdown-menu-active", { state: "visible" });
  console.log("Dropdown menu is visible!");

  // Check styles of dropdown and items
  const menuInfo = await page.evaluate(() => {
    const dropdown = document.querySelector(".ref-dropdown-menu-active");
    const item = document.querySelector(".ref-menu-item");
    const title = document.querySelector(".ref-dropdown-user-title");
    const badgeBtn = document.querySelector(".ref-user-badge-btn");
    
    return {
      dropdownBg: window.getComputedStyle(dropdown).backgroundColor,
      dropdownBorder: window.getComputedStyle(dropdown).borderColor,
      dropdownBoxShadow: window.getComputedStyle(dropdown).boxShadow,
      itemColor: window.getComputedStyle(item).color,
      itemBg: window.getComputedStyle(item).backgroundColor,
      itemFontSize: window.getComputedStyle(item).fontSize,
      itemFontWeight: window.getComputedStyle(item).fontWeight,
      titleColor: window.getComputedStyle(title).color,
      badgeBtnBg: window.getComputedStyle(badgeBtn).backgroundColor,
      badgeBtnBorder: window.getComputedStyle(badgeBtn).borderColor
    };
  });

  console.log("Computed Dropdown Styles:", menuInfo);

  // Take screenshot of the top header area with dropdown open
  await page.screenshot({ path: "output/user-dropdown-open.png", clip: { x: 900, y: 0, width: 540, height: 450 } });
  console.log("Screenshot saved to output/user-dropdown-open.png");

  // Also test on mobile viewport
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:3002/login", { waitUntil: "networkidle" });
  await mobilePage.click(".login-quick-btn.client");
  await mobilePage.click(".login-submit-btn");
  await mobilePage.waitForURL("**/play**", { timeout: 10000 });
  await mobilePage.click(".ref-user-badge-btn");
  await mobilePage.waitForSelector(".ref-dropdown-menu-active", { state: "visible" });
  await mobilePage.screenshot({ path: "output/user-dropdown-mobile.png", clip: { x: 100, y: 0, width: 275, height: 420 } });
  console.log("Mobile screenshot saved to output/user-dropdown-mobile.png");

  await browser.close();
  console.log("Done!");
})();
