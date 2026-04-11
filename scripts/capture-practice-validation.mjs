/**
 * Validation: Practice answer phase shows the question above answer blocks.
 * Requires: `ng serve` on http://127.0.0.1:4200
 * Run: `npm install -D playwright && npx playwright install chromium && node scripts/capture-practice-validation.mjs`
 * Output: ../__screenshots__/*.png (gitignored)
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, '__screenshots__');

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });

try {
  await page.goto('http://127.0.0.1:4200/quiz', {
    waitUntil: 'networkidle',
    timeout: 90_000
  });
  await page.waitForSelector('.interview-q__cta', { timeout: 60_000 });
  await page.screenshot({
    path: join(outDir, '01-practice-question-phase.png'),
    fullPage: true
  });

  await page.click('.interview-q__cta');
  await page.waitForSelector('.interview-answer__question', { timeout: 15_000 });
  await page.waitForSelector('.interview-answer__title', { timeout: 15_000 });
  await page.waitForSelector('.interview-answer__block--weak', { timeout: 15_000 });

  await page.screenshot({
    path: join(outDir, '02-practice-answer-phase-question-at-top.png'),
    fullPage: true
  });
} finally {
  await browser.close();
}

console.log('Screenshots written to', outDir);
