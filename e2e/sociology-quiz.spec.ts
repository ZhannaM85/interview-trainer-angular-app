import { test, expect } from '@playwright/test';

test.describe('Sociology quiz', () => {
    test('loads and shows a question with answer options', async ({ page }) => {
        await page.goto('/#/sociology/quiz');
        await expect(page.locator('.soc-quiz__panel')).toBeVisible({ timeout: 15_000 });

        // Question counter visible (e.g. "1 / 10")
        await expect(page.locator('.soc-quiz__meta')).toBeVisible();
        await expect(page.locator('.soc-quiz__meta')).toContainText('1');

        // Question text
        await expect(page.locator('.soc-quiz__question')).toBeVisible();

        // At least 2 answer options
        const options = page.locator('.soc-quiz__option');
        const count = await options.count();
        expect(count).toBeGreaterThanOrEqual(2);

        // Submit button present but disabled until an option is selected
        await expect(page.locator('.soc-quiz__btn--primary')).toBeVisible();
    });

    test('selecting an option enables submit and shows feedback', async ({ page }) => {
        await page.goto('/#/sociology/quiz');
        await expect(page.locator('.soc-quiz__panel')).toBeVisible({ timeout: 15_000 });

        // Select first option
        await page.locator('.soc-quiz__option').first().click();

        // Submit
        const submitBtn = page.locator('.soc-quiz__btn--primary');
        await expect(submitBtn).toBeEnabled();
        await submitBtn.click();

        // Feedback phase: reveal list visible with correct/wrong markers
        await expect(page.locator('.soc-quiz__reveal')).toBeVisible();
        await expect(page.locator('.soc-quiz__feedback')).toBeVisible();

        // Feedback has a status class (ok, bad, or partial)
        const feedback = page.locator('.soc-quiz__feedback');
        const hasClass = await feedback.evaluate(el =>
            el.classList.contains('soc-quiz__feedback--ok') ||
            el.classList.contains('soc-quiz__feedback--bad') ||
            el.classList.contains('soc-quiz__feedback--partial')
        );
        expect(hasClass).toBe(true);
    });

    test('"Next" advances to the next question', async ({ page }) => {
        await page.goto('/#/sociology/quiz');
        await expect(page.locator('.soc-quiz__panel')).toBeVisible({ timeout: 15_000 });

        // Answer first question
        await page.locator('.soc-quiz__option').first().click();
        await page.locator('.soc-quiz__btn--primary').click();
        await expect(page.locator('.soc-quiz__feedback')).toBeVisible();

        // Click "Next"
        await page.locator('.soc-quiz__btn--primary').click();

        // Counter should now show "2 /"
        await expect(page.locator('.soc-quiz__meta')).toContainText('2');

        // New question text should be visible
        await expect(page.locator('.soc-quiz__question')).toBeVisible();
    });

    test('session complete screen is shown after all questions', async ({ page }) => {
        await page.goto('/#/sociology/quiz');
        await expect(page.locator('.soc-quiz__panel')).toBeVisible({ timeout: 15_000 });

        // Count total questions from the counter (e.g. "1 / N")
        const metaText = await page.locator('.soc-quiz__meta').textContent();
        const match = metaText?.match(/\d+\s*\/\s*(\d+)/);
        const total = match ? parseInt(match[1], 10) : 5;

        // Answer all questions
        for (let i = 0; i < total; i++) {
            await page.locator('.soc-quiz__option').first().click();
            await page.locator('.soc-quiz__btn--primary').click();
            await expect(page.locator('.soc-quiz__feedback, .soc-quiz__done')).toBeVisible({ timeout: 5_000 });

            // If done, break
            if (await page.locator('.soc-quiz__done').isVisible()) {
                break;
            }

            // Click "Next"
            await page.locator('.soc-quiz__btn--primary').click();
        }

        // Session complete screen
        await expect(page.locator('.soc-quiz__done')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.soc-quiz__done-title')).toBeVisible();

        // Restart and navigation links
        await expect(page.locator('.soc-quiz__done-actions .soc-quiz__btn--primary')).toBeVisible();
        const navLinks = page.locator('.soc-quiz__link');
        const linkCount = await navLinks.count();
        expect(linkCount).toBeGreaterThanOrEqual(2);
    });

    test('reveal items show correct/wrong markers with checkmarks and crosses', async ({ page }) => {
        await page.goto('/#/sociology/quiz');
        await expect(page.locator('.soc-quiz__panel')).toBeVisible({ timeout: 15_000 });

        await page.locator('.soc-quiz__option').first().click();
        await page.locator('.soc-quiz__btn--primary').click();
        await expect(page.locator('.soc-quiz__reveal')).toBeVisible();

        // At least one item should have a correct or wrong class
        const revealItems = page.locator('.soc-quiz__reveal-item');
        const count = await revealItems.count();
        expect(count).toBeGreaterThanOrEqual(2);

        let hasMarkedItem = false;
        for (let i = 0; i < count; i++) {
            const item = revealItems.nth(i);
            const isCorrect = await item.evaluate(el => el.classList.contains('soc-quiz__reveal-item--correct'));
            const isWrong = await item.evaluate(el => el.classList.contains('soc-quiz__reveal-item--wrong'));
            const isMissed = await item.evaluate(el => el.classList.contains('soc-quiz__reveal-item--missed'));
            if (isCorrect || isWrong || isMissed) {
                hasMarkedItem = true;
                break;
            }
        }
        expect(hasMarkedItem).toBe(true);
    });
});
