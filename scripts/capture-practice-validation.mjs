/**
 * Captures practice (quiz) screenshots for desktop and mobile viewports.
 * Requires: `ng serve` on http://127.0.0.1:4200 (or rely on CI/local habit).
 * Run: `npx playwright install chromium` once, then `npm run e2e:screenshots`
 *
 * Output layout:
 *   __screenshots__/<group>/desktop-01-practice-question-card.png
 *   __screenshots__/<group>/mobile-pixel5-02-practice-answer-card.png
 * <group> is derived from the current git branch: the highest DAY<number> match
 * (e.g. feat/...-DAY10-... → DAY10). Override: SCREENSHOT_GROUP=my-run npm run e2e:screenshots
 * If no DAY digit segment exists, uses "local".
 *
 * Screenshots the visible practice card: `.quiz__phase.card-phase` inside
 * `.quiz__card-wrap[data-phase=…]` (border/background), not the unstyled outer wrap.
 */
import { execSync } from 'node:child_process';
import { chromium, devices } from 'playwright';
import { mkdir, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/**
 * @returns {string} Safe folder segment, e.g. DAY10 or local
 */
function resolveScreenshotGroup(repoRoot) {
  const fromEnv = process.env.SCREENSHOT_GROUP?.trim();
  if (fromEnv) {
    return fromEnv.replace(/[^a-zA-Z0-9._-]/g, '-') || 'local';
  }
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    const matches = [...branch.matchAll(/DAY(\d+)/gi)].map((m) => Number.parseInt(m[1], 10));
    if (matches.length > 0) {
      const n = Math.max(...matches);
      return `DAY${n}`;
    }
  } catch {
    /* not a git checkout, etc. */
  }
  return 'local';
}

const group = resolveScreenshotGroup(root);
const outDir = join(root, '__screenshots__', group);

/** Wait for CSS transitions/animations on the card so screenshots are not mid-fade. */
async function waitForCardAnimations(locator) {
  await locator.evaluate(async (el) => {
    const anims = el.getAnimations?.() ?? [];
    await Promise.all(anims.map((a) => a.finished.catch(() => undefined)));
  });
}

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

/** Clear only this group folder so other DAY* runs stay on disk. */
try {
  for (const name of await readdir(outDir)) {
    if (name.endsWith('.png')) {
      await unlink(join(outDir, name));
    }
  }
} catch {
  /* empty or missing */
}

console.log('Screenshot group folder:', group, '→', outDir);

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
      const questionCard = page.locator('.quiz__card-wrap[data-phase="question"] .quiz__phase.card-phase');
      await questionCard.scrollIntoViewIfNeeded();
      await waitForCardAnimations(questionCard);
      const qPath = join(outDir, `${slug}-01-practice-question-card.png`);
      await questionCard.screenshot({ path: qPath });
      console.log('Wrote', qPath);

      await page.click('.interview-q__cta');
      await page.waitForSelector('.quiz__card-wrap[data-phase="answer"]', { timeout: 15_000 });
      await page.waitForSelector('.interview-answer__title', { timeout: 15_000 });
      await page.waitForSelector('.interview-answer__block--weak', { timeout: 15_000 });

      const answerCard = page.locator('.quiz__card-wrap[data-phase="answer"] .quiz__phase.card-phase');
      await answerCard.scrollIntoViewIfNeeded();
      await waitForCardAnimations(answerCard);
      const aPath = join(outDir, `${slug}-02-practice-answer-card.png`);
      await answerCard.screenshot({ path: aPath });
      console.log('Wrote', aPath);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log('Done. Files are under __screenshots__/' + group + '/');
