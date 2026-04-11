import { test, expect } from '@playwright/test';

test.describe('Practice / quiz answer phase', () => {
  test('question block appears above weak answer', async ({ page }) => {
    await page.goto('/quiz');
    await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });
    await page.locator('.interview-q__cta').click();

    const questionTitle = page.locator('.interview-answer__title');
    const weakBlock = page.locator('.interview-answer__block--weak');
    await expect(questionTitle).toBeVisible();
    await expect(weakBlock).toBeVisible();

    const qBox = await questionTitle.boundingBox();
    const wBox = await weakBlock.boundingBox();
    expect(qBox && wBox, 'both elements should have layout').toBeTruthy();
    expect(qBox!.y, 'question should be above weak answer').toBeLessThan(wBox!.y);
  });
});
