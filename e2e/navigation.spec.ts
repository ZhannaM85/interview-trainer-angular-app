import { test, expect } from '@playwright/test';

test.describe('Navigation — desktop', () => {
    test.use({ viewport: { width: 900, height: 1000 } });

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('interview-trainer:last-subject', '"js"');
        });
    });

    test('all interview nav links are visible and navigate correctly', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('#app-main-nav')).toBeVisible({ timeout: 10_000 });

        const navLinks = [
            { text: /About|О проекте/i, route: '/about' },
            { text: /Study guide|Справочник/i, route: '/study' },
            { text: /Plan for today|План на сегодня/i, route: '/plan' },
            { text: /Practice|Практика/i, route: '/quiz' },
            { text: /Progress|Прогресс/i, route: '/dashboard' },
            { text: /My Questions|Мои вопросы/i, route: '/my-questions' },
        ];

        for (const link of navLinks) {
            const anchor = page.locator('#app-main-nav a', { hasText: link.text }).first();
            await expect(anchor).toBeVisible();
        }
    });

    test('clicking a nav link navigates to the correct page', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('#app-main-nav')).toBeVisible({ timeout: 10_000 });

        const planLink = page.locator('#app-main-nav a', { hasText: /Plan for today|План на сегодня/i }).first();
        await planLink.click();
        await expect(page).toHaveURL(/plan/);
    });

    test('active link is highlighted', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('#app-main-nav')).toBeVisible({ timeout: 10_000 });

        const studyLink = page.locator('#app-main-nav a', { hasText: /Study guide|Справочник/i }).first();
        await expect(studyLink).toHaveClass(/app__link--active/);

        const planLink = page.locator('#app-main-nav a', { hasText: /Plan for today|План на сегодня/i }).first();
        await expect(planLink).not.toHaveClass(/app__link--active/);
    });

    test('brand logo navigates to home page', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.app__brand')).toBeVisible({ timeout: 10_000 });

        await page.locator('.app__brand').click();
        await expect(page).toHaveURL(/\/#\/(quiz|$)/);
    });
});

test.describe('Navigation — mobile hamburger menu', () => {
    test.use({ viewport: { width: 393, height: 851 } });

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('interview-trainer:last-subject', '"js"');
        });
    });

    test('hamburger button is visible on mobile', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.app__menu-btn')).toBeVisible({ timeout: 10_000 });
    });

    test('clicking hamburger opens the nav menu', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.app__menu-btn')).toBeVisible({ timeout: 10_000 });

        await page.locator('.app__menu-btn').click();
        await expect(page.locator('.app__header')).toHaveClass(/app__header--nav-open/);
    });

    test('clicking hamburger again closes the nav menu', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.app__menu-btn')).toBeVisible({ timeout: 10_000 });

        await page.locator('.app__menu-btn').click();
        await expect(page.locator('.app__header')).toHaveClass(/app__header--nav-open/);

        await page.locator('.app__menu-btn').click();
        await expect(page.locator('.app__header')).not.toHaveClass(/app__header--nav-open/);
    });

    test('clicking a nav link closes the menu and navigates', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.app__menu-btn')).toBeVisible({ timeout: 10_000 });

        await page.locator('.app__menu-btn').click();
        await expect(page.locator('.app__header')).toHaveClass(/app__header--nav-open/);

        const planLink = page.locator('#app-main-nav a', { hasText: /Plan for today|План на сегодня/i }).first();
        await planLink.click();

        await expect(page).toHaveURL(/plan/);
        await expect(page.locator('.app__header')).not.toHaveClass(/app__header--nav-open/);
    });
});
