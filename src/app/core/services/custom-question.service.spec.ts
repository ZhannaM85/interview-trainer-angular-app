import { TestBed } from '@angular/core/testing';

import { CustomQuestionService } from './custom-question.service';
import { StorageService } from './storage.service';

function setup(): { service: CustomQuestionService } {
    TestBed.configureTestingModule({});
    return { service: TestBed.inject(CustomQuestionService) };
}

const VALID_Q = {
    id: 1,
    question: 'What is a closure?',
    answer: 'A function that captures its lexical scope.',
    subtopic: 'Closures',
    difficulty: 'beginner' as const,
    createdAt: '2026-01-01T00:00:00.000Z'
};

describe('CustomQuestionService — importFrom', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('imports valid questions and returns correct counts', () => {
        const { service } = setup();
        const result = service.importFrom([VALID_Q]);
        expect(result.added).toBe(1);
        expect(result.skipped).toBe(0);
        expect(service.questions().length).toBe(1);
    });

    it('skips duplicate ids', () => {
        const { service } = setup();
        service.importFrom([VALID_Q]);
        const result = service.importFrom([VALID_Q]);
        expect(result.added).toBe(0);
        expect(result.skipped).toBe(1);
        expect(service.questions().length).toBe(1);
    });

    it('skips items with missing required fields', () => {
        const { service } = setup();
        const invalid = [
            { id: 2, answer: 'A', subtopic: 'X', difficulty: 'beginner', createdAt: '2026-01-01' },
            { id: 3, question: 'Q?', subtopic: 'X', difficulty: 'beginner', createdAt: '2026-01-01' },
            { id: 4, question: 'Q?', answer: 'A', difficulty: 'beginner', createdAt: '2026-01-01' },
        ];
        const result = service.importFrom(invalid);
        expect(result.added).toBe(0);
        expect(result.skipped).toBe(3);
    });

    it('skips items with invalid difficulty', () => {
        const { service } = setup();
        const result = service.importFrom([{ ...VALID_Q, id: 99, difficulty: 'expert' }]);
        expect(result.added).toBe(0);
        expect(result.skipped).toBe(1);
    });

    it('skips non-object items', () => {
        const { service } = setup();
        const result = service.importFrom([null, 42, 'string', true]);
        expect(result.added).toBe(0);
        expect(result.skipped).toBe(4);
    });

    it('merges new questions with existing ones', () => {
        const { service } = setup();
        service.add({ question: 'Existing?', answer: 'Yes.', subtopic: 'Test', difficulty: 'beginner' });
        const result = service.importFrom([VALID_Q]);
        expect(result.added).toBe(1);
        expect(service.questions().length).toBe(2);
    });

    it('persists imported questions to storage', () => {
        const { service } = setup();
        service.importFrom([VALID_Q]);
        const storage = TestBed.inject(StorageService);
        const stored = storage.get<unknown[]>('custom-questions');
        expect(stored?.length).toBe(1);
    });

    it('returns zero added when given an empty array', () => {
        const { service } = setup();
        const result = service.importFrom([]);
        expect(result.added).toBe(0);
        expect(result.skipped).toBe(0);
    });
});
