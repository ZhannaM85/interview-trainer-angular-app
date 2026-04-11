import { test, expect } from '@playwright/test';

test.describe('Practice / quiz answer phase', () => {
  test('question sits on the same styled card as answers', async ({ page }) => {
    await page.goto('/quiz');
    await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });
    await page.locator('.interview-q__cta').click();

    const answerCard = page.locator('.quiz__card-wrap[data-phase="answer"] .quiz__phase.card-phase');
    const questionTitle = page.locator('.interview-answer__title');
    const weakBlock = page.locator('.interview-answer__block--weak');

    await expect(answerCard).toBeVisible();
    await expect(questionTitle).toBeVisible();
    await expect(weakBlock).toBeVisible();

    const cardBox = await answerCard.boundingBox();
    const qBox = await questionTitle.boundingBox();
    const wBox = await weakBlock.boundingBox();
    expect(cardBox && qBox && wBox, 'layout boxes should exist').toBeTruthy();

    expect(qBox!.y, 'question should be above weak answer').toBeLessThan(wBox!.y);

    const tol = 2;
    expect(qBox!.y, 'question should be inside the answer card (top)').toBeGreaterThanOrEqual(
      cardBox!.y - tol
    );
    expect(
      qBox!.y + qBox!.height,
      'question should be inside the answer card (bottom)'
    ).toBeLessThanOrEqual(cardBox!.y + cardBox!.height + tol);

    const png = await answerCard.screenshot();
    await test.info().attach('answer-phase-card.png', {
      body: png,
      contentType: 'image/png'
    });
  });
});
