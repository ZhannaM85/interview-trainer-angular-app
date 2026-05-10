import { TestBed } from '@angular/core/testing';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { SecurityContext } from '@angular/core';
import { SearchHighlightPipe } from './search-highlight.pipe';

describe('SearchHighlightPipe', () => {
    let pipe: SearchHighlightPipe;
    let sanitizer: DomSanitizer;

    function asString(value: SafeHtml | string): string {
        if (typeof value === 'string') return value;
        return sanitizer.sanitize(SecurityContext.HTML, value) ?? '';
    }

    beforeEach(() => {
        TestBed.configureTestingModule({});
        sanitizer = TestBed.inject(DomSanitizer);
        pipe = TestBed.runInInjectionContext(() => new SearchHighlightPipe());
    });

    it('returns the original text unchanged when query is empty', () => {
        expect(pipe.transform('Hello world', '')).toBe('Hello world');
    });

    it('returns the original text unchanged when text is empty', () => {
        expect(pipe.transform('', 'hello')).toBe('');
    });

    it('wraps the matched term in a <mark> tag', () => {
        const result = asString(pipe.transform('Hello world', 'world'));
        expect(result).toContain('<mark class="study__search-highlight">world</mark>');
    });

    it('is case-insensitive', () => {
        const result = asString(pipe.transform('Hello World', 'hello'));
        expect(result).toContain('<mark class="study__search-highlight">Hello</mark>');
    });

    it('highlights all occurrences', () => {
        const result = asString(pipe.transform('foo bar foo', 'foo'));
        const matches = result.match(/<mark/g) ?? [];
        expect(matches).toHaveLength(2);
    });

    it('HTML-escapes the base text before highlighting', () => {
        const result = asString(pipe.transform('<b>bold</b>', 'bold'));
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
        expect(result).not.toContain('<b>');
    });

    it('escapes regex special characters in query', () => {
        expect(() => pipe.transform('some text (here)', '(here)')).not.toThrow();
    });
});
