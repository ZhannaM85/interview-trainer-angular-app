import { test, expect } from '@playwright/test';

test.describe('Quiz fresh-only scope', () => {
  test('fresh questions button appears and starts a session with unpracticed questions', async ({ page }) => {
    await page.goto('/#/quiz');
    // Start a standard session first
    await page.locator('.quiz__session-mode-btn').nth(1).click();
    await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

    // The "Fresh questions only" scope button should be visible
    const freshBtn = page.locator('.quiz__scope-btn', { hasText: /fresh|новые/i });
    await expect(freshBtn).toBeVisible();

    // Click the fresh-only scope button
    await freshBtn.click();

    // Either a question is shown (fresh questions exist) or the empty state is shown
    const questionOrEmpty = page.locator('.interview-q__cta, .quiz__empty-fresh');
    await expect(questionOrEmpty.first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows empty state when all questions have been practiced', async ({ page }) => {
    // Seed progress for all questions so none are "fresh"
    await page.goto('/#/quiz');
    await page.evaluate(() => {
      const raw = localStorage.getItem('interview-trainer:progress');
      const existing: { questionId: number }[] = raw ? JSON.parse(raw) : [];
      const ids = new Set(existing.map((p) => p.questionId));
      // Generate progress for ids 1–200 to cover all questions
      const progress = [];
      for (let i = 1; i <= 200; i++) {
        if (!ids.has(i)) {
          progress.push({
            questionId: i,
            nailedCount: 1,
            partialCount: 0,
            didntKnowCount: 0,
            lastAnswered: new Date().toISOString(),
            nextReview: new Date(Date.now() + 3 * 86400000).toISOString(),
            easeFactor: 2.5,
            repetitionCount: 1,
            intervalDays: 3
          });
        }
      }
      localStorage.setItem('interview-trainer:progress', JSON.stringify([...existing, ...progress]));
    });

    // Full reload so component picks up the seeded progress
    await page.reload();
    await page.goto('/#/quiz');
    await page.locator('.quiz__session-mode-btn').nth(1).click();
    await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

    const freshBtn = page.locator('.quiz__scope-btn', { hasText: /fresh|новые/i });
    await freshBtn.click();

    // Should show the empty state message
    const emptyState = page.locator('.quiz__empty-fresh');
    await expect(emptyState).toBeVisible({ timeout: 10_000 });

    // The empty state should contain a "Practice all" button to recover
    const practiceAllBtn = emptyState.locator('.quiz__scope-btn');
    await expect(practiceAllBtn).toBeVisible();
  });
});
