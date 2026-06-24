import { test, expect } from '@playwright/test';

test.describe('My Questions — empty state', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.clear());
    });

    test('page loads and shows empty state message', async ({ page }) => {
        await page.goto('/#/my-questions');
        await expect(page.locator('.myq__title')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.myq__empty')).toBeVisible();
    });

    test('form heading shows add-new label', async ({ page }) => {
        await page.goto('/#/my-questions');
        await expect(page.locator('.myq__form-heading')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.myq__form-heading')).not.toBeEmpty();
    });
});

test.describe('My Questions — adding a question', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => localStorage.clear());
    });

    test('filling form and saving shows the question in the list', async ({ page }) => {
        await page.goto('/#/my-questions');
        await expect(page.locator('.myq__title')).toBeVisible({ timeout: 10_000 });

        await page.locator('#myq-question').fill('What is a test question?');
        await page.locator('#myq-answer').fill('This is a test answer.');
        await page.locator('#myq-subtopic').fill('testing');

        await page.locator('.myq__btn--primary').click();

        await expect(page.locator('.myq__empty')).not.toBeVisible();
        await expect(page.locator('.myq__card').first()).toBeVisible();
        await expect(page.locator('.myq__card-question').first()).toContainText('What is a test question?');
        await expect(page.locator('.myq__card-answer').first()).toContainText('This is a test answer.');
    });

    test('saving with empty fields shows validation message', async ({ page }) => {
        await page.goto('/#/my-questions');
        await expect(page.locator('.myq__title')).toBeVisible({ timeout: 10_000 });

        await page.locator('.myq__btn--primary').click();

        await expect(page.locator('.myq__validation-msg')).toBeVisible();
    });
});

test.describe('My Questions — editing a question', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.clear();
            localStorage.setItem(
                'interview-trainer:custom-questions',
                JSON.stringify([
                    {
                        id: 'cq-1',
                        question: 'Original question?',
                        answer: 'Original answer.',
                        subtopic: 'general',
                        difficulty: 'medium',
                        createdAt: new Date().toISOString(),
                    },
                ])
            );
        });
    });

    test('clicking Edit loads the question into the form', async ({ page }) => {
        await page.goto('/#/my-questions');
        await expect(page.locator('.myq__card').first()).toBeVisible({ timeout: 10_000 });

        const editBtn = page.locator('.myq__card').first().locator('.myq__btn--secondary');
        await editBtn.click();

        await expect(page.locator('#myq-question')).toHaveValue('Original question?');
        await expect(page.locator('#myq-answer')).toHaveValue('Original answer.');
    });

    test('editing and saving updates the question in the list', async ({ page }) => {
        await page.goto('/#/my-questions');
        await expect(page.locator('.myq__card').first()).toBeVisible({ timeout: 10_000 });

        const editBtn = page.locator('.myq__card').first().locator('.myq__btn--secondary');
        await editBtn.click();

        await page.locator('#myq-question').fill('Updated question?');
        await page.locator('.myq__btn--primary').click();

        await expect(page.locator('.myq__card-question').first()).toContainText('Updated question?');
    });

    test('cancel button exits edit mode', async ({ page }) => {
        await page.goto('/#/my-questions');
        await expect(page.locator('.myq__card').first()).toBeVisible({ timeout: 10_000 });

        const editBtn = page.locator('.myq__card').first().locator('.myq__btn--secondary');
        await editBtn.click();

        const cancelBtn = page.locator('.myq__form-actions .myq__btn--secondary');
        await expect(cancelBtn).toBeVisible();
        await cancelBtn.click();

        await expect(page.locator('#myq-question')).toHaveValue('');
    });
});

test.describe('My Questions — deleting a question', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.clear();
            localStorage.setItem(
                'interview-trainer:custom-questions',
                JSON.stringify([
                    {
                        id: 'cq-1',
                        question: 'Question to delete?',
                        answer: 'Answer to delete.',
                        subtopic: 'general',
                        difficulty: 'medium',
                        createdAt: new Date().toISOString(),
                    },
                ])
            );
        });
    });

    test('clicking Delete removes the question and shows empty state', async ({ page }) => {
        await page.goto('/#/my-questions');
        await expect(page.locator('.myq__card').first()).toBeVisible({ timeout: 10_000 });

        page.on('dialog', dialog => dialog.accept());

        const deleteBtn = page.locator('.myq__card').first().locator('.myq__btn--danger');
        await deleteBtn.click();

        await expect(page.locator('.myq__empty')).toBeVisible({ timeout: 5_000 });
    });
});

test.describe('My Questions — multiple questions', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.clear();
            localStorage.setItem(
                'interview-trainer:custom-questions',
                JSON.stringify([
                    {
                        id: 'cq-1',
                        question: 'First question?',
                        answer: 'First answer.',
                        subtopic: 'general',
                        difficulty: 'easy',
                        createdAt: new Date().toISOString(),
                    },
                    {
                        id: 'cq-2',
                        question: 'Second question?',
                        answer: 'Second answer.',
                        subtopic: 'advanced',
                        difficulty: 'hard',
                        createdAt: new Date().toISOString(),
                    },
                ])
            );
        });
    });

    test('lists all seeded questions', async ({ page }) => {
        await page.goto('/#/my-questions');
        await expect(page.locator('.myq__card').first()).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('.myq__card')).toHaveCount(2);
        await expect(page.locator('.myq__card-question').first()).toContainText('First question?');
        await expect(page.locator('.myq__card-question').nth(1)).toContainText('Second question?');
    });

    test('subtopic and difficulty badges are shown', async ({ page }) => {
        await page.goto('/#/my-questions');
        await expect(page.locator('.myq__card').first()).toBeVisible({ timeout: 10_000 });

        await expect(page.locator('.myq__badge--subtopic').first()).toContainText('general');
        await expect(page.locator('.myq__badge--difficulty').first()).toBeVisible();
    });
});
