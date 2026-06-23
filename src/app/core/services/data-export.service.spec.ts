import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TranslateLoader, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import type { AppBackup } from './data-export.service';
import { DataExportService } from './data-export.service';
import { StorageService } from './storage.service';

class StubLoader implements TranslateLoader {
    getTranslation(_lang: string): Observable<TranslationObject> {
        return of({});
    }
}

function setup(): { service: DataExportService; storage: StorageService } {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(),
            provideRouter([]),
            ...provideTranslateService({
                loader: { provide: TranslateLoader, useClass: StubLoader }
            })
        ]
    });
    return {
        service: TestBed.inject(DataExportService),
        storage: TestBed.inject(StorageService)
    };
}

const SAMPLE_BACKUP: AppBackup = {
    progress: [
        {
            questionId: 1,
            nailedCount: 3,
            partialCount: 1,
            didntKnowCount: 0,
            lastAnswered: '2026-01-01T00:00:00.000Z',
            nextReview: '2026-01-04T00:00:00.000Z',
            easeFactor: 2.5,
            repetitionCount: 2,
            intervalDays: 6
        }
    ],
    activityByDay: [
        {
            date: '2026-01-01',
            questionsAnswered: 5,
            topicsStudied: 2,
            activeSeconds: 300,
            coveredTopicIds: ['javascript:closures']
        }
    ],
    todayPlan: {
        planDate: '2026-01-01',
        selectedTopicIds: ['javascript:closures'],
        studiedTopicIds: []
    },
    customQuestions: [
        {
            id: 9001,
            question: 'What is a signal?',
            answer: 'A reactive primitive.',
            subtopic: 'Signals',
            difficulty: 'intermediate',
            createdAt: '2026-01-01T00:00:00.000Z'
        }
    ],
    exportedAt: '2026-01-01T10:00:00.000Z'
};

describe('DataExportService — diffBackup', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('returns correct counts for a full backup', () => {
        const { service } = setup();
        const diff = service.diffBackup(SAMPLE_BACKUP);
        expect(diff.progressCount).toBe(1);
        expect(diff.activityDaysCount).toBe(1);
        expect(diff.customQuestionsCount).toBe(1);
    });

    it('returns zero counts when arrays are empty', () => {
        const { service } = setup();
        const diff = service.diffBackup({
            progress: [],
            activityByDay: [],
            todayPlan: null,
            customQuestions: [],
            exportedAt: ''
        });
        expect(diff.progressCount).toBe(0);
        expect(diff.activityDaysCount).toBe(0);
        expect(diff.customQuestionsCount).toBe(0);
    });

    it('handles non-array fields gracefully', () => {
        const { service } = setup();
        const diff = service.diffBackup({
            progress: null as unknown as [],
            activityByDay: undefined as unknown as [],
            todayPlan: null,
            customQuestions: null as unknown as [],
            exportedAt: ''
        });
        expect(diff.progressCount).toBe(0);
        expect(diff.activityDaysCount).toBe(0);
        expect(diff.customQuestionsCount).toBe(0);
    });

    it('counts multiple entries correctly', () => {
        const { service } = setup();
        const diff = service.diffBackup({
            ...SAMPLE_BACKUP,
            progress: [...SAMPLE_BACKUP.progress, ...SAMPLE_BACKUP.progress],
            activityByDay: [
                ...SAMPLE_BACKUP.activityByDay,
                { ...SAMPLE_BACKUP.activityByDay[0], date: '2026-01-02' }
            ]
        });
        expect(diff.progressCount).toBe(2);
        expect(diff.activityDaysCount).toBe(2);
    });
});

describe('DataExportService — applyBackup', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => TestBed.resetTestingModule());

    it('writes progress, activity, todayPlan, and customQuestions to storage', () => {
        const { service, storage } = setup();
        service.applyBackup(SAMPLE_BACKUP);

        const storedProgress = storage.get<unknown[]>('progress');
        expect(storedProgress?.length).toBe(1);

        const storedActivity = storage.get<unknown[]>('activity-by-day');
        expect(storedActivity?.length).toBe(1);

        const storedPlan = storage.get<unknown>('today-plan');
        expect(storedPlan).not.toBeNull();

        const storedCustom = storage.get<unknown[]>('custom-questions');
        expect(storedCustom?.length).toBe(1);
    });

    it('calls reload after writing storage', () => {
        const { service } = setup();
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        service.applyBackup(SAMPLE_BACKUP);
        const reloadError = consoleSpy.mock.calls.find(
            call => String(call[0]).includes('Not implemented: navigation')
        );
        expect(reloadError).toBeDefined();
        consoleSpy.mockRestore();
    });

    it('skips writing todayPlan when it is null', () => {
        const { service, storage } = setup();
        service.applyBackup({ ...SAMPLE_BACKUP, todayPlan: null });

        const stored = storage.get<unknown>('today-plan');
        expect(stored).toBeNull();
    });

    it('skips writing progress when it is not an array', () => {
        const { service, storage } = setup();
        service.applyBackup({ ...SAMPLE_BACKUP, progress: null as unknown as [] });

        const stored = storage.get<unknown>('progress');
        expect(stored).toBeNull();
    });
});

describe('DataExportService — parseBackupFile', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('resolves with parsed object for valid JSON', async () => {
        const { service } = setup();
        const json = JSON.stringify(SAMPLE_BACKUP);
        const file = new File([json], 'backup.json', { type: 'application/json' });
        const result = await service.parseBackupFile(file);
        expect(result.exportedAt).toBe(SAMPLE_BACKUP.exportedAt);
        expect(result.progress.length).toBe(1);
    });

    it('rejects for invalid JSON', async () => {
        const { service } = setup();
        const file = new File(['not valid json{{{'], 'bad.json', { type: 'application/json' });
        await expect(service.parseBackupFile(file)).rejects.toThrow();
    });

    it('rejects when JSON root is not an object', async () => {
        const { service } = setup();
        const file = new File([JSON.stringify([1, 2, 3])], 'array.json', {
            type: 'application/json'
        });
        await expect(service.parseBackupFile(file)).rejects.toThrow();
    });

    it('rejects when JSON root is a primitive', async () => {
        const { service } = setup();
        const file = new File([JSON.stringify(42)], 'num.json', { type: 'application/json' });
        await expect(service.parseBackupFile(file)).rejects.toThrow();
    });
});
