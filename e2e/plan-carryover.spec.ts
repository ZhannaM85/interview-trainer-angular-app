import { test, expect } from '@playwright/test';

function yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

test.describe('Plan page — carryover unfinished topics', () => {
    test('shows carryover banner when yesterday had unfinished topics', async ({ page }) => {
        await page.addInitScript((yesterday) => {
            localStorage.setItem(
                'interview-trainer:today-plan',
                JSON.stringify({
                    planDate: yesterday,
                    selectedTopicIds: ['javascript:closures', 'angular:signals'],
                    studiedTopicIds: []
                })
            );
        }, yesterdayStr());

        await page.goto('/#/plan');
        const banner = page.locator('.plan__carryover');
        await expect(banner).toBeVisible({ timeout: 10_000 });
        await expect(banner).toContainText('2');
    });

    test('does not show banner when all topics were studied', async ({ page }) => {
        await page.addInitScript((yesterday) => {
            localStorage.setItem(
                'interview-trainer:today-plan',
                JSON.stringify({
                    planDate: yesterday,
                    selectedTopicIds: ['javascript:closures'],
                    studiedTopicIds: ['javascript:closures']
                })
            );
        }, yesterdayStr());

        await page.goto('/#/plan');
        await expect(page.locator('.plan__title')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.plan__carryover')).not.toBeVisible();
    });

    test('dismissing the banner hides it and does not add topics to plan', async ({ page }) => {
        await page.addInitScript((yesterday) => {
            localStorage.setItem(
                'interview-trainer:today-plan',
                JSON.stringify({
                    planDate: yesterday,
                    selectedTopicIds: ['javascript:closures'],
                    studiedTopicIds: []
                })
            );
        }, yesterdayStr());

        await page.goto('/#/plan');
        const banner = page.locator('.plan__carryover');
        await expect(banner).toBeVisible({ timeout: 10_000 });

        await page.locator('.plan__carryover-dismiss').click();
        await expect(banner).not.toBeVisible();

        // Topics should NOT appear in the To study section
        const toStudySection = page.locator('.plan__summary-col').first();
        await expect(toStudySection.locator('.plan__summary-list')).not.toBeVisible();
    });

    test('accepting the banner adds topics to today plan and hides it', async ({ page }) => {
        await page.addInitScript((yesterday) => {
            localStorage.setItem(
                'interview-trainer:today-plan',
                JSON.stringify({
                    planDate: yesterday,
                    selectedTopicIds: ['javascript:closures'],
                    studiedTopicIds: []
                })
            );
        }, yesterdayStr());

        await page.goto('/#/plan');
        const banner = page.locator('.plan__carryover');
        await expect(banner).toBeVisible({ timeout: 10_000 });

        await page.locator('.plan__carryover-accept').click();
        await expect(banner).not.toBeVisible();

        // Topics should appear in the To study list
        const toStudyList = page.locator('.plan__summary-list').first();
        await expect(toStudyList).toBeVisible();
    });

    test('banner does not appear for topics from 2+ days ago', async ({ page }) => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const twoDaysAgoStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;

        await page.addInitScript((oldDate) => {
            localStorage.setItem(
                'interview-trainer:today-plan',
                JSON.stringify({
                    planDate: oldDate,
                    selectedTopicIds: ['javascript:closures'],
                    studiedTopicIds: []
                })
            );
        }, twoDaysAgoStr);

        await page.goto('/#/plan');
        await expect(page.locator('.plan__title')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.plan__carryover')).not.toBeVisible();
    });

    test('banner does not reappear after dismissal on page reload', async ({ page }) => {
        const yesterday = yesterdayStr();
        await page.addInitScript((yd) => {
            if (!localStorage.getItem('interview-trainer:today-plan')) {
                localStorage.setItem(
                    'interview-trainer:today-plan',
                    JSON.stringify({
                        planDate: yd,
                        selectedTopicIds: ['javascript:closures'],
                        studiedTopicIds: []
                    })
                );
            }
        }, yesterday);

        await page.goto('/#/plan');
        await expect(page.locator('.plan__carryover')).toBeVisible({ timeout: 10_000 });
        await page.locator('.plan__carryover-dismiss').click();

        await page.reload();
        await expect(page.locator('.plan__title')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.plan__carryover')).not.toBeVisible();
    });
});
