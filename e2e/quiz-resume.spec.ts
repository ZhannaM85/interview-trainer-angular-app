import { test, expect } from '@playwright/test';

const SNAPSHOT_KEY = 'interview-trainer:active-session';

function makeSnapshot(questionNumber: number, total: number) {
    const ids = Array.from({ length: total }, (_, i) => i + 1);
    return {
        queueIds: ids,
        currentIndex: questionNumber - 1,
        sessionMode: 'standard',
        practiceScope: 'full',
        topicsFocusParam: '',
        sessionNailed: questionNumber - 1,
        sessionPartial: 0,
        sessionDidntKnow: 0,
        sessionBestStreak: questionNumber - 1,
        currentStreak: questionNumber - 1,
        sessionTotal: total,
        sessionStackTopicIds: ['javascript:closures'],
        usingFallbackQueue: false,
        savedAt: new Date().toISOString()
    };
}

test.describe('Quiz page — resume session', () => {
    test('shows resume banner when a snapshot exists', async ({ page }) => {
        await page.addInitScript(({ key, value }) => {
            localStorage.setItem(key, JSON.stringify(value));
        }, { key: SNAPSHOT_KEY, value: makeSnapshot(3, 10) });

        await page.goto('/#/quiz');

        const banner = page.locator('.quiz__resume-banner');
        await expect(banner).toBeVisible({ timeout: 10_000 });
        await expect(banner).toContainText('3');
        await expect(banner).toContainText('10');
    });

    test('does not show resume banner when no snapshot exists', async ({ page }) => {
        await page.goto('/#/quiz');
        await expect(page.locator('.quiz__session-picker')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.quiz__resume-banner')).not.toBeVisible();
    });

    test('dismissing resume banner hides it and clears localStorage', async ({ page }) => {
        await page.addInitScript(({ key, value }) => {
            localStorage.setItem(key, JSON.stringify(value));
        }, { key: SNAPSHOT_KEY, value: makeSnapshot(2, 5) });

        await page.goto('/#/quiz');
        await expect(page.locator('.quiz__resume-banner')).toBeVisible({ timeout: 10_000 });

        await page.locator('.quiz__resume-dismiss').click();
        await expect(page.locator('.quiz__resume-banner')).not.toBeVisible();

        const stored = await page.evaluate((k) => localStorage.getItem(k), SNAPSHOT_KEY);
        expect(stored).toBeNull();
    });

    test('starting a new session hides the banner and starts fresh', async ({ page }) => {
        await page.addInitScript(({ key, value }) => {
            localStorage.setItem(key, JSON.stringify(value));
        }, { key: SNAPSHOT_KEY, value: makeSnapshot(2, 5) });

        await page.goto('/#/quiz');
        await expect(page.locator('.quiz__resume-banner')).toBeVisible({ timeout: 10_000 });

        await page.locator('.quiz__session-mode-btn').first().click();
        await expect(page.locator('.quiz__resume-banner')).not.toBeVisible();

        await expect(page.locator('.interview-q__cta')).toBeVisible({ timeout: 60_000 });
    });
});
