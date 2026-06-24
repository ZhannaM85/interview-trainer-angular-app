import { test, expect } from '@playwright/test';

test.describe('Quiz — full happy-path cycle', () => {
    test('load → question → answer → rate → feedback → next question', async ({ page }) => {
        await page.goto('/#/quiz');

        // Pick a session mode (quick = 5 questions)
        await page.locator('.quiz__session-mode-btn').first().click();

        // Question phase: "I answered" button visible
        const ctaBtn = page.locator('.interview-q__cta');
        await expect(ctaBtn).toBeVisible({ timeout: 60_000 });
        await expect(page.locator('[data-phase="question"]')).toBeVisible();

        // Click "I answered" → answer phase
        await ctaBtn.click();
        await expect(page.locator('[data-phase="answer"]')).toBeVisible();

        // Self-evaluation buttons visible
        await expect(page.locator('.self-eval')).toBeVisible();

        // Rate: "Nailed it"
        await page.locator('.self-eval__btn--yes').click();

        // Feedback phase
        await expect(page.locator('[data-phase="feedback"]')).toBeVisible();
        await expect(page.locator('.interview-fb__next')).toBeVisible();

        // Next question
        await page.locator('.interview-fb__next').click();

        // Back to question phase with next question
        await expect(page.locator('[data-phase="question"]')).toBeVisible();
        await expect(page.locator('.interview-q__cta')).toBeVisible();
    });

    test('session complete shows nailed / partial / didn\'t know counts and restart', async ({ page }) => {
        await page.goto('/#/quiz');

        // Quick session = 5 questions
        await page.locator('.quiz__session-mode-btn').first().click();
        await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

        // Answer all 5 questions
        for (let i = 0; i < 5; i++) {
            await page.locator('.interview-q__cta').click();
            await expect(page.locator('.self-eval')).toBeVisible();

            if (i < 2) {
                await page.locator('.self-eval__btn--yes').click();
            } else if (i < 4) {
                await page.locator('.self-eval__btn--partial').click();
            } else {
                await page.locator('.self-eval__btn--no').click();
            }

            await expect(page.locator('.interview-fb__next')).toBeVisible();
            await page.locator('.interview-fb__next').click();
        }

        // Session complete
        const summary = page.locator('.quiz__summary');
        await expect(summary).toBeVisible({ timeout: 10_000 });

        // Rating stats are shown
        await expect(page.locator('.quiz__rating-stat--nailed')).toBeVisible();
        await expect(page.locator('.quiz__rating-stat--partial')).toBeVisible();
        await expect(page.locator('.quiz__rating-stat--missed')).toBeVisible();

        // Restart button
        await expect(page.locator('.quiz__restart')).toBeVisible();

        // Links to study guide and dashboard (scoped to done section)
        await expect(page.locator('.quiz__done-nav').first()).toBeVisible();
        await expect(page.locator('a.quiz__done-nav[href*="dashboard"]')).toBeVisible();
    });

    test('restart button starts a new session', async ({ page }) => {
        await page.goto('/#/quiz');

        // Quick session
        await page.locator('.quiz__session-mode-btn').first().click();
        await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

        // Answer all 5 questions
        for (let i = 0; i < 5; i++) {
            await page.locator('.interview-q__cta').click();
            await page.locator('.self-eval__btn--yes').click();
            await page.locator('.interview-fb__next').click();
        }

        await expect(page.locator('.quiz__summary')).toBeVisible({ timeout: 10_000 });

        // Click restart
        await page.locator('.quiz__restart').click();

        // Session picker shown again
        await expect(page.locator('.quiz__session-picker')).toBeVisible();
    });
});

test.describe('Quiz — keyboard shortcuts', () => {
    test('Space reveals answer from question phase', async ({ page }) => {
        await page.goto('/#/quiz');
        await page.locator('.quiz__session-mode-btn').first().click();
        await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

        await page.keyboard.press('Space');
        await expect(page.locator('[data-phase="answer"]')).toBeVisible();
    });

    test('1, 2, 3 keys rate in answer phase', async ({ page }) => {
        await page.goto('/#/quiz');
        await page.locator('.quiz__session-mode-btn').first().click();
        await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

        // Go to answer phase
        await page.locator('.interview-q__cta').click();
        await expect(page.locator('.self-eval')).toBeVisible();

        // Press "3" = "Nailed it"
        await page.keyboard.press('Digit3');
        await expect(page.locator('[data-phase="feedback"]')).toBeVisible();
    });

    test('Enter advances from feedback phase', async ({ page }) => {
        await page.goto('/#/quiz');
        await page.locator('.quiz__session-mode-btn').first().click();
        await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

        await page.locator('.interview-q__cta').click();
        await page.locator('.self-eval__btn--yes').click();
        await expect(page.locator('[data-phase="feedback"]')).toBeVisible();

        await page.keyboard.press('Enter');
        await expect(page.locator('[data-phase="question"]')).toBeVisible();
    });
});

test.describe('Quiz — undo rating', () => {
    test('undo button is absent on the first question', async ({ page }) => {
        await page.goto('/#/quiz');
        await page.locator('.quiz__session-mode-btn').first().click();
        await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

        await expect(page.locator('.quiz__undo-btn')).not.toBeVisible();
    });

    test('undo button appears on the second question and reverts to previous answer phase', async ({ page }) => {
        await page.goto('/#/quiz');
        await page.locator('.quiz__session-mode-btn').first().click();
        await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

        // Answer first question
        await page.locator('.interview-q__cta').click();
        await page.locator('.self-eval__btn--yes').click();
        await page.locator('.interview-fb__next').click();

        // Second question: undo button should appear
        await expect(page.locator('[data-phase="question"]')).toBeVisible();
        await expect(page.locator('.quiz__undo-btn')).toBeVisible();

        // Click undo
        await page.locator('.quiz__undo-btn').click();

        // Should return to answer phase for the previous question
        await expect(page.locator('[data-phase="answer"]')).toBeVisible();
    });
});

test.describe('Quiz — progress display', () => {
    test('progress counter shows answered and remaining', async ({ page }) => {
        await page.goto('/#/quiz');
        await page.locator('.quiz__session-mode-btn').first().click();
        await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });

        const progress = page.locator('.quiz__progress');
        await expect(progress).toBeVisible();

        // Initially "0 answered ... 5 to go" (or similar)
        await expect(progress).toContainText('0');
    });
});
