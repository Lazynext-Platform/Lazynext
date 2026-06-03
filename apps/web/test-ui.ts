import { chromium } from 'playwright';

(async () => {
  console.log('Starting Playwright test...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Listen for all console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`BROWSER ERROR: \${msg.text()}`);
    } else if (msg.type() === 'warning') {
      console.log(`BROWSER WARNING: \${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`BROWSER UNCAUGHT EXCEPTION: \${error.message}`);
  });

  try {
    console.log('Navigating to http://localhost:3000/projects');
    await page.goto('http://localhost:3000/projects', { waitUntil: 'networkidle' });

    console.log('Clicking "New project"...');
    await page.click('button:has-text("New project")');

    console.log('Waiting for editor to load...');
    await page.waitForTimeout(3000); 

    console.log('Checking if Timeline and Inspector are visible...');
    const inspectorVisible = await page.isVisible('text="Inspector"');
    const devConsoleVisible = await page.isVisible('text="Dev Console"');

    console.log(`Inspector visible: ${inspectorVisible}`);
    console.log(`Dev Console visible: ${devConsoleVisible}`);

    await page.screenshot({ path: '/Users/avaspatel/.gemini/antigravity/brain/e12a0569-6779-4cf8-a677-da16da11807d/editor-screenshot.png' });
    console.log('Screenshot saved to editor-screenshot.png');

    console.log('Test completed successfully!');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await browser.close();
  }
})();
