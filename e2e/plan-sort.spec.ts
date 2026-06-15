import { test, expect } from '@playwright/test';

test.describe('Plan page — sort by date', () => {
    test('sort buttons are visible on the plan page', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__sort-row')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.plan__sort-buttons')).toBeVisible();
        await expect(page.locator('.plan__sort-btn').nth(0)).toBeVisible();
        await expect(page.locator('.plan__sort-btn').nth(1)).toBeVisible();
        await expect(page.locator('.plan__sort-btn').nth(2)).toBeVisible();
    });

    test('"Default" button is active by default', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__sort-row')).toBeVisible({ timeout: 10_000 });
        const defaultBtn = page.locator('.plan__sort-btn').nth(0);
        await expect(defaultBtn).toHaveClass(/plan__sort-btn--active/);
        await expect(page.locator('.plan__sort-btn').nth(1)).not.toHaveClass(/plan__sort-btn--active/);
        await expect(page.locator('.plan__sort-btn').nth(2)).not.toHaveClass(/plan__sort-btn--active/);
    });

    test('clicking "Oldest first" makes it active', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__sort-row')).toBeVisible({ timeout: 10_000 });
        const oldestBtn = page.locator('.plan__sort-btn').nth(1);
        await oldestBtn.click();
        await expect(oldestBtn).toHaveClass(/plan__sort-btn--active/);
        await expect(page.locator('.plan__sort-btn').nth(0)).not.toHaveClass(/plan__sort-btn--active/);
    });

    test('clicking "Newest first" makes it active', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__sort-row')).toBeVisible({ timeout: 10_000 });
        const newestBtn = page.locator('.plan__sort-btn').nth(2);
        await newestBtn.click();
        await expect(newestBtn).toHaveClass(/plan__sort-btn--active/);
        await expect(page.locator('.plan__sort-btn').nth(0)).not.toHaveClass(/plan__sort-btn--active/);
    });

    test('sort preference is preserved after page reload', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__sort-row')).toBeVisible({ timeout: 10_000 });
        await page.locator('.plan__sort-btn').nth(1).click();
        await expect(page.locator('.plan__sort-btn').nth(1)).toHaveClass(/plan__sort-btn--active/);

        await page.reload();
        await expect(page.locator('.plan__sort-row')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.plan__sort-btn').nth(1)).toHaveClass(/plan__sort-btn--active/);
    });

    test('switching back to "Default" works after choosing "Oldest first"', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__sort-row')).toBeVisible({ timeout: 10_000 });
        await page.locator('.plan__sort-btn').nth(1).click();
        await page.locator('.plan__sort-btn').nth(0).click();
        await expect(page.locator('.plan__sort-btn').nth(0)).toHaveClass(/plan__sort-btn--active/);
        await expect(page.locator('.plan__sort-btn').nth(1)).not.toHaveClass(/plan__sort-btn--active/);
    });

    test('topic list is still visible after changing sort mode', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__sort-row')).toBeVisible({ timeout: 10_000 });
        await page.locator('.plan__sort-btn').nth(1).click();
        await expect(page.locator('.plan__topic-list').first()).toBeVisible();
    });
});
