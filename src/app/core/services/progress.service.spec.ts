import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateLoader, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { MASTERY_MIN_REPETITIONS, ProgressService, isQuestionMastered, isTopicMastered, sm2 } from './progress.service';
import { StorageService } from './storage.service';
import type { Progress } from '../../shared/models/progress.model';
import type { Question } from '../../shared/models/question.model';

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

function makeProgress(questionId: number, repetitionCount: number): Progress {
    return {
        questionId,
        nailedCount: repetitionCount,
        partialCount: 0,
        didntKnowCount: 0,
        lastAnswered: '2026-01-01T00:00:00.000Z',
        nextReview: '2026-01-05T00:00:00.000Z',
        easeFactor: 2.5,
        repetitionCount,
        intervalDays: 1
    };
}

describe('isQuestionMastered', () => {
    it('returns false when repetitionCount is below threshold', () => {
        expect(isQuestionMastered(makeProgress(1, MASTERY_MIN_REPETITIONS - 1))).toBe(false);
    });

    it('returns true when repetitionCount equals the threshold', () => {
        expect(isQuestionMastered(makeProgress(1, MASTERY_MIN_REPETITIONS))).toBe(true);
    });

    it('returns true when repetitionCount exceeds the threshold', () => {
        expect(isQuestionMastered(makeProgress(1, MASTERY_MIN_REPETITIONS + 3))).toBe(true);
    });
});

describe('isTopicMastered', () => {
    it('returns false for an empty question list', () => {
        expect(isTopicMastered([], new Map())).toBe(false);
    });

    it('returns false when a question has no progress entry', () => {
        const map = new Map([[1, makeProgress(1, MASTERY_MIN_REPETITIONS)]]);
        expect(isTopicMastered([1, 2], map)).toBe(false);
    });

    it('returns false when at least one question is not mastered', () => {
        const map = new Map([
            [1, makeProgress(1, MASTERY_MIN_REPETITIONS)],
            [2, makeProgress(2, MASTERY_MIN_REPETITIONS - 1)]
        ]);
        expect(isTopicMastered([1, 2], map)).toBe(false);
    });

    it('returns true when all questions have reached the mastery threshold', () => {
        const map = new Map([
            [1, makeProgress(1, MASTERY_MIN_REPETITIONS)],
            [2, makeProgress(2, MASTERY_MIN_REPETITIONS + 1)]
        ]);
        expect(isTopicMastered([1, 2], map)).toBe(true);
    });
});

describe('ProgressService.getMasteredTopicIds', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('returns an empty set when there is no progress', () => {
        const { service } = setup();
        const questions: Question[] = [
            { id: 1, question: 'Q1', answer: 'A1', subtopic: 'closures', category: 'javascript', difficulty: 'beginner', weakAnswer: '', technicalAnswer: '', interviewAnswer: '', codeExample: '', readMoreLinks: [] }
        ];
        expect(service.getMasteredTopicIds(questions).size).toBe(0);
    });

    it('returns the topic ID when all its questions are mastered', () => {
        const { service } = setup();
        for (let i = 0; i < MASTERY_MIN_REPETITIONS; i++) {
            service.recordSelfRating(1, 'nailed');
        }
        const questions: Question[] = [
            { id: 1, question: 'Q1', answer: 'A1', subtopic: 'closures', category: 'javascript', difficulty: 'beginner', weakAnswer: '', technicalAnswer: '', interviewAnswer: '', codeExample: '', readMoreLinks: [] }
        ];
        expect(service.getMasteredTopicIds(questions).has('javascript:closures')).toBe(true);
    });

    it('does not mark a topic as mastered when one question is below the threshold', () => {
        const { service } = setup();
        for (let i = 0; i < MASTERY_MIN_REPETITIONS; i++) {
            service.recordSelfRating(1, 'nailed');
        }
        // question 2 has fewer repetitions
        service.recordSelfRating(2, 'nailed');
        const questions: Question[] = [
            { id: 1, question: 'Q1', answer: 'A1', subtopic: 'closures', category: 'javascript', difficulty: 'beginner', weakAnswer: '', technicalAnswer: '', interviewAnswer: '', codeExample: '', readMoreLinks: [] },
            { id: 2, question: 'Q2', answer: 'A2', subtopic: 'closures', category: 'javascript', difficulty: 'beginner', weakAnswer: '', technicalAnswer: '', interviewAnswer: '', codeExample: '', readMoreLinks: [] }
        ];
        expect(service.getMasteredTopicIds(questions).has('javascript:closures')).toBe(false);
    });
});
