import { test, expect } from '@playwright/test';

test.describe('Dashboard hardest questions', () => {
    test('shows hardest questions card on dashboard', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('text=/Hardest questions|Самые сложные вопросы/i')).toBeVisible({
            timeout: 10_000
        });
    });

    test('shows empty state when no questions have 3+ attempts', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(
            page.locator(
                'text=/No questions with 3\\+ attempts|Пока нет вопросов с 3\\+ попытками/i'
            )
        ).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Dashboard difficulty breakdown', () => {
    test('shows accuracy by difficulty card on dashboard', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(
            page.locator('text=/Accuracy by difficulty|Точность по уровню сложности/i')
        ).toBeVisible({ timeout: 10_000 });
    });

    test('shows empty state when no practice data exists', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(
            page.locator(
                'text=/No practice data yet — answer|Пока нет данных — ответьте/i'
            )
        ).toBeVisible({ timeout: 10_000 });
    });
});

test.describe('Dashboard trend chart', () => {
    test('shows trend chart card on dashboard', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('app-trend-chart')).toBeVisible({ timeout: 10_000 });
    });

    test('shows empty state message when no practice data', async ({ page }) => {
        await page.goto('/#/dashboard');
        const chart = page.locator('app-trend-chart');
        await expect(chart).toBeVisible({ timeout: 10_000 });
        await expect(chart.locator('.trend-chart__empty')).toBeVisible();
    });

    test('time window buttons are rendered', async ({ page }) => {
        await page.goto('/#/dashboard');
        const chart = page.locator('app-trend-chart');
        await expect(chart).toBeVisible({ timeout: 10_000 });

        const buttons = chart.locator('.trend-chart__window-btn');
        await expect(buttons).toHaveCount(3);
    });

    test('30d window button is active by default', async ({ page }) => {
        await page.goto('/#/dashboard');
        const chart = page.locator('app-trend-chart');
        await expect(chart).toBeVisible({ timeout: 10_000 });

        const activeBtn = chart.locator('.trend-chart__window-btn--active');
        await expect(activeBtn).toHaveCount(1);
        await expect(activeBtn).toHaveAttribute('aria-pressed', 'true');
    });

    test('clicking a window button marks it active', async ({ page }) => {
        await page.goto('/#/dashboard');
        const chart = page.locator('app-trend-chart');
        await expect(chart).toBeVisible({ timeout: 10_000 });

        const buttons = chart.locator('.trend-chart__window-btn');
        await buttons.first().click();
        await expect(buttons.first()).toHaveClass(/trend-chart__window-btn--active/);
        await expect(buttons.nth(1)).not.toHaveClass(/trend-chart__window-btn--active/);
    });
});
