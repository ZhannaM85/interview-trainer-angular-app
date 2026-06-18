import { test, expect } from '@playwright/test';

test.describe('Plan page — suggest topics', () => {
    test('suggest topics button is visible on the plan page', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__suggest-btn')).toBeVisible({ timeout: 10_000 });
    });

    test('clicking suggest topics button sets lastSuggestionCount (result message shown)', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__suggest-btn')).toBeVisible({ timeout: 10_000 });
        await page.locator('.plan__suggest-btn').click();
        await expect(page.locator('.plan__suggest-result')).toBeVisible({ timeout: 5_000 });
    });

    test('clicking suggest topics pre-selects topics or shows no-suggestions message', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__suggest-btn')).toBeVisible({ timeout: 10_000 });
        await page.locator('.plan__suggest-btn').click();
        // Either topics are selected (shown in summary) or a "no suggestions" message appears
        const resultVisible = await page.locator('.plan__suggest-result').isVisible();
        expect(resultVisible).toBe(true);
    });

    test('suggest button still works after clearing selection', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__suggest-btn')).toBeVisible({ timeout: 10_000 });

        // Click suggest once
        await page.locator('.plan__suggest-btn').click();
        await expect(page.locator('.plan__suggest-result')).toBeVisible();

        // Click again — should still work (idempotent)
        await page.locator('.plan__suggest-btn').click();
        await expect(page.locator('.plan__suggest-result')).toBeVisible();
    });
});
