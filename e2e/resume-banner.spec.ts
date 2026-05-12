import { test, expect } from '@playwright/test';

const SNAPSHOT_KEY = 'interview-trainer:active-session';

function makeSnapshot(questionNumber: number, total: number, ageMs = 0) {
    return {
        queueIds: Array.from({ length: total }, (_, i) => i + 1),
        currentIndex: questionNumber - 1,
        sessionMode: 'standard',
        practiceScope: 'full',
        topicsFocusParam: '',
        sessionNailed: 0,
        sessionPartial: 0,
        sessionDidntKnow: 0,
        sessionBestStreak: 0,
        currentStreak: 0,
        sessionTotal: total,
        sessionStackTopicIds: ['javascript:closures'],
        usingFallbackQueue: false,
        savedAt: new Date(Date.now() - ageMs).toISOString()
    };
}

test.describe('App-level resume session banner', () => {
    test('shows banner on dashboard when a fresh snapshot exists', async ({ page }) => {
        await page.addInitScript(({ key, value }) => {
            localStorage.setItem(key, JSON.stringify(value));
        }, { key: SNAPSHOT_KEY, value: makeSnapshot(3, 10) });

        await page.goto('/#/dashboard');

        const banner = page.locator('.app__resume-banner');
        await expect(banner).toBeVisible({ timeout: 10_000 });
        await expect(banner).toContainText('3');
        await expect(banner).toContainText('10');
    });

    test('shows banner on home screen when a fresh snapshot exists', async ({ page }) => {
        await page.addInitScript(({ key, value }) => {
            localStorage.setItem(key, JSON.stringify(value));
        }, { key: SNAPSHOT_KEY, value: makeSnapshot(2, 5) });

        await page.goto('/');

        const banner = page.locator('.app__resume-banner');
        await expect(banner).toBeVisible({ timeout: 10_000 });
    });

    test('does not show banner when no snapshot exists', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.app__resume-banner')).not.toBeVisible({ timeout: 5_000 });
    });

    test('does not show banner on quiz page (handled in-page)', async ({ page }) => {
        await page.addInitScript(({ key, value }) => {
            localStorage.setItem(key, JSON.stringify(value));
        }, { key: SNAPSHOT_KEY, value: makeSnapshot(3, 10) });

        await page.goto('/#/quiz');
        await expect(page.locator('.app__resume-banner')).not.toBeVisible({ timeout: 10_000 });
    });

    test('does not show banner for stale snapshot (older than 24 hours)', async ({ page }) => {
        const staleMs = 25 * 60 * 60 * 1000;
        await page.addInitScript(({ key, value }) => {
            localStorage.setItem(key, JSON.stringify(value));
        }, { key: SNAPSHOT_KEY, value: makeSnapshot(3, 10, staleMs) });

        await page.goto('/#/dashboard');
        await expect(page.locator('.app__resume-banner')).not.toBeVisible({ timeout: 5_000 });
    });

    test('Start fresh clears snapshot and hides banner', async ({ page }) => {
        await page.addInitScript(({ key, value }) => {
            localStorage.setItem(key, JSON.stringify(value));
        }, { key: SNAPSHOT_KEY, value: makeSnapshot(4, 15) });

        await page.goto('/#/dashboard');
        await expect(page.locator('.app__resume-banner')).toBeVisible({ timeout: 10_000 });

        await page.locator('.app__resume-banner-fresh').click();
        await expect(page.locator('.app__resume-banner')).not.toBeVisible();

        const stored = await page.evaluate((k) => localStorage.getItem(k), SNAPSHOT_KEY);
        expect(stored).toBeNull();
    });

    test('dismiss button hides the banner without clearing snapshot', async ({ page }) => {
        await page.addInitScript(({ key, value }) => {
            localStorage.setItem(key, JSON.stringify(value));
        }, { key: SNAPSHOT_KEY, value: makeSnapshot(2, 5) });

        await page.goto('/#/dashboard');
        await expect(page.locator('.app__resume-banner')).toBeVisible({ timeout: 10_000 });

        await page.locator('.app__resume-banner-close').click();
        await expect(page.locator('.app__resume-banner')).not.toBeVisible();

        const stored = await page.evaluate((k) => localStorage.getItem(k), SNAPSHOT_KEY);
        expect(stored).not.toBeNull();
    });

    test('Continue link navigates to /quiz and banner is no longer shown', async ({ page }) => {
        await page.addInitScript(({ key, value }) => {
            localStorage.setItem(key, JSON.stringify(value));
        }, { key: SNAPSHOT_KEY, value: makeSnapshot(3, 10) });

        await page.goto('/#/dashboard');
        await expect(page.locator('.app__resume-banner')).toBeVisible({ timeout: 10_000 });

        await page.locator('.app__resume-banner-continue').click();
        await expect(page).toHaveURL(/#\/quiz/);
        await expect(page.locator('.app__resume-banner')).not.toBeVisible();
    });
});
