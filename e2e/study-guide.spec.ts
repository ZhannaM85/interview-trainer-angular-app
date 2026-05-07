import { test, expect } from '@playwright/test';

test.describe('Study guide difficulty filter', () => {
    test('shows four difficulty chips with All active by default', async ({ page }) => {
        await page.goto('/study');
        const row = page.locator('.study__difficulty-row');
        await expect(row).toBeVisible({ timeout: 10_000 });

        const chips = row.locator('button');
        await expect(chips).toHaveCount(4);

        const allChip = chips.first();
        await expect(allChip).toHaveAttribute('aria-pressed', 'true');
        for (let i = 1; i < 4; i++) {
            await expect(chips.nth(i)).toHaveAttribute('aria-pressed', 'false');
        }
    });

    test('selecting a difficulty chip filters questions and marks it active', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__difficulty-row')).toBeVisible({ timeout: 10_000 });

        const chips = page.locator('.study__difficulty-row button');
        const beginnerChip = chips.nth(1);

        await beginnerChip.click();
        await expect(beginnerChip).toHaveAttribute('aria-pressed', 'true');
        await expect(chips.first()).toHaveAttribute('aria-pressed', 'false');

        await expect(page.locator('.study__cat')).not.toHaveCount(0);
    });

    test('clicking All restores the unfiltered guide', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__difficulty-row')).toBeVisible({ timeout: 10_000 });

        const chips = page.locator('.study__difficulty-row button');
        await chips.nth(1).click();
        await chips.first().click();

        await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.study__cat')).not.toHaveCount(0);
    });

    test('difficulty filter combines with the status filter query param', async ({ page }) => {
        await page.goto('/study?filter=unstudied');
        await expect(page.locator('.study__difficulty-row')).toBeVisible({ timeout: 10_000 });

        const chips = page.locator('.study__difficulty-row button');
        await chips.nth(2).click();
        await expect(chips.nth(2)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.study__filter-row').first().locator('button').nth(2)).toHaveAttribute('aria-pressed', 'true');
    });
});
