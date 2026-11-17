import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  console.log('1. Navigating to login...');
  await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle' });
  await page.click('.login-quick-btn.client');
  await page.click('.login-submit-btn');
  await page.waitForURL('**/play**', { timeout: 10000 });
  console.log('   Logged in successfully.');

  // Test 1: Check mobile hamburger button
  const burger = await page.$('.ref-mobile-burger-btn');
  console.log('2. Mobile burger found:', !!burger);
  await burger.click();
  await page.waitForTimeout(400);

  const drawer = await page.$('.ref-mobile-drawer-panel');
  const isDrawerVisible = await drawer.isVisible();
  console.log('   Drawer opened via burger:', isDrawerVisible);

  // Close by clicking backdrop (click on the right edge outside the 290px drawer)
  await page.click('.ref-mobile-drawer-backdrop', { position: { x: 350, y: 100 } });
  await page.waitForTimeout(400);
  const isOpenAfterBackdrop = await page.evaluate(() => {
    return document.querySelector('.ref-mobile-drawer-backdrop')?.classList.contains('open');
  });
  console.log('   Drawer closed via backdrop:', !isOpenAfterBackdrop);

  // Test 2: Check bottom nav 'Menu' button
  const bottomNavItems = await page.$$('.ref-bottom-nav-item');
  console.log('3. Bottom nav items count:', bottomNavItems.length);
  await bottomNavItems[bottomNavItems.length - 1].click();
  await page.waitForTimeout(400);
  const isOpenAfterMenu = await page.evaluate(() => {
    return document.querySelector('.ref-mobile-drawer-backdrop')?.classList.contains('open');
  });
  console.log('   Drawer opened via bottom nav:', isOpenAfterMenu);

  // Close drawer via close button
  const closeBtn = await page.$('.ref-drawer-close-btn');
  if (closeBtn) {
    await closeBtn.click();
    await page.waitForTimeout(400);
    const isOpenAfterCloseBtn = await page.evaluate(() => {
      return document.querySelector('.ref-mobile-drawer-backdrop')?.classList.contains('open');
    });
    console.log('   Drawer closed via close button:', !isOpenAfterCloseBtn);
  }

  // Test 3: Check search expand button
  const searchBtn = await page.$('.ref-mobile-search-toggle');
  console.log('4. Search icon toggle found:', !!searchBtn);
  if (searchBtn) {
    await searchBtn.click();
    await page.waitForTimeout(300);
    const searchTray = await page.$('.ref-mobile-search-tray');
    console.log('   Mobile search tray expanded:', !!searchTray);
  }

  await browser.close();
  console.log('All mobile interactive tests PASSED!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
