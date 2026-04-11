/**
 * Captures practice (quiz) screenshots for desktop and mobile viewports.
 * Requires: `ng serve` on http://127.0.0.1:4200 (or rely on CI/local habit).
 * Run: `npx playwright install chromium` once, then `npm run e2e:screenshots`
 * Output: __screenshots__/ (gitignored)
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, '__screenshots__');

const profiles = [
  {
    slug: 'desktop',
    contextOptions: { viewport: { width: 900, height: 1000 } }
  },
  {
    slug: 'mobile-pixel5',
    contextOptions: devices['Pixel 5']
  }
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

try {
  for (const { slug, contextOptions } of profiles) {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    try {
      await page.goto('http://127.0.0.1:4200/quiz', {
        waitUntil: 'networkidle',
        timeout: 90_000
      });
      await page.waitForSelector('.interview-q__cta', { timeout: 60_000 });
      await page.screenshot({
        path: join(outDir, `${slug}-01-practice-question-phase.png`),
        fullPage: true
      });

      await page.click('.interview-q__cta');
      await page.waitForSelector('.interview-answer__question', { timeout: 15_000 });
      await page.waitForSelector('.interview-answer__title', { timeout: 15_000 });
      await page.waitForSelector('.interview-answer__block--weak', { timeout: 15_000 });

      await page.screenshot({
        path: join(outDir, `${slug}-02-practice-answer-phase.png`),
        fullPage: true
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log('Screenshots written to', outDir);
