/**
 * Capture a single mobile viewport PNG for Play Store mockups.
 * Uses Playwright so we can wait for the portaled bottom nav (hydration) before shooting.
 *
 * Usage: node scripts/play-store-capture.mjs <url> <output.png>
 */
import { chromium } from 'playwright';

const url = process.argv[2];
const outPath = process.argv[3];

if (!url || !outPath) {
  console.error('Usage: node scripts/play-store-capture.mjs <url> <output.png>');
  process.exit(1);
}

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const VIEWPORT = { width: 390, height: 844 };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: UA,
    locale: 'en-US',
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForSelector('nav[aria-label="Main"]', { timeout: 45_000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));
  await page.screenshot({ path: outPath, type: 'png', animations: 'disabled' });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
