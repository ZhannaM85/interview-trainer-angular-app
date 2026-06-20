import { test, expect } from '@playwright/test';

test.describe('Settings — AI API key', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/#/settings');
        await page.evaluate(() => localStorage.removeItem('interview-trainer:ai-api-key'));
        await page.reload();
    });

    test('page renders the settings title and API key field', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.locator('#settings-api-key')).toBeVisible();
    });

    test('clear button is disabled when no key is stored', async ({ page }) => {
        await expect(page.getByRole('button', { name: /clear/i })).toBeDisabled();
    });

    test('input type is password by default', async ({ page }) => {
        const input = page.locator('#settings-api-key');
        await expect(input).toHaveAttribute('type', 'password');
    });

    test('show/hide toggle reveals and conceals the key', async ({ page }) => {
        const input = page.locator('#settings-api-key');
        await expect(input).toHaveAttribute('type', 'password');

        await page.getByRole('button', { name: /show key/i }).click();
        await expect(input).toHaveAttribute('type', 'text');

        await page.getByRole('button', { name: /hide key/i }).click();
        await expect(input).toHaveAttribute('type', 'password');
    });

    test('saves a valid key and shows confirmation status', async ({ page }) => {
        await page.locator('#settings-api-key').fill('sk-ant-testkey123');
        await page.getByRole('button', { name: /save/i }).click();

        await expect(page.locator('.settings__status')).toBeVisible();
        await expect(page.locator('.settings__status')).toContainText(/saved/i);
    });

    test('persists key to localStorage after saving', async ({ page }) => {
        await page.locator('#settings-api-key').fill('sk-ant-testkey123');
        await page.getByRole('button', { name: /save/i }).click();

        const stored = await page.evaluate(() =>
            JSON.parse(localStorage.getItem('interview-trainer:ai-api-key') ?? 'null')
        );
        expect(stored).toBe('sk-ant-testkey123');
    });

    test('shows format error when key does not start with sk-ant-', async ({ page }) => {
        await page.locator('#settings-api-key').fill('bad-key');
        await page.getByRole('button', { name: /save/i }).click();

        await expect(page.locator('.settings__error')).toBeVisible();
    });

    test('does not save when key format is invalid', async ({ page }) => {
        await page.locator('#settings-api-key').fill('bad-key');
        await page.getByRole('button', { name: /save/i }).click();

        const stored = await page.evaluate(() =>
            localStorage.getItem('interview-trainer:ai-api-key')
        );
        expect(stored).toBeNull();
    });

    test('saves empty key (treated as no key set) without validation error', async ({ page }) => {
        await page.locator('#settings-api-key').fill('');
        await page.getByRole('button', { name: /save/i }).click();

        await expect(page.locator('.settings__error')).not.toBeVisible();
    });

    test('clear button removes key from localStorage and shows cleared status', async ({ page }) => {
        await page.evaluate(() =>
            localStorage.setItem('interview-trainer:ai-api-key', JSON.stringify('sk-ant-testkey123'))
        );
        await page.reload();

        await expect(page.getByRole('button', { name: /clear/i })).toBeEnabled();
        await page.getByRole('button', { name: /clear/i }).click();

        const stored = await page.evaluate(() =>
            localStorage.getItem('interview-trainer:ai-api-key')
        );
        expect(stored).toBeNull();

        await expect(page.locator('.settings__status')).toContainText(/cleared/i);
    });

    test('Settings link appears in the nav and navigates to the settings page', async ({ page }) => {
        await page.goto('/#/');
        const navLink = page.getByRole('link', { name: /settings/i }).first();
        await expect(navLink).toBeVisible();
        await navLink.click();
        await expect(page).toHaveURL(/#\/settings/);
    });
});
