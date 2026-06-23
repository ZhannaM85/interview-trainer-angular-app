import { validateSociologyQuestion, type SociologyQuestionValidationCode } from './sociology-question-validate.utils';
import type { SociologyQuestion } from '../models/sociology-question.model';

function makeValid(overrides: Partial<SociologyQuestion> = {}): SociologyQuestion {
    return {
        id: 1,
        topic: 'Topic',
        subtopic: 'Subtopic',
        type: 'single',
        question: 'What is 2+2?',
        options: ['3', '4', '5'],
        correctIndices: [1],
        ...overrides,
    };
}

describe('validateSociologyQuestion', () => {
    it('should return null for a valid single-choice question', () => {
        expect(validateSociologyQuestion(makeValid())).toBeNull();
    });

    it('should return null for a valid multi-choice question', () => {
        const q = makeValid({ type: 'multi', correctIndices: [0, 1] });
        expect(validateSociologyQuestion(q)).toBeNull();
    });

    describe('EMPTY_QUESTION', () => {
        it('should return EMPTY_QUESTION when question is empty string', () => {
            expect(validateSociologyQuestion(makeValid({ question: '' }))).toBe('EMPTY_QUESTION');
        });

        it('should return EMPTY_QUESTION when question is whitespace only', () => {
            expect(validateSociologyQuestion(makeValid({ question: '   ' }))).toBe('EMPTY_QUESTION');
        });
    });

    describe('TOO_FEW_OPTIONS', () => {
        it('should return TOO_FEW_OPTIONS when fewer than 2 options', () => {
            expect(validateSociologyQuestion(makeValid({ options: ['Only one'], correctIndices: [0] })))
                .toBe('TOO_FEW_OPTIONS');
        });

        it('should return TOO_FEW_OPTIONS when options array is empty', () => {
            expect(validateSociologyQuestion(makeValid({ options: [], correctIndices: [] })))
                .toBe('TOO_FEW_OPTIONS');
        });
    });

    describe('EMPTY_OPTION_TEXT', () => {
        it('should return EMPTY_OPTION_TEXT when an option is empty string', () => {
            expect(validateSociologyQuestion(makeValid({ options: ['A', '', 'C'] })))
                .toBe('EMPTY_OPTION_TEXT');
        });

        it('should return EMPTY_OPTION_TEXT when an option is whitespace only', () => {
            expect(validateSociologyQuestion(makeValid({ options: ['A', '  ', 'C'] })))
                .toBe('EMPTY_OPTION_TEXT');
        });
    });

    describe('NO_CORRECT', () => {
        it('should return NO_CORRECT when correctIndices is empty', () => {
            expect(validateSociologyQuestion(makeValid({ type: 'multi', correctIndices: [] })))
                .toBe('NO_CORRECT');
        });
    });

    describe('CORRECT_OUT_OF_RANGE', () => {
        it('should return CORRECT_OUT_OF_RANGE when index is negative', () => {
            expect(validateSociologyQuestion(makeValid({ correctIndices: [-1] })))
                .toBe('CORRECT_OUT_OF_RANGE');
        });

        it('should return CORRECT_OUT_OF_RANGE when index equals options length', () => {
            expect(validateSociologyQuestion(makeValid({ options: ['A', 'B'], correctIndices: [2] })))
                .toBe('CORRECT_OUT_OF_RANGE');
        });

        it('should return CORRECT_OUT_OF_RANGE when index exceeds options length', () => {
            expect(validateSociologyQuestion(makeValid({ correctIndices: [99] })))
                .toBe('CORRECT_OUT_OF_RANGE');
        });

        it('should return CORRECT_OUT_OF_RANGE for non-integer index', () => {
            expect(validateSociologyQuestion(makeValid({ correctIndices: [1.5] })))
                .toBe('CORRECT_OUT_OF_RANGE');
        });
    });

    describe('SINGLE_REQUIRES_ONE_CORRECT', () => {
        it('should return SINGLE_REQUIRES_ONE_CORRECT when type is single but multiple correct indices', () => {
            expect(validateSociologyQuestion(makeValid({ type: 'single', correctIndices: [0, 1] })))
                .toBe('SINGLE_REQUIRES_ONE_CORRECT');
        });

        it('should not trigger for multi type with multiple correct indices', () => {
            expect(validateSociologyQuestion(makeValid({ type: 'multi', correctIndices: [0, 1] })))
                .toBeNull();
        });
    });

    describe('validation priority (first error wins)', () => {
        it('should return EMPTY_QUESTION before checking options', () => {
            const q = makeValid({ question: '', options: ['A'], correctIndices: [] });
            expect(validateSociologyQuestion(q)).toBe('EMPTY_QUESTION');
        });

        it('should return TOO_FEW_OPTIONS before EMPTY_OPTION_TEXT', () => {
            const q = makeValid({ options: [''], correctIndices: [0] });
            expect(validateSociologyQuestion(q)).toBe('TOO_FEW_OPTIONS');
        });

        it('should return EMPTY_OPTION_TEXT before NO_CORRECT', () => {
            const q = makeValid({ type: 'multi', options: ['A', ''], correctIndices: [] });
            expect(validateSociologyQuestion(q)).toBe('EMPTY_OPTION_TEXT');
        });

        it('should return NO_CORRECT before CORRECT_OUT_OF_RANGE', () => {
            // correctIndices is empty, so NO_CORRECT fires first
            const q = makeValid({ type: 'multi', correctIndices: [] });
            expect(validateSociologyQuestion(q)).toBe('NO_CORRECT');
        });
    });

    describe('deduplication of correctIndices', () => {
        it('should deduplicate correctIndices (single type, duplicate single index is valid)', () => {
            const q = makeValid({ type: 'single', correctIndices: [1, 1] });
            // After dedup: [1] => length 1, single is fine
            expect(validateSociologyQuestion(q)).toBeNull();
        });

        it('should detect SINGLE_REQUIRES_ONE_CORRECT after dedup with distinct values', () => {
            const q = makeValid({ type: 'single', correctIndices: [0, 1, 0] });
            // After dedup: [0, 1] => length 2, single requires 1
            expect(validateSociologyQuestion(q)).toBe('SINGLE_REQUIRES_ONE_CORRECT');
        });
    });
});
