import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const shoot = async (file, w, h, out) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('file://' + path.join(here, file));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(here, '..', out) });
  await page.close();
};
await shoot('og.html', 1200, 630, 'assets/og.png');
await shoot('icon.html', 180, 180, 'assets/apple-touch-icon.png');
await browser.close();
console.log('wrote assets/og.png and assets/apple-touch-icon.png');
