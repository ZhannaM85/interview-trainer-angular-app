import { SplitQuestionCodePipe, type QuestionPromptCodeParts } from './split-question-code.pipe';

describe('SplitQuestionCodePipe', () => {
    let pipe: SplitQuestionCodePipe;

    beforeEach(() => {
        pipe = new SplitQuestionCodePipe();
    });

    it('should create', () => {
        expect(pipe).toBeTruthy();
    });

    it('returns entire text as lead when there is no double newline', () => {
        const result: QuestionPromptCodeParts = pipe.transform('What is a closure?');
        expect(result.lead).toBe('What is a closure?');
        expect(result.code).toBeNull();
    });

    it('splits text at double newline into lead and code', () => {
        const result = pipe.transform('What does this do?\n\nconst x = 1;');
        expect(result.lead).toBe('What does this do?');
        expect(result.code).toBe('const x = 1;');
    });

    it('trims whitespace from lead and code', () => {
        const result = pipe.transform('  Question text  \n\n  code block  ');
        expect(result.lead).toBe('Question text');
        expect(result.code).toBe('code block');
    });

    it('returns null code when text after separator is empty', () => {
        const result = pipe.transform('Question text\n\n');
        expect(result.lead).toBe('Question text\n\n');
        expect(result.code).toBeNull();
    });

    it('returns null code when text after separator is only whitespace', () => {
        const result = pipe.transform('Question text\n\n   ');
        expect(result.lead).toBe('Question text\n\n   ');
        expect(result.code).toBeNull();
    });

    it('handles multiple double newlines by splitting at the first one', () => {
        const result = pipe.transform('Question\n\ncode line 1\n\ncode line 2');
        expect(result.lead).toBe('Question');
        expect(result.code).toBe('code line 1\n\ncode line 2');
    });

    it('handles empty string', () => {
        const result = pipe.transform('');
        expect(result.lead).toBe('');
        expect(result.code).toBeNull();
    });

    it('handles single newline (no separation)', () => {
        const result = pipe.transform('Line 1\nLine 2');
        expect(result.lead).toBe('Line 1\nLine 2');
        expect(result.code).toBeNull();
    });
});
