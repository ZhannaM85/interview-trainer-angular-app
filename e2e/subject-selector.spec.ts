import { test, expect } from '@playwright/test';

test.describe('Subject selector — home page', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.clear());
    });

    test('home page shows both subject cards', async ({ page }) => {
        await page.goto('/#/');
        await expect(page.locator('.subject-selector')).toBeVisible({ timeout: 10_000 });

        const jsCard = page.locator('.subject-selector__card--js');
        const socCard = page.locator('.subject-selector__card--soc');
        await expect(jsCard).toBeVisible();
        await expect(socCard).toBeVisible();
    });

    test('each card has a title and description', async ({ page }) => {
        await page.goto('/#/');
        await expect(page.locator('.subject-selector')).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('.subject-selector__card--js .subject-selector__card-title')).toBeVisible();
        await expect(page.locator('.subject-selector__card--js .subject-selector__card-desc')).toBeVisible();
        await expect(page.locator('.subject-selector__card--soc .subject-selector__card-title')).toBeVisible();
        await expect(page.locator('.subject-selector__card--soc .subject-selector__card-desc')).toBeVisible();
    });

    test('clicking Interview prep card navigates to the quiz page', async ({ page }) => {
        await page.goto('/#/');
        await expect(page.locator('.subject-selector')).toBeVisible({ timeout: 10_000 });

        await page.locator('.subject-selector__card--js').click();
        await expect(page).toHaveURL(/quiz/, { timeout: 5_000 });
    });

    test('clicking Sociology card navigates to the sociology study page', async ({ page }) => {
        await page.goto('/#/');
        await expect(page.locator('.subject-selector')).toBeVisible({ timeout: 10_000 });

        await page.locator('.subject-selector__card--soc').click();
        await expect(page).toHaveURL(/sociology/, { timeout: 5_000 });
    });

    test('each card has a CTA label', async ({ page }) => {
        await page.goto('/#/');
        await expect(page.locator('.subject-selector')).toBeVisible({ timeout: 10_000 });

        const ctas = page.locator('.subject-selector__card-cta');
        await expect(ctas).toHaveCount(2);
        for (let i = 0; i < 2; i++) {
            const text = await ctas.nth(i).textContent();
            expect(text!.trim().length).toBeGreaterThan(0);
        }
    });
});
