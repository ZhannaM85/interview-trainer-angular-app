import { test, expect } from '@playwright/test';

test.describe('Plan page — basic functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.clear());
    });

    test('plan page loads and shows topic checkboxes', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__title')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.plan__topic-item').first()).toBeVisible();
        await expect(page.locator('.plan__checkbox').first()).toBeVisible();
    });

    test('checking a topic adds it to the "To study" summary', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__topic-item').first()).toBeVisible({ timeout: 10_000 });

        // Verify "To study" is empty initially
        await expect(page.locator('.plan__summary-empty').first()).toBeVisible();

        // Check first topic checkbox
        const firstCheckbox = page.locator('.plan__checkbox').first();
        await firstCheckbox.click({ force: true });

        // "To study" list should now have an item
        await expect(page.locator('.plan__summary-list').first().locator('.plan__summary-item--row')).toHaveCount(1);
    });

    test('unchecking a topic removes it from the "To study" summary', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__topic-item').first()).toBeVisible({ timeout: 10_000 });

        // Check and then uncheck
        const firstCheckbox = page.locator('.plan__checkbox').first();
        await firstCheckbox.click({ force: true });
        await expect(page.locator('.plan__summary-list').first().locator('.plan__summary-item--row')).toHaveCount(1);

        await firstCheckbox.click({ force: true });
        await expect(page.locator('.plan__summary-empty').first()).toBeVisible();
    });

    test('study guide and practice links are present', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__title')).toBeVisible({ timeout: 10_000 });

        const studyLink = page.locator('.plan__cta', { hasText: /Study guide|Справочник/i }).first();
        await expect(studyLink).toBeVisible();

        const practiceLink = page.locator('.plan__cta', { hasText: /Practice|Практика/i }).first();
        await expect(practiceLink).toBeVisible();
    });

    test('study guide link navigates to the study page', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__title')).toBeVisible({ timeout: 10_000 });

        const studyLink = page.locator('.plan__cta', { hasText: /Study guide|Справочник/i }).first();
        await studyLink.click();
        await expect(page).toHaveURL(/study/);
    });

    test('practice link navigates to the quiz page', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__title')).toBeVisible({ timeout: 10_000 });

        const practiceLink = page.locator('.plan__cta', { hasText: /Practice|Практика/i }).first();
        await practiceLink.click();
        await expect(page).toHaveURL(/quiz/);
    });

    test('"Remove all" on done list shows confirmation before clearing', async ({ page }) => {
        // Seed a plan with studied topics
        await page.addInitScript(() => {
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            localStorage.setItem(
                'interview-trainer:today-plan',
                JSON.stringify({
                    planDate: `${y}-${m}-${d}`,
                    selectedTopicIds: ['javascript:closures'],
                    studiedTopicIds: ['javascript:closures'],
                })
            );
        });

        await page.goto('/#/plan');
        await expect(page.locator('.plan__title')).toBeVisible({ timeout: 10_000 });

        // "Done studying" column should have an item
        const doneList = page.locator('.plan__summary-list--done');
        await expect(doneList).toBeVisible();

        // Click "Remove all"
        const removeAllBtn = page.locator('.plan__summary-col').nth(1).locator('.plan__remove-all').first();
        await expect(removeAllBtn).toBeVisible();
        await removeAllBtn.click();

        // Confirmation should appear
        await expect(page.locator('.plan__remove-all--danger')).toBeVisible();
    });

    test('multiple categories of topics are shown', async ({ page }) => {
        await page.goto('/#/plan');
        await expect(page.locator('.plan__cat').first()).toBeVisible({ timeout: 10_000 });

        const categories = page.locator('.plan__cat');
        const count = await categories.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });
});
