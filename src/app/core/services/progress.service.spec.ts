import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateLoader, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { ProgressService, sm2 } from './progress.service';
import { StorageService } from './storage.service';

class StubLoader implements TranslateLoader {
    getTranslation(): Observable<TranslationObject> {
        return of({});
    }
}

function setup(): { service: ProgressService } {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(),
            ...provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })
        ]
    });
    return { service: TestBed.inject(ProgressService) };
}

describe('sm2 — pure algorithm', () => {
    it('first successful answer gives interval of 1 day', () => {
        const result = sm2(5, 0, 2.5, 0);
        expect(result.nextIntervalDays).toBe(1);
        expect(result.repetitionCount).toBe(1);
    });

    it('second successful answer gives interval of 6 days', () => {
        const result = sm2(5, 1, 2.5, 1);
        expect(result.nextIntervalDays).toBe(6);
        expect(result.repetitionCount).toBe(2);
    });

    it('third successful answer multiplies last interval by ease factor', () => {
        const result = sm2(5, 2, 2.5, 6);
        expect(result.nextIntervalDays).toBe(Math.round(6 * result.easeFactor));
        expect(result.repetitionCount).toBe(3);
    });

    it('failed review resets repetitionCount to 0 and interval to 1', () => {
        const result = sm2(1, 5, 2.8, 30);
        expect(result.nextIntervalDays).toBe(1);
        expect(result.repetitionCount).toBe(0);
    });

    it('ease factor increases on a perfect grade', () => {
        const result = sm2(5, 0, 2.5, 0);
        expect(result.easeFactor).toBeGreaterThan(2.5);
    });

    it('ease factor decreases on a low (partial) grade', () => {
        const result = sm2(3, 2, 2.5, 6);
        expect(result.easeFactor).toBeLessThan(2.5);
    });

    it('ease factor never drops below 1.3', () => {
        // Simulate repeated poor performance driving EF down
        let ef = 2.5;
        let n = 0;
        let interval = 0;
        for (let i = 0; i < 20; i++) {
            const r = sm2(3, n, ef, interval);
            ef = r.easeFactor;
            n = r.repetitionCount;
            interval = r.nextIntervalDays;
        }
        expect(ef).toBeGreaterThanOrEqual(1.3);
    });
});

describe('ProgressService — recordSelfRating with SM-2', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('creates a new progress entry with SM-2 fields on first answer', () => {
        const { service } = setup();
        service.recordSelfRating(1, 'nailed');
        const p = service.getProgress().find((x) => x.questionId === 1)!;
        expect(p).toBeDefined();
        expect(p.nailedCount).toBe(1);
        expect(p.repetitionCount).toBe(1);
        expect(p.intervalDays).toBe(1);
        expect(p.easeFactor).toBeGreaterThan(2.5);
    });

    it('accumulates repetitionCount across two nailed answers', () => {
        const { service } = setup();
        service.recordSelfRating(1, 'nailed');
        service.recordSelfRating(1, 'nailed');
        const p = service.getProgress().find((x) => x.questionId === 1)!;
        expect(p.repetitionCount).toBe(2);
        expect(p.intervalDays).toBe(6);
    });

    it('resets repetitionCount to 0 on didntKnow', () => {
        const { service } = setup();
        service.recordSelfRating(1, 'nailed');
        service.recordSelfRating(1, 'nailed');
        service.recordSelfRating(1, 'didntKnow');
        const p = service.getProgress().find((x) => x.questionId === 1)!;
        expect(p.repetitionCount).toBe(0);
        expect(p.intervalDays).toBe(1);
    });

    it('schedules nextReview further ahead as intervals grow', () => {
        const { service } = setup();
        service.recordSelfRating(2, 'nailed'); // rep 1 → 1 day
        const after1 = service.getProgress().find((x) => x.questionId === 2)!;
        service.recordSelfRating(2, 'nailed'); // rep 2 → 6 days
        const after2 = service.getProgress().find((x) => x.questionId === 2)!;
        expect(new Date(after2.nextReview).getTime()).toBeGreaterThan(
            new Date(after1.nextReview).getTime()
        );
    });
});

describe('ProgressService — migration of legacy records', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('defaults easeFactor to 2.5 and repetitionCount to 0 for existing records without SM-2 fields', () => {
        const storage = new StorageService();
        // Seed a record that lacks SM-2 fields (old format)
        storage.set('progress', [
            { questionId: 99, nailedCount: 3, partialCount: 1, didntKnowCount: 0,
              lastAnswered: '2026-01-01T00:00:00.000Z', nextReview: '2026-01-05T00:00:00.000Z' }
        ]);

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                ...provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })
            ]
        });
        const service = TestBed.inject(ProgressService);
        const p = service.getProgress().find((x) => x.questionId === 99)!;
        expect(p.easeFactor).toBe(2.5);
        expect(p.repetitionCount).toBe(0);
        expect(p.intervalDays).toBe(0);
    });
});
