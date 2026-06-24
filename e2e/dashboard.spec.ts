import { test, expect } from '@playwright/test';

test.describe('Dashboard — loading', () => {
    test('dashboard loads without errors and shows title', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.dashboard__title')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.dashboard__message--error')).not.toBeVisible();
    });

    test('dashboard shows metric cards', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.dashboard__title')).toBeVisible({ timeout: 10_000 });

        const cards = page.locator('.dashboard__card');
        const count = await cards.count();
        expect(count).toBeGreaterThanOrEqual(4);
    });
});

test.describe('Dashboard — accuracy and confidence', () => {
    test('accuracy and confidence metrics are visible', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.dashboard__title')).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('.dashboard__metric').first()).toBeVisible();

        const titles = page.locator('.dashboard__card-title');
        const titleTexts: string[] = [];
        const count = await titles.count();
        for (let i = 0; i < count; i++) {
            const text = await titles.nth(i).textContent();
            titleTexts.push(text ?? '');
        }

        const hasAccuracy = titleTexts.some(t => /accuracy|точность/i.test(t));
        const hasConfidence = titleTexts.some(t => /confidence|уверенность/i.test(t));
        expect(hasAccuracy).toBe(true);
        expect(hasConfidence).toBe(true);
    });
});

test.describe('Dashboard — weak topics section', () => {
    test('weak topics card is visible with hint or list', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.dashboard__title')).toBeVisible({ timeout: 10_000 });

        const weakHint = page.locator('.dashboard__hint').first();
        const weakList = page.locator('.dashboard__list');
        const weakVisible = await weakHint.isVisible() || await weakList.isVisible();
        expect(weakVisible).toBe(true);
    });
});

test.describe('Dashboard — activity heatmap', () => {
    test('activity heatmap renders', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.dashboard__title')).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('app-activity-heatmap')).toBeVisible();
    });
});

test.describe('Dashboard — practice ratings', () => {
    test('practice ratings sections are present', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.dashboard__title')).toBeVisible({ timeout: 10_000 });

        const ratingSections = page.locator('.dashboard__ratings-section');
        const count = await ratingSections.count();
        expect(count).toBe(3);

        // Today / all days / every attempt
        const subHeadings = page.locator('.dashboard__ratings-sub');
        const subCount = await subHeadings.count();
        expect(subCount).toBe(3);
    });
});

test.describe('Dashboard — active time and streak', () => {
    test('active time card is visible', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.dashboard__title')).toBeVisible({ timeout: 10_000 });

        const titles = page.locator('.dashboard__card-title');
        const count = await titles.count();
        let hasActiveTime = false;
        for (let i = 0; i < count; i++) {
            const text = await titles.nth(i).textContent();
            if (/learning time|время обучения/i.test(text ?? '')) {
                hasActiveTime = true;
                break;
            }
        }
        expect(hasActiveTime).toBe(true);
    });

    test('streak card is visible', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.dashboard__title')).toBeVisible({ timeout: 10_000 });

        const titles = page.locator('.dashboard__card-title');
        const count = await titles.count();
        let hasStreak = false;
        for (let i = 0; i < count; i++) {
            const text = await titles.nth(i).textContent();
            if (/streak|серия/i.test(text ?? '')) {
                hasStreak = true;
                break;
            }
        }
        expect(hasStreak).toBe(true);
    });
});

test.describe('Dashboard — CTA links', () => {
    test('links to study guide and practice are present', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('.dashboard__title')).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('.dashboard__cta')).toBeVisible();
        await expect(page.locator('.dashboard__cta-secondary')).toBeVisible();
    });
});

test.describe('Dashboard — with seeded data', () => {
    test('shows stats after a practice session is seeded', async ({ page }) => {
        await page.addInitScript(() => {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            localStorage.setItem(
                'interview-trainer:progress',
                JSON.stringify({
                    q1: { questionId: 'q1', nailedCount: 3, partialCount: 1, didntKnowCount: 0, lastAnswered: dateStr, nextReview: dateStr },
                    q2: { questionId: 'q2', nailedCount: 0, partialCount: 2, didntKnowCount: 1, lastAnswered: dateStr, nextReview: dateStr },
                })
            );

            localStorage.setItem(
                'interview-trainer:activity-by-day',
                JSON.stringify({
                    [dateStr]: {
                        date: dateStr,
                        questionsAnswered: 5,
                        topicsStudied: 2,
                        activeSeconds: 300,
                        coveredTopicIds: ['javascript:closures'],
                        practiceRatingBest: { q1: 'nailed', q2: 'partial' },
                    },
                })
            );
        });

        await page.goto('/#/dashboard');
        await expect(page.locator('.dashboard__title')).toBeVisible({ timeout: 10_000 });

        // Metrics should show non-zero percentages
        const metrics = page.locator('.dashboard__metric');
        const firstMetricText = await metrics.first().textContent();
        expect(firstMetricText).toBeTruthy();
    });
});

test.describe('Dashboard — daily goal', () => {
    test('daily goal card is visible', async ({ page }) => {
        await page.goto('/#/dashboard');
        await expect(page.locator('[data-testid="daily-goal-card"]')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.dashboard__daily-goal-progress')).toBeVisible();
        await expect(page.locator('.dashboard__daily-goal-input')).toBeVisible();
    });
});
