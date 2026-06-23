import { evaluateSociologySelection, type SociologyOutcome } from './sociology-answer.utils';
import type { SociologyQuestion } from '../models/sociology-question.model';

function makeQuestion(correctIndices: number[], optionCount = 4): SociologyQuestion {
    return {
        id: 1,
        topic: 'Test',
        subtopic: 'Test Sub',
        type: correctIndices.length === 1 ? 'single' : 'multi',
        question: 'Test question?',
        options: Array.from({ length: optionCount }, (_, i) => `Option ${i}`),
        correctIndices,
    };
}

describe('evaluateSociologySelection', () => {
    describe('correct outcome', () => {
        it('should return "correct" when selected indices exactly match correct indices', () => {
            const q = makeQuestion([1, 3]);
            expect(evaluateSociologySelection(q, [1, 3])).toBe('correct');
        });

        it('should return "correct" regardless of selection order', () => {
            const q = makeQuestion([0, 2]);
            expect(evaluateSociologySelection(q, [2, 0])).toBe('correct');
        });

        it('should return "correct" for single correct answer', () => {
            const q = makeQuestion([2]);
            expect(evaluateSociologySelection(q, [2])).toBe('correct');
        });
    });

    describe('wrong outcome', () => {
        it('should return "wrong" when no selected index is correct', () => {
            const q = makeQuestion([0, 1]);
            expect(evaluateSociologySelection(q, [2, 3])).toBe('wrong');
        });

        it('should return "wrong" for empty selection when there are correct answers', () => {
            const q = makeQuestion([0]);
            expect(evaluateSociologySelection(q, [])).toBe('wrong');
        });

        it('should return "wrong" when single wrong answer is selected', () => {
            const q = makeQuestion([1]);
            expect(evaluateSociologySelection(q, [0])).toBe('wrong');
        });
    });

    describe('partial outcome', () => {
        it('should return "partial" when some but not all correct indices are selected', () => {
            const q = makeQuestion([0, 1, 2]);
            expect(evaluateSociologySelection(q, [0])).toBe('partial');
        });

        it('should return "partial" when correct indices plus extra wrong ones are selected', () => {
            const q = makeQuestion([1]);
            expect(evaluateSociologySelection(q, [1, 2])).toBe('partial');
        });

        it('should return "partial" when some correct and some wrong are selected', () => {
            const q = makeQuestion([0, 2]);
            expect(evaluateSociologySelection(q, [0, 3])).toBe('partial');
        });
    });
});
