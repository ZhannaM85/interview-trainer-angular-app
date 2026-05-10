import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('My Questions — export and import', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/#/my-questions');
    });

    test('export button is disabled when no questions exist', async ({ page }) => {
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        const exportBtn = page.getByRole('button', { name: /export/i });
        await expect(exportBtn).toBeDisabled();
    });

    test('export button is enabled after adding a question', async ({ page }) => {
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.locator('#myq-question').fill('What is a closure?');
        await page.locator('#myq-answer').fill('A function capturing its outer scope.');
        await page.locator('#myq-subtopic').fill('Closures');
        await page.getByRole('button', { name: /save/i }).click();

        const exportBtn = page.getByRole('button', { name: /export/i });
        await expect(exportBtn).toBeEnabled();
    });

    test('export triggers a file download containing valid JSON', async ({ page }) => {
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        await page.locator('#myq-question').fill('What is a closure?');
        await page.locator('#myq-answer').fill('A function capturing its outer scope.');
        await page.locator('#myq-subtopic').fill('Closures');
        await page.getByRole('button', { name: /save/i }).click();

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: /export/i }).click()
        ]);

        expect(download.suggestedFilename()).toBe('my-questions.json');
        const content = await download.path();
        expect(content).toBeTruthy();
        const json = JSON.parse(fs.readFileSync(content!, 'utf-8'));
        expect(Array.isArray(json)).toBe(true);
        expect(json.length).toBeGreaterThan(0);
        expect(json[0]).toHaveProperty('question', 'What is a closure?');
    });

    test('import shows success toast and adds questions', async ({ page }) => {
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        const importData = JSON.stringify([
            {
                id: 9001,
                question: 'What is RxJS?',
                answer: 'Reactive Extensions for JavaScript.',
                subtopic: 'RxJS',
                difficulty: 'beginner',
                createdAt: '2026-01-01T00:00:00.000Z'
            }
        ]);
        const tmpFile = path.join(os.tmpdir(), 'import-test.json');
        fs.writeFileSync(tmpFile, importData, 'utf-8');

        await page.locator('.myq__file-input').setInputFiles(tmpFile);

        const toast = page.locator('.myq__toast');
        await expect(toast).toBeVisible({ timeout: 3000 });
        await expect(toast).not.toHaveClass(/myq__toast--error/);

        const cards = page.locator('.myq__card');
        await expect(cards).toHaveCount(1);
        await expect(cards.first()).toContainText('What is RxJS?');

        fs.unlinkSync(tmpFile);
    });

    test('import shows error toast for malformed JSON', async ({ page }) => {
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        const tmpFile = path.join(os.tmpdir(), 'bad-import.json');
        fs.writeFileSync(tmpFile, 'this is not json', 'utf-8');

        await page.locator('.myq__file-input').setInputFiles(tmpFile);

        const errorToast = page.locator('.myq__toast--error');
        await expect(errorToast).toBeVisible({ timeout: 3000 });

        fs.unlinkSync(tmpFile);
    });

    test('import skips duplicates and reports correct counts in toast', async ({ page }) => {
        await page.evaluate(() => localStorage.clear());
        await page.reload();

        const question = {
            id: 9002,
            question: 'What is Angular?',
            answer: 'A framework.',
            subtopic: 'Angular',
            difficulty: 'intermediate' as const,
            createdAt: '2026-01-01T00:00:00.000Z'
        };

        const tmpFile = path.join(os.tmpdir(), 'dedup-test.json');
        fs.writeFileSync(tmpFile, JSON.stringify([question]), 'utf-8');

        // First import — adds 1
        await page.locator('.myq__file-input').setInputFiles(tmpFile);
        await expect(page.locator('.myq__toast')).toBeVisible({ timeout: 3000 });
        await expect(page.locator('.myq__card')).toHaveCount(1);

        // Second import — skips 1 duplicate
        await page.locator('.myq__file-input').setInputFiles(tmpFile);
        const toast = page.locator('.myq__toast');
        await expect(toast).toBeVisible({ timeout: 3000 });
        await expect(toast).toContainText('0');
        await expect(page.locator('.myq__card')).toHaveCount(1);

        fs.unlinkSync(tmpFile);
    });
});
