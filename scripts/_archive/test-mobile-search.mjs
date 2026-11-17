import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  console.log("Navigating to login...");
  await page.goto("http://localhost:3002/login", { waitUntil: "networkidle" });
  await page.click(".login-quick-btn.client");
  await page.click(".login-submit-btn");
  await page.waitForURL("**/play**", { timeout: 10000 });
  console.log("Logged in at /play on mobile viewport (375x812)");

  // Initial state: search tray should not exist
  let trayVisible = await page.isVisible(".ref-mobile-search-tray");
  console.log("Initial mobile search tray visible:", trayVisible);

  // Take screenshot before search open
  await page.screenshot({ path: "output/mobile-search-closed.png", clip: { x: 0, y: 0, width: 375, height: 320 } });

  // Click search icon in topbar
  console.log("Clicking mobile search icon...");
  await page.click(".ref-mobile-search-toggle");

  // Wait for search tray
  await page.waitForSelector(".ref-mobile-search-tray", { state: "visible" });
  trayVisible = await page.isVisible(".ref-mobile-search-tray");
  console.log("After click, search tray visible:", trayVisible);

  // Check position of search tray relative to navstrip
  const positions = await page.evaluate(() => {
    const topbar = document.querySelector(".ref-topbar").getBoundingClientRect();
    const navstrip = document.querySelector(".ref-navstrip").getBoundingClientRect();
    const searchTray = document.querySelector(".ref-mobile-search-tray").getBoundingClientRect();
    const input = document.querySelector(".ref-search-input-light");
    
    return {
      topbarBottom: topbar.bottom,
      navstripTop: navstrip.top,
      navstripBottom: navstrip.bottom,
      searchTrayTop: searchTray.top,
      searchTrayBottom: searchTray.bottom,
      inputColor: window.getComputedStyle(input).color,
      inputBg: window.getComputedStyle(input).backgroundColor,
      overflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });

  console.log("Element Positions:", positions);
  console.log("Is search tray just below navbar?", Math.abs(positions.searchTrayTop - positions.navstripBottom) <= 2);

  // Take screenshot with search bar open
  await page.screenshot({ path: "output/mobile-search-open.png", clip: { x: 0, y: 0, width: 375, height: 320 } });

  // Click close button
  console.log("Clicking close button in search tray...");
  await page.click(".ref-search-close-btn");
  await page.waitForTimeout(200);
  trayVisible = await page.isVisible(".ref-mobile-search-tray");
  console.log("After clicking close button, search tray visible:", trayVisible);

  await browser.close();
  console.log("Done!");
})();
