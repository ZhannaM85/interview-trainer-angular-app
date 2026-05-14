import { test, expect } from '@playwright/test';

test.describe('Achievements card on dashboard', () => {
    test('shows the achievements card', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(
            page.locator('text=/Achievements|Достижения/i')
        ).toBeVisible({ timeout: 10_000 });
    });

    test('shows empty state when no badges are earned', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(
            page.locator('text=/No badges earned yet|Пока нет наград/i')
        ).toBeVisible({ timeout: 10_000 });
    });

    test('grants first-steps badge after answering a question', async ({ page }) => {
        await page.goto('/#/quiz');

        // Dismiss session mode picker if present
        const startBtn = page.locator('button', { hasText: /Standard|Стандарт/i }).first();
        if (await startBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await startBtn.click();
        }

        // Answer a question
        const answerBtn = page.locator('button', { hasText: /I answered|Я ответил/i });
        await expect(answerBtn).toBeVisible({ timeout: 10_000 });
        await answerBtn.click();

        // Rate it
        const nailedBtn = page.locator('button', { hasText: /Nailed|Отлично/i }).first();
        await expect(nailedBtn).toBeVisible({ timeout: 5_000 });
        await nailedBtn.click();

        // Navigate to dashboard
        await page.goto('/#/dashboard');

        // First-steps badge should now be visible
        await expect(
            page.locator('[data-testid="achievements-card"]')
        ).toBeVisible({ timeout: 10_000 });
        await expect(
            page.locator('[data-testid="achievements-card"]').locator('text=/First steps|Первые шаги/i')
        ).toBeVisible();
    });
});
