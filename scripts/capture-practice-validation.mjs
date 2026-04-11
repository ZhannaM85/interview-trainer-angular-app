/**
 * Captures practice (quiz) screenshots for desktop and mobile viewports.
 * Requires: `ng serve` on http://127.0.0.1:4200 (or rely on CI/local habit).
 * Run: `npx playwright install chromium` once, then `npm run e2e:screenshots`
 * Output: __screenshots__/*-practice-{question|answer}-card.png (gitignored).
 * Uses the `.quiz__card-wrap` element screenshot so the practice card is framed
 * correctly on mobile (long page above the card is excluded).
 */
import { chromium, devices } from 'playwright';
import { mkdir, readdir, unlink } from 'node:fs/promises';
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

/** Drop previous PNGs so IDE / viewers do not keep showing stale *-phase*.png files. */
try {
  for (const name of await readdir(outDir)) {
    if (name.endsWith('.png')) {
      await unlink(join(outDir, name));
    }
  }
} catch {
  /* empty or missing */
}

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
      const card = page.locator('.quiz__card-wrap');
      await card.scrollIntoViewIfNeeded();
      const qPath = join(outDir, `${slug}-01-practice-question-card.png`);
      await card.screenshot({ path: qPath });
      console.log('Wrote', qPath);

      await page.click('.interview-q__cta');
      await page.waitForSelector('.interview-answer__question', { timeout: 15_000 });
      await page.waitForSelector('.interview-answer__title', { timeout: 15_000 });
      await page.waitForSelector('.interview-answer__block--weak', { timeout: 15_000 });

      await card.scrollIntoViewIfNeeded();
      const aPath = join(outDir, `${slug}-02-practice-answer-card.png`);
      await card.screenshot({ path: aPath });
      console.log('Wrote', aPath);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log('Done. Open the *-card.png files above (not older *-phase*.png — those are removed each run).');
