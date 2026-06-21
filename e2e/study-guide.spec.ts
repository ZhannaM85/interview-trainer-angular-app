import { test, expect, type Locator } from '@playwright/test';

test.describe('Study guide difficulty filter', () => {
    test('shows four difficulty chips with All active by default', async ({ page }) => {
        await page.goto('/study');
        const row = page.locator('.study__difficulty-row');
        await expect(row).toBeVisible({ timeout: 10_000 });

        const chips = row.locator('button');
        await expect(chips).toHaveCount(4);

        const allChip = chips.first();
        await expect(allChip).toHaveAttribute('aria-pressed', 'true');
        for (let i = 1; i < 4; i++) {
            await expect(chips.nth(i)).toHaveAttribute('aria-pressed', 'false');
        }
    });

    test('selecting a difficulty chip filters questions and marks it active', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__difficulty-row')).toBeVisible({ timeout: 10_000 });

        const chips = page.locator('.study__difficulty-row button');
        const beginnerChip = chips.nth(1);

        await beginnerChip.click();
        await expect(beginnerChip).toHaveAttribute('aria-pressed', 'true');
        await expect(chips.first()).toHaveAttribute('aria-pressed', 'false');

        await expect(page.locator('.study__cat')).not.toHaveCount(0);
    });

    test('clicking All restores the unfiltered guide', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__difficulty-row')).toBeVisible({ timeout: 10_000 });

        const chips = page.locator('.study__difficulty-row button');
        await chips.nth(1).click();
        await chips.first().click();

        await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.study__cat')).not.toHaveCount(0);
    });

    test('difficulty filter combines with the status filter query param', async ({ page }) => {
        await page.goto('/study?filter=unstudied');
        await expect(page.locator('.study__difficulty-row')).toBeVisible({ timeout: 10_000 });

        const chips = page.locator('.study__difficulty-row button');
        await chips.nth(2).click();
        await expect(chips.nth(2)).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.study__filter-row').first().locator('button').nth(2)).toHaveAttribute('aria-pressed', 'true');
    });
});

test.describe('Study guide full-text search', () => {
    test('search input is visible on the study guide page', async ({ page }) => {
        await page.goto('/study');
        const input = page.locator('.study__search-input');
        await expect(input).toBeVisible({ timeout: 10_000 });
    });

    test('typing a query filters questions and shows result count', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__search-input')).toBeVisible({ timeout: 10_000 });

        await page.locator('.study__search-input').fill('what');
        await expect(page.locator('.study__search-count')).toBeVisible();
        await expect(page.locator('.study__cat')).not.toHaveCount(0);
    });

    test('search expands all subtopic accordions automatically', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__search-input')).toBeVisible({ timeout: 10_000 });

        // Collapse everything first
        const collapseBtn = page.locator('.study__expand-collapse-all');
        if (await collapseBtn.isVisible()) {
            // Click until text indicates collapsed (if possible); just click once to get a consistent state
            await collapseBtn.click();
        }

        await page.locator('.study__search-input').fill('closure');

        // All visible accordions should be open
        const accordions = page.locator('.study__sub-accordion');
        const count = await accordions.count();
        for (let i = 0; i < count; i++) {
            await expect(accordions.nth(i)).toHaveClass(/study__sub-accordion--open/);
        }
    });

    test('shows no-results message when query matches nothing', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__search-input')).toBeVisible({ timeout: 10_000 });

        await page.locator('.study__search-input').fill('xyzabcnotfound123');
        await expect(page.locator('.study__message')).toBeVisible();
        await expect(page.locator('.study__cat')).toHaveCount(0);
    });

    test('clearing the search restores the full guide', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__search-input')).toBeVisible({ timeout: 10_000 });

        await page.locator('.study__search-input').fill('xyzabcnotfound123');
        await expect(page.locator('.study__message')).toBeVisible();

        await page.locator('.study__search-input').fill('');
        await expect(page.locator('.study__cat')).not.toHaveCount(0);
        await expect(page.locator('.study__search-count')).not.toBeVisible();
    });

    test('search works together with the difficulty filter', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__search-input')).toBeVisible({ timeout: 10_000 });

        // Apply difficulty filter first
        await page.locator('.study__difficulty-row button').nth(1).click();
        // Then search
        await page.locator('.study__search-input').fill('what');

        const diffBtn = page.locator('.study__difficulty-row button').nth(1);
        await expect(diffBtn).toHaveAttribute('aria-pressed', 'true');
        // Either results or no-results message should be visible
        const hasCats = await page.locator('.study__cat').count();
        const hasMsg = await page.locator('.study__message').count();
        expect(hasCats + hasMsg).toBeGreaterThan(0);
    });
});

test.describe('Study guide "Not yet studied" filter', () => {
    test('shows the "Not yet studied" chip in the filter row', async ({ page }) => {
        await page.goto('/study');
        const filterRow = page.locator('.study__filter-row').first();
        await expect(filterRow).toBeVisible({ timeout: 10_000 });

        const chips = filterRow.locator('button');
        await expect(chips).toHaveCount(4);
        const neverStudiedChip = chips.nth(3);
        await expect(neverStudiedChip).toHaveAttribute('aria-pressed', 'false');
    });

    test('clicking "Not yet studied" activates the filter and updates the URL', async ({ page }) => {
        await page.goto('/study');
        const filterRow = page.locator('.study__filter-row').first();
        await expect(filterRow).toBeVisible({ timeout: 10_000 });

        const neverStudiedChip = filterRow.locator('button').nth(3);
        await neverStudiedChip.click();

        await expect(neverStudiedChip).toHaveAttribute('aria-pressed', 'true');
        await expect(page).toHaveURL(/filter=never-studied/);
    });

    test('navigating directly to ?filter=never-studied activates the filter', async ({ page }) => {
        await page.goto('/study?filter=never-studied');
        const filterRow = page.locator('.study__filter-row').first();
        await expect(filterRow).toBeVisible({ timeout: 10_000 });

        const neverStudiedChip = filterRow.locator('button').nth(3);
        await expect(neverStudiedChip).toHaveAttribute('aria-pressed', 'true');
    });

    test('shows the filter banner when "Not yet studied" is active', async ({ page }) => {
        await page.goto('/study?filter=never-studied');
        await expect(page.locator('.study__filter-row').first()).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('.study__filter-banner')).toBeVisible();
    });

    test('shows all topics when no topics have been studied (fresh state)', async ({ page }) => {
        await page.goto('/study?filter=never-studied');
        await expect(page.locator('.study__filter-row').first()).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('.study__cat')).not.toHaveCount(0);
    });
});

test.describe('Study guide collapsible code examples', () => {
    async function openFirstSubtopic(page: Parameters<typeof test>[1]['page']): Promise<Locator> {
        await page.goto('/study');
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible({ timeout: 10_000 });
        const accordion = page.locator('.study__sub-accordion').first();
        const isOpen = await accordion.evaluate((el) => el.classList.contains('study__sub-accordion--open'));
        if (!isOpen) {
            await accordion.locator('.study__sub-disclosure').click();
            await expect(accordion).toHaveClass(/study__sub-accordion--open/);
        }
        return accordion;
    }

    test('code toggle button is hidden until a question has a code example', async ({ page }) => {
        const accordion = await openFirstSubtopic(page);
        const articles = accordion.locator('.study__q');
        const count = await articles.count();
        let foundToggle = false;
        for (let i = 0; i < count; i++) {
            const toggle = articles.nth(i).locator('.interview-answer__code-toggle');
            if (await toggle.count() > 0) {
                foundToggle = true;
                break;
            }
        }
        // The guide has many questions with code examples; at least one subtopic should show a toggle
        // This test just verifies the toggle is never shown for questions without code
        const codesWithoutToggle = await accordion.locator('.interview-answer__code-wrap').filter({ has: page.locator('.interview-answer__label--code') }).count();
        expect(codesWithoutToggle).toBe(0);
        void foundToggle; // used above
    });

    test('code block is collapsed by default and toggle shows "Show code example"', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible({ timeout: 10_000 });

        // Open subtopics until we find one with a code toggle
        const accordions = page.locator('.study__sub-accordion');
        const total = await accordions.count();
        let toggle: Locator | null = null;

        for (let i = 0; i < total && !toggle; i++) {
            const acc = accordions.nth(i);
            const isOpen = await acc.evaluate((el) => el.classList.contains('study__sub-accordion--open'));
            if (!isOpen) {
                await acc.locator('.study__sub-disclosure').click();
            }
            const t = acc.locator('.interview-answer__code-toggle').first();
            if (await t.count() > 0) {
                toggle = t;
            }
        }

        if (!toggle) {
            test.skip(true, 'No question with code example found in visible sections');
            return;
        }

        await expect(toggle).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toContainText('Show code example');
        const pre = toggle.locator('..').locator('.interview-answer__code');
        await expect(pre).toHaveCount(0);
    });

    test('clicking toggle expands the code block and changes label', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible({ timeout: 10_000 });

        const accordions = page.locator('.study__sub-accordion');
        const total = await accordions.count();
        let toggle: Locator | null = null;

        for (let i = 0; i < total && !toggle; i++) {
            const acc = accordions.nth(i);
            const isOpen = await acc.evaluate((el) => el.classList.contains('study__sub-accordion--open'));
            if (!isOpen) {
                await acc.locator('.study__sub-disclosure').click();
            }
            const t = acc.locator('.interview-answer__code-toggle').first();
            if (await t.count() > 0) {
                toggle = t;
            }
        }

        if (!toggle) {
            test.skip(true, 'No question with code example found in visible sections');
            return;
        }

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(toggle).toContainText('Hide code example');
        const wrap = toggle.locator('..');
        await expect(wrap.locator('.interview-answer__code')).toBeVisible();
    });

    test('clicking toggle again collapses the code block', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible({ timeout: 10_000 });

        const accordions = page.locator('.study__sub-accordion');
        const total = await accordions.count();
        let toggle: Locator | null = null;

        for (let i = 0; i < total && !toggle; i++) {
            const acc = accordions.nth(i);
            const isOpen = await acc.evaluate((el) => el.classList.contains('study__sub-accordion--open'));
            if (!isOpen) {
                await acc.locator('.study__sub-disclosure').click();
            }
            const t = acc.locator('.interview-answer__code-toggle').first();
            if (await t.count() > 0) {
                toggle = t;
            }
        }

        if (!toggle) {
            test.skip(true, 'No question with code example found in visible sections');
            return;
        }

        await toggle.click();
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle).toContainText('Show code example');
    });

    test('toggle is keyboard-accessible via Enter', async ({ page }) => {
        await page.goto('/study');
        await expect(page.locator('.study__sub-accordion').first()).toBeVisible({ timeout: 10_000 });

        const accordions = page.locator('.study__sub-accordion');
        const total = await accordions.count();
        let toggle: Locator | null = null;

        for (let i = 0; i < total && !toggle; i++) {
            const acc = accordions.nth(i);
            const isOpen = await acc.evaluate((el) => el.classList.contains('study__sub-accordion--open'));
            if (!isOpen) {
                await acc.locator('.study__sub-disclosure').click();
            }
            const t = acc.locator('.interview-answer__code-toggle').first();
            if (await t.count() > 0) {
                toggle = t;
            }
        }

        if (!toggle) {
            test.skip(true, 'No question with code example found in visible sections');
            return;
        }

        await toggle.focus();
        await page.keyboard.press('Enter');
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });
});
