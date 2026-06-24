import { test, expect } from '@playwright/test';

test.describe('Study guide — content loading', () => {
    test('loads and shows at least one category section', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__title')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.study__cat').first()).toBeVisible();

        const catCount = await page.locator('.study__cat').count();
        expect(catCount).toBeGreaterThanOrEqual(1);
    });

    test('each category has a heading and subtopics', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__cat').first()).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('.study__cat-heading').first()).toBeVisible();
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible();
    });
});

test.describe('Study guide — accordion', () => {
    test('expanding a subtopic reveals questions', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible({ timeout: 10_000 });

        const accordion = page.locator('.study__sub-accordion').first();
        const isOpen = await accordion.evaluate(el =>
            el.classList.contains('study__sub-accordion--open')
        );
        if (!isOpen) {
            await accordion.locator('.study__sub-disclosure').click();
        }

        await expect(accordion.locator('.study__q').first()).toBeVisible();
    });

    test('collapsing a subtopic hides questions', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible({ timeout: 10_000 });

        const accordion = page.locator('.study__sub-accordion').first();

        // Open first
        const isOpen = await accordion.evaluate(el =>
            el.classList.contains('study__sub-accordion--open')
        );
        if (!isOpen) {
            await accordion.locator('.study__sub-disclosure').click();
        }
        await expect(accordion.locator('.study__q').first()).toBeVisible();

        // Close
        await accordion.locator('.study__sub-disclosure').click();
        await expect(accordion).not.toHaveClass(/study__sub-accordion--open/);
    });

    test('expand-collapse-all toggle works', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible({ timeout: 10_000 });

        const toggleBtn = page.locator('.study__expand-collapse-all');
        await expect(toggleBtn).toBeVisible();

        await toggleBtn.click();

        const accordions = page.locator('.study__sub-accordion');
        const count = await accordions.count();
        for (let i = 0; i < Math.min(count, 3); i++) {
            await expect(accordions.nth(i)).toHaveClass(/study__sub-accordion--open/);
        }

        await toggleBtn.click();

        for (let i = 0; i < Math.min(count, 3); i++) {
            await expect(accordions.nth(i)).not.toHaveClass(/study__sub-accordion--open/);
        }
    });
});

test.describe('Study guide — mark as studied', () => {
    test.beforeEach(async ({ page }) => {
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
                    studiedTopicIds: [],
                })
            );
        });
    });

    test('mark-as-studied button is visible and clicking it shows confirmation', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible({ timeout: 10_000 });

        const markBtn = page.locator('.study__mark-studied').first();
        await expect(markBtn).toBeVisible();

        await markBtn.click();

        await expect(page.locator('.study__in-practice-badge').first()).toBeVisible({ timeout: 5_000 });
    });
});

test.describe('Study guide — filter chips', () => {
    test('filter buttons are visible', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__filter-btn').first()).toBeVisible({ timeout: 10_000 });

        const filterBtns = page.locator('.study__filter-row').first().locator('.study__filter-btn');
        const count = await filterBtns.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

    test('clicking a filter updates visible sections', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__filter-btn').first()).toBeVisible({ timeout: 10_000 });

        const allBtn = page.locator('.study__filter-row').first().locator('.study__filter-btn').first();
        await expect(allBtn).toHaveClass(/study__filter-btn--active/);

        const studiedBtn = page.locator('.study__filter-row').first().locator('.study__filter-btn').nth(1);
        await studiedBtn.click();
        await expect(studiedBtn).toHaveClass(/study__filter-btn--active/);
        await expect(allBtn).not.toHaveClass(/study__filter-btn--active/);

        await expect(page.locator('.study__filter-banner')).toBeVisible();
    });
});

test.describe('Study guide — today filter', () => {
    test('today=1 restricts to plan topics and shows banner', async ({ page }) => {
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
                    studiedTopicIds: [],
                })
            );
        });

        await page.goto('/#/study?today=1');
        await expect(page.locator('.study__title')).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('.study__filter-banner')).toBeVisible();
    });
});

test.describe('Study guide — search', () => {
    test('search input filters questions and shows result count', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__search-input')).toBeVisible({ timeout: 10_000 });

        await page.locator('.study__search-input').fill('closure');
        await expect(page.locator('.study__search-count')).toBeVisible({ timeout: 5_000 });
    });
});

test.describe('Study guide — practice CTA', () => {
    test('link to practice is visible', async ({ page }) => {
        await page.goto('/#/study');
        await expect(page.locator('.study__title')).toBeVisible({ timeout: 10_000 });

        const practiceLink = page.locator('.study__plan-complete-btn--primary');
        await expect(practiceLink).toBeVisible();
    });
});
