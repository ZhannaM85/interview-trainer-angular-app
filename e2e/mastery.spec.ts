import { test, expect } from '@playwright/test';

// javascript:scope has exactly one question (ID 3) — seeding just this ID is enough to master the topic
const MASTERED_QUESTION_ID = 3;

function masteredProgress(questionId: number) {
    return [
        {
            questionId,
            nailedCount: 5,
            partialCount: 0,
            didntKnowCount: 0,
            lastAnswered: new Date().toISOString(),
            nextReview: new Date(Date.now() + 86400000 * 30).toISOString(),
            easeFactor: 2.8,
            repetitionCount: 5,
            intervalDays: 30
        }
    ];
}

test.describe('Topic mastery badge — Plan page', () => {
    test('mastery badge is absent when no topic has been mastered', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__topic-item').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.plan__mastery-badge')).toHaveCount(0);
    });

    test('mastery badge appears for a topic once all its questions reach the threshold', async ({ page }) => {
        await page.addInitScript(({ id, progress }) => {
            localStorage.setItem('interview-trainer:progress', JSON.stringify(progress));
        }, { id: MASTERED_QUESTION_ID, progress: masteredProgress(MASTERED_QUESTION_ID) });

        await page.goto('/#/plan');
        await expect(page.locator('.plan__topic-item').first()).toBeVisible({ timeout: 10_000 });

        const badge = page.locator('.plan__mastery-badge').first();
        await expect(badge).toBeVisible({ timeout: 5_000 });
        await expect(badge).toContainText('★');
    });
});

test.describe('Topic mastery badge — Study guide', () => {
    test('mastery badge is absent when no topic has been mastered', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__sub-aside').first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.study__mastery-badge')).toHaveCount(0);
    });

    test('mastery badge appears in the study guide subtopic header for a mastered topic', async ({ page }) => {
        await page.addInitScript(({ id, progress }) => {
            localStorage.setItem('interview-trainer:progress', JSON.stringify(progress));
        }, { id: MASTERED_QUESTION_ID, progress: masteredProgress(MASTERED_QUESTION_ID) });

        await page.goto('/#/study');
        await expect(page.locator('.study__sub-aside').first()).toBeVisible({ timeout: 10_000 });

        const badge = page.locator('.study__mastery-badge').first();
        await expect(badge).toBeVisible({ timeout: 5_000 });
        await expect(badge).toContainText('★');
    });
});
