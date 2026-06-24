import { test, expect } from '@playwright/test';

test.describe('Theme toggle', () => {
    test('clicking theme toggle switches between light and dark mode', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.app__theme-btn')).toBeVisible({ timeout: 10_000 });

        const initialTheme = await page.locator('html').getAttribute('data-theme');

        await page.locator('.app__theme-btn').click();

        const newTheme = await page.locator('html').getAttribute('data-theme');
        expect(newTheme).not.toBe(initialTheme);

        await page.locator('.app__theme-btn').click();

        const restoredTheme = await page.locator('html').getAttribute('data-theme');
        expect(restoredTheme).toBe(initialTheme);
    });

    test('theme glyph icon changes based on mode', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.app__theme-btn')).toBeVisible({ timeout: 10_000 });

        const initialGlyph = await page.locator('.app__theme-glyph').textContent();

        await page.locator('.app__theme-btn').click();

        const newGlyph = await page.locator('.app__theme-glyph').textContent();
        expect(newGlyph).not.toBe(initialGlyph);
    });

    test('chosen theme persists after page reload', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.app__theme-btn')).toBeVisible({ timeout: 10_000 });

        const initialTheme = await page.locator('html').getAttribute('data-theme');
        await page.locator('.app__theme-btn').click();
        const toggledTheme = await page.locator('html').getAttribute('data-theme');
        expect(toggledTheme).not.toBe(initialTheme);

        await page.reload();
        await expect(page.locator('.app__theme-btn')).toBeVisible({ timeout: 10_000 });

        const persistedTheme = await page.locator('html').getAttribute('data-theme');
        expect(persistedTheme).toBe(toggledTheme);
    });
});
