import { test, expect } from '@playwright/test';

async function ensureNavVisible(page: import('@playwright/test').Page) {
    const hamburger = page.locator('.app__menu-btn');
    if (await hamburger.isVisible()) {
        await hamburger.click();
        await expect(page.locator('.app__header')).toHaveClass(/app__header--nav-open/);
    }
}

test.describe('Language switching', () => {
    test('switching language from EN to RU updates nav link labels', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('interview-trainer:last-subject', '"js"');
        });
        await page.goto('/#/study');
        await ensureNavVisible(page);
        await expect(page.locator('#app-main-nav')).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('#app-main-nav a', { hasText: /Study guide/i }).first()).toBeVisible();

        await page.locator('#app-locale-select').selectOption('ru');

        await expect(page.locator('#app-main-nav a', { hasText: /Справочник/i }).first()).toBeVisible({ timeout: 5_000 });
    });

    test('switching language from RU back to EN restores English text', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('interview-trainer:last-subject', '"js"');
        });
        await page.goto('/#/study');
        await ensureNavVisible(page);
        await expect(page.locator('#app-main-nav')).toBeVisible({ timeout: 10_000 });

        await page.locator('#app-locale-select').selectOption('ru');
        await expect(page.locator('#app-main-nav a', { hasText: /Справочник/i }).first()).toBeVisible({ timeout: 5_000 });

        await page.locator('#app-locale-select').selectOption('en');
        await expect(page.locator('#app-main-nav a', { hasText: /Study guide/i }).first()).toBeVisible({ timeout: 5_000 });
    });

    test('chosen language persists after page reload', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('interview-trainer:last-subject', '"js"');
        });
        await page.goto('/#/study');
        await ensureNavVisible(page);
        await expect(page.locator('#app-main-nav')).toBeVisible({ timeout: 10_000 });

        await page.locator('#app-locale-select').selectOption('ru');
        await expect(page.locator('#app-main-nav a', { hasText: /Справочник/i }).first()).toBeVisible({ timeout: 5_000 });

        await page.reload();
        await ensureNavVisible(page);
        await expect(page.locator('#app-main-nav')).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('#app-main-nav a', { hasText: /Справочник/i }).first()).toBeVisible({ timeout: 5_000 });
        await expect(page.locator('#app-locale-select')).toHaveValue('ru');
    });

    test('study guide question text changes language when locale switches', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible({ timeout: 10_000 });

        const accordion = page.locator('.study__sub-accordion').first();
        const isOpen = await accordion.evaluate(el => el.classList.contains('study__sub-accordion--open'));
        if (!isOpen) {
            await accordion.locator('.study__sub-disclosure').click();
        }

        const questionEl = accordion.locator('.study__q-heading').first();
        await expect(questionEl).toBeVisible();
        const enText = await questionEl.textContent();

        await page.locator('#app-locale-select').selectOption('ru');

        await page.waitForTimeout(1000);
        const ruText = await questionEl.textContent();

        expect(ruText).not.toBe(enText);
    });
});
