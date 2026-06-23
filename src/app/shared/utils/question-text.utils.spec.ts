import { splitQuestionPromptAndCode } from './question-text.utils';

describe('splitQuestionPromptAndCode', () => {
    it('should return lead and null code when no double newline separator exists', () => {
        const result = splitQuestionPromptAndCode('What is a closure?');
        expect(result).toEqual({ lead: 'What is a closure?', code: null });
    });

    it('should split text at the first double newline', () => {
        const text = 'What does this output?\n\nconst x = 1;\nconsole.log(x);';
        const result = splitQuestionPromptAndCode(text);
        expect(result.lead).toBe('What does this output?');
        expect(result.code).toBe('const x = 1;\nconsole.log(x);');
    });

    it('should trim whitespace from lead and code', () => {
        const text = '  What is this?  \n\n  const a = 1;  ';
        const result = splitQuestionPromptAndCode(text);
        expect(result.lead).toBe('What is this?');
        expect(result.code).toBe('const a = 1;');
    });

    it('should return null code when text after separator is empty or whitespace only', () => {
        const text = 'Some question\n\n   ';
        const result = splitQuestionPromptAndCode(text);
        expect(result).toEqual({ lead: 'Some question\n\n   ', code: null });
    });

    it('should return original text as lead when lead part trims to empty', () => {
        const text = '  \n\nconst x = 1;';
        const result = splitQuestionPromptAndCode(text);
        // lead trims to empty, so fallback to full text
        expect(result.lead).toBe(text);
        expect(result.code).toBe('const x = 1;');
    });

    it('should handle text with multiple double newlines by splitting at the first', () => {
        const text = 'Line one\n\nLine two\n\nLine three';
        const result = splitQuestionPromptAndCode(text);
        expect(result.lead).toBe('Line one');
        expect(result.code).toBe('Line two\n\nLine three');
    });

    it('should handle single newline as no separator', () => {
        const text = 'Line one\nLine two';
        const result = splitQuestionPromptAndCode(text);
        expect(result).toEqual({ lead: 'Line one\nLine two', code: null });
    });

    it('should handle empty string', () => {
        const result = splitQuestionPromptAndCode('');
        expect(result).toEqual({ lead: '', code: null });
    });
});
