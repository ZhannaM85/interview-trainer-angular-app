import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateLoader, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { QuestionService } from './question.service';
import { StorageService } from './storage.service';
import type { Question } from '../../shared/models/question.model';

class StubLoader implements TranslateLoader {
    getTranslation(): Observable<TranslationObject> {
        return of({});
    }
}

function makeQuestions(count: number): Question[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        question: `Q${i + 1}`,
        answer: '',
        weakAnswer: '',
        technicalAnswer: '',
        interviewAnswer: '',
        codeExample: '',
        readMoreLinks: [],
        subtopic: 'closures',
        category: 'javascript' as const,
        difficulty: 'beginner' as const
    }));
}

function drainQueue(service: QuestionService): Question[] {
    const result: Question[] = [];
    let q: Question | null;
    while ((q = service.getNextQuestion()) !== null) {
        result.push(q);
    }
    return result;
}

function setup(): { service: QuestionService; storage: StorageService } {
    TestBed.configureTestingModule({
        providers: [
            provideHttpClient(),
            ...provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })
        ]
    });
    return {
        service: TestBed.inject(QuestionService),
        storage: TestBed.inject(StorageService)
    };
}

describe('QuestionService — shuffleEnabled', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('defaults to true when no stored preference', () => {
        const { service } = setup();
        expect(service.shuffleEnabled()).toBe(true);
    });

    it('reads false from storage on init', () => {
        localStorage.setItem('interview-trainer:quiz-shuffle', 'false');
        const { service } = setup();
        expect(service.shuffleEnabled()).toBe(false);
    });

    it('toggleShuffle flips to false and persists', () => {
        const { service, storage } = setup();
        service.toggleShuffle();
        expect(service.shuffleEnabled()).toBe(false);
        expect(storage.get<boolean>('quiz-shuffle')).toBe(false);
    });

    it('toggleShuffle flips back to true', () => {
        const { service } = setup();
        service.toggleShuffle();
        service.toggleShuffle();
        expect(service.shuffleEnabled()).toBe(true);
    });
});

describe('QuestionService — initializeQueue', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('returns all questions regardless of shuffle state', () => {
        const { service } = setup();
        const questions = makeQuestions(6);
        service.initializeQueue(questions);
        const result = drainQueue(service);
        expect(result.length).toBe(6);
        expect(result.map((q) => q.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('preserves original order when shuffleEnabled is false', () => {
        const { service } = setup();
        service.toggleShuffle(); // disable
        const questions = makeQuestions(8);
        service.initializeQueue(questions);
        const result = drainQueue(service);
        expect(result.map((q) => q.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('handles an empty queue', () => {
        const { service } = setup();
        service.initializeQueue([]);
        expect(service.getNextQuestion()).toBeNull();
    });

    it('handles a single-item queue', () => {
        const { service } = setup();
        const questions = makeQuestions(1);
        service.initializeQueue(questions);
        expect(service.getNextQuestion()?.id).toBe(1);
        expect(service.getNextQuestion()).toBeNull();
    });
});
