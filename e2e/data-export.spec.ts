import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('Data backup — export and import on dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/#/dashboard');
    });

    test('export button is visible on dashboard', async ({ page }) => {
        const exportBtn = page.getByRole('button', { name: /export data/i });
        await expect(exportBtn).toBeVisible();
    });

    test('import button is visible on dashboard', async ({ page }) => {
        const importBtn = page.getByRole('button', { name: /import/i });
        await expect(importBtn).toBeVisible();
    });

    test('export triggers a download with valid JSON containing all keys', async ({ page }) => {
        await page.evaluate(() => {
            localStorage.setItem(
                'interview-trainer:progress',
                JSON.stringify([
                    {
                        questionId: 1,
                        nailedCount: 2,
                        partialCount: 0,
                        didntKnowCount: 1,
                        lastAnswered: '2026-01-01T00:00:00.000Z',
                        nextReview: '2026-01-04T00:00:00.000Z'
                    }
                ])
            );
        });
        await page.reload();

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: /export data/i }).click()
        ]);

        expect(download.suggestedFilename()).toMatch(/^karkas-backup-\d{4}-\d{2}-\d{2}\.json$/);
        const filePath = await download.path();
        expect(filePath).toBeTruthy();
        const json = JSON.parse(fs.readFileSync(filePath!, 'utf-8'));
        expect(json).toHaveProperty('progress');
        expect(json).toHaveProperty('activityByDay');
        expect(json).toHaveProperty('todayPlan');
        expect(json).toHaveProperty('customQuestions');
        expect(json).toHaveProperty('exportedAt');
        expect(Array.isArray(json.progress)).toBe(true);
        expect(json.progress.length).toBeGreaterThan(0);
    });

    test('import shows diff confirmation before restoring', async ({ page }) => {
        const backup = {
            progress: [
                {
                    questionId: 99,
                    nailedCount: 1,
                    partialCount: 0,
                    didntKnowCount: 0,
                    lastAnswered: '2026-01-01T00:00:00.000Z',
                    nextReview: '2026-01-04T00:00:00.000Z'
                }
            ],
            activityByDay: [
                { date: '2026-01-01', questionsAnswered: 3, topicsStudied: 1, activeSeconds: 120 }
            ],
            todayPlan: {
                planDate: '2026-01-01',
                selectedTopicIds: [],
                studiedTopicIds: []
            },
            customQuestions: [],
            exportedAt: '2026-01-01T10:00:00.000Z'
        };

        const tmpFile = path.join(os.tmpdir(), 'karkas-test-backup.json');
        fs.writeFileSync(tmpFile, JSON.stringify(backup), 'utf-8');

        await page.locator('.dashboard__file-input').setInputFiles(tmpFile);

        const confirmBody = page.locator('.dashboard__backup-confirm-body');
        await expect(confirmBody).toBeVisible({ timeout: 3000 });
        await expect(confirmBody).toContainText('1');

        const restoreBtn = page.getByRole('button', { name: /restore/i });
        await expect(restoreBtn).toBeVisible();

        const cancelBtn = page.getByRole('button', { name: /cancel/i });
        await expect(cancelBtn).toBeVisible();

        fs.unlinkSync(tmpFile);
    });

    test('cancel import dismisses the confirmation', async ({ page }) => {
        const backup = {
            progress: [],
            activityByDay: [],
            todayPlan: null,
            customQuestions: [],
            exportedAt: '2026-01-01T10:00:00.000Z'
        };
        const tmpFile = path.join(os.tmpdir(), 'karkas-cancel-test.json');
        fs.writeFileSync(tmpFile, JSON.stringify(backup), 'utf-8');

        await page.locator('.dashboard__file-input').setInputFiles(tmpFile);
        await expect(page.locator('.dashboard__backup-confirm-body')).toBeVisible({ timeout: 3000 });

        await page.getByRole('button', { name: /cancel/i }).click();

        await expect(page.locator('.dashboard__backup-confirm-body')).not.toBeVisible();
        await expect(page.getByRole('button', { name: /export data/i })).toBeVisible();

        fs.unlinkSync(tmpFile);
    });

    test('import shows error for invalid JSON file', async ({ page }) => {
        const tmpFile = path.join(os.tmpdir(), 'karkas-bad.json');
        fs.writeFileSync(tmpFile, 'this is not valid json{{{', 'utf-8');

        await page.locator('.dashboard__file-input').setInputFiles(tmpFile);

        const errorMsg = page.locator('[role="alert"]');
        await expect(errorMsg).toBeVisible({ timeout: 3000 });

        fs.unlinkSync(tmpFile);
    });
});
