import { TestBed } from '@angular/core/testing';

import { SociologyCatalogEditService } from './sociology-catalog-edit.service';
import type { SociologyQuestion } from '../../shared/models/sociology-question.model';

const STORAGE_KEY = 'interview-trainer:sociology-catalog-edits';

function makeQuestion(overrides: Partial<SociologyQuestion> = {}): SociologyQuestion {
    return {
        id: 1,
        topic: 'Culture',
        subtopic: 'Norms',
        type: 'single',
        question: 'What is a norm?',
        options: ['Rule', 'Value', 'Belief'],
        correctIndices: [0],
        ...overrides
    };
}

function setup(): SociologyCatalogEditService {
    TestBed.configureTestingModule({});
    return TestBed.inject(SociologyCatalogEditService);
}

describe('SociologyCatalogEditService', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    describe('initial state', () => {
        it('starts with an empty overrides list when no stored data', () => {
            const svc = setup();
            expect(svc.overridesList()).toEqual([]);
        });

        it('loads valid overrides from localStorage', () => {
            const q = makeQuestion();
            localStorage.setItem(STORAGE_KEY, JSON.stringify([q]));
            TestBed.configureTestingModule({});
            const svc = TestBed.inject(SociologyCatalogEditService);
            expect(svc.overridesList().length).toBe(1);
            expect(svc.overridesList()[0].id).toBe(1);
        });

        it('skips invalid entries in stored data', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([
                makeQuestion(),
                { id: 2, question: '', options: [], correctIndices: [], type: 'single', topic: 'T', subtopic: 'S' }
            ]));
            TestBed.configureTestingModule({});
            const svc = TestBed.inject(SociologyCatalogEditService);
            expect(svc.overridesList().length).toBe(1);
        });

        it('handles non-array stored value gracefully', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify('not-an-array'));
            TestBed.configureTestingModule({});
            const svc = TestBed.inject(SociologyCatalogEditService);
            expect(svc.overridesList()).toEqual([]);
        });
    });

    describe('hasOverrideFor', () => {
        it('returns false when no overrides exist', () => {
            const svc = setup();
            expect(svc.hasOverrideFor(1)).toBe(false);
        });

        it('returns true when an override exists for the given id', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 5 }));
            expect(svc.hasOverrideFor(5)).toBe(true);
        });

        it('returns false for a non-matching id', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 5 }));
            expect(svc.hasOverrideFor(99)).toBe(false);
        });
    });

    describe('mergeWithBase', () => {
        it('returns base unchanged when no overrides exist', () => {
            const svc = setup();
            const base = [makeQuestion({ id: 1 }), makeQuestion({ id: 2 })];
            const result = svc.mergeWithBase(base);
            expect(result).toEqual(base);
        });

        it('replaces matching base questions with overrides', () => {
            const svc = setup();
            const edited = makeQuestion({ id: 1, question: 'Edited question?' });
            svc.saveOverride(edited);
            const base = [makeQuestion({ id: 1 }), makeQuestion({ id: 2 })];
            const result = svc.mergeWithBase(base);
            expect(result[0].question).toBe('Edited question?');
            expect(result[1].id).toBe(2);
        });

        it('does not add override entries that are not in base', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 99, question: 'Extra?' }));
            const base = [makeQuestion({ id: 1 })];
            const result = svc.mergeWithBase(base);
            expect(result.length).toBe(1);
            expect(result[0].id).toBe(1);
        });
    });

    describe('saveOverride', () => {
        it('returns null on successful save', () => {
            const svc = setup();
            const result = svc.saveOverride(makeQuestion());
            expect(result).toBeNull();
        });

        it('adds a new override to the list', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 10 }));
            expect(svc.overridesList().length).toBe(1);
            expect(svc.overridesList()[0].id).toBe(10);
        });

        it('replaces an existing override with the same id', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 10, question: 'V1?' }));
            svc.saveOverride(makeQuestion({ id: 10, question: 'V2?' }));
            expect(svc.overridesList().length).toBe(1);
            expect(svc.overridesList()[0].question).toBe('V2?');
        });

        it('persists to localStorage', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 7 }));
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as SociologyQuestion[];
            expect(stored.length).toBe(1);
            expect(stored[0].id).toBe(7);
        });

        it('returns validation error for invalid question', () => {
            const svc = setup();
            const bad = makeQuestion({ question: '' });
            const result = svc.saveOverride(bad);
            expect(result).toBe('EMPTY_QUESTION');
        });

        it('returns EMPTY_OPTION_TEXT for question with empty option', () => {
            const svc = setup();
            const bad = makeQuestion({ options: ['Good', ''] });
            const result = svc.saveOverride(bad);
            expect(result).toBe('EMPTY_OPTION_TEXT');
        });

        it('returns TOO_FEW_OPTIONS for question with fewer than 2 options', () => {
            const svc = setup();
            const bad = makeQuestion({ options: ['Only one'] });
            const result = svc.saveOverride(bad);
            expect(result).toBe('TOO_FEW_OPTIONS');
        });

        it('returns NO_CORRECT when correctIndices is empty', () => {
            const svc = setup();
            const bad = makeQuestion({ correctIndices: [] });
            const result = svc.saveOverride(bad);
            expect(result).toBe('NO_CORRECT');
        });

        it('returns SINGLE_REQUIRES_ONE_CORRECT for single type with multiple correct', () => {
            const svc = setup();
            const bad = makeQuestion({ type: 'single', correctIndices: [0, 1] });
            const result = svc.saveOverride(bad);
            expect(result).toBe('SINGLE_REQUIRES_ONE_CORRECT');
        });

        it('does not save when validation fails', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ question: '' }));
            expect(svc.overridesList().length).toBe(0);
        });

        it('sorts correctIndices on save', () => {
            const svc = setup();
            const q = makeQuestion({ type: 'multi', correctIndices: [2, 0, 1] });
            svc.saveOverride(q);
            expect(svc.overridesList()[0].correctIndices).toEqual([0, 1, 2]);
        });
    });

    describe('removeOverride', () => {
        it('removes an override by id', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 1 }));
            svc.saveOverride(makeQuestion({ id: 2 }));
            svc.removeOverride(1);
            expect(svc.overridesList().length).toBe(1);
            expect(svc.overridesList()[0].id).toBe(2);
        });

        it('is a no-op when id does not exist', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 1 }));
            svc.removeOverride(999);
            expect(svc.overridesList().length).toBe(1);
        });

        it('persists removal to localStorage', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 1 }));
            svc.removeOverride(1);
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as SociologyQuestion[];
            expect(stored.length).toBe(0);
        });
    });

    describe('clearAll', () => {
        it('removes all overrides', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 1 }));
            svc.saveOverride(makeQuestion({ id: 2 }));
            svc.clearAll();
            expect(svc.overridesList()).toEqual([]);
        });

        it('persists empty list to localStorage', () => {
            const svc = setup();
            svc.saveOverride(makeQuestion({ id: 1 }));
            svc.clearAll();
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as SociologyQuestion[];
            expect(stored).toEqual([]);
        });
    });
});
