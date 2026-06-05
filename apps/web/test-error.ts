import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER_ERROR:', error.message, error.stack));

  console.log('Navigating to http://localhost:3000/editor/test-id...');
  await page.goto('http://localhost:3000/editor/test-id');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
