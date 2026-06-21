import { test, expect } from '@playwright/test';

test.describe('Quiz session always reaches chosen size', () => {
  test('quick session (5) delivers 5 questions even with no studied topics', async ({ page }) => {
    await page.goto('/#/quiz');
    await page.locator('.quiz__session-mode-btn').first().click();
    await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

    const progress = page.locator('.quiz__progress');
    await expect(progress).toBeVisible();
    const text = await progress.textContent();
    expect(text).toContain('5');
  });

  test('standard session (15) delivers 15 questions even with no studied topics', async ({ page }) => {
    await page.goto('/#/quiz');
    await page.locator('.quiz__session-mode-btn').nth(1).click();
    await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

    const progress = page.locator('.quiz__progress');
    await expect(progress).toBeVisible();
    const text = await progress.textContent();
    expect(text).toContain('15');
  });
});
