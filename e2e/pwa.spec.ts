import { test, expect } from '@playwright/test';

test.describe('PWA support', () => {
    test('app shell exposes a web app manifest and touch icon', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.webmanifest');
        await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    });

    test('manifest.webmanifest is reachable and declares installable metadata', async ({ page }) => {
        const response = await page.goto('/manifest.webmanifest');
        expect(response?.ok()).toBe(true);
        const manifest = await response!.json();
        expect(manifest.name).toBeTruthy();
        expect(manifest.icons.length).toBeGreaterThan(0);
        expect(manifest.display).toBe('standalone');
    });

    test('does not show the offline indicator while online', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.app__offline-indicator')).not.toBeVisible({ timeout: 5_000 });
    });

    test('shows the offline indicator when the network goes offline, hides it when back online', async ({ page, context }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.app__offline-indicator')).not.toBeVisible();

        await context.setOffline(true);
        await expect(page.locator('.app__offline-indicator')).toBeVisible({ timeout: 10_000 });

        await context.setOffline(false);
        await expect(page.locator('.app__offline-indicator')).not.toBeVisible({ timeout: 10_000 });
    });
});
