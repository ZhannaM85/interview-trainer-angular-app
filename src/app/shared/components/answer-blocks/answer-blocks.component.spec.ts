import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    TranslateLoader,
    TranslateService,
    provideTranslateService,
    type TranslationObject
} from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { AnswerBlocksComponent } from './answer-blocks.component';
import type { Question } from '../../models/question.model';

class StubLoader implements TranslateLoader {
    getTranslation(_lang: string): Observable<TranslationObject> {
        return of({
            answerBlocks: {
                weak: 'Weak answer',
                technical: 'Technical answer',
                interview: 'Interview answer',
                codeExample: 'Code example',
                showCode: 'Show code example',
                hideCode: 'Hide code example',
                readMore: 'Read more'
            }
        } satisfies TranslationObject);
    }
}

const BASE_QUESTION: Question = {
    id: 1,
    question: 'What is a signal?',
    answer: 'A reactive primitive',
    weakAnswer: 'Not sure',
    technicalAnswer: 'A push-based primitive',
    interviewAnswer: 'Signals track reactive state',
    codeExample: '',
    readMoreLinks: [],
    subtopic: 'signals',
    category: 'angular',
    difficulty: 'intermediate'
};

function makeQuestion(overrides: Partial<Question> = {}): Question {
    return { ...BASE_QUESTION, ...overrides };
}

describe('AnswerBlocksComponent', () => {
    let fixture: ComponentFixture<AnswerBlocksComponent>;
    let component: AnswerBlocksComponent;

    function setup(question: Question, collapsibleCode = false): void {
        TestBed.configureTestingModule({
            imports: [AnswerBlocksComponent],
            providers: [provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })]
        });
        TestBed.inject(TranslateService).use('en');
        fixture = TestBed.createComponent(AnswerBlocksComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('question', question);
        fixture.componentRef.setInput('collapsibleCode', collapsibleCode);
        fixture.detectChanges();
    }

    describe('non-collapsible mode (default)', () => {
        it('shows code block directly when codeExample is non-empty', () => {
            setup(makeQuestion({ codeExample: 'const x = 1;' }));
            const pre = fixture.nativeElement.querySelector('.interview-answer__code');
            expect(pre).toBeTruthy();
            expect(pre.textContent).toContain('const x = 1;');
        });

        it('does not render code block when codeExample is empty', () => {
            setup(makeQuestion({ codeExample: '' }));
            const wrap = fixture.nativeElement.querySelector('.interview-answer__code-wrap');
            expect(wrap).toBeNull();
        });

        it('does not render the toggle button', () => {
            setup(makeQuestion({ codeExample: 'const x = 1;' }));
            const btn = fixture.nativeElement.querySelector('.interview-answer__code-toggle');
            expect(btn).toBeNull();
        });
    });

    describe('collapsible mode', () => {
        it('shows toggle button and hides code block initially', () => {
            setup(makeQuestion({ codeExample: 'const x = 1;' }), true);
            const btn = fixture.nativeElement.querySelector('.interview-answer__code-toggle');
            expect(btn).toBeTruthy();
            expect(btn.getAttribute('aria-expanded')).toBe('false');
            const pre = fixture.nativeElement.querySelector('.interview-answer__code');
            expect(pre).toBeNull();
        });

        it('toggle button label says "Show code example" when collapsed', () => {
            setup(makeQuestion({ codeExample: 'const x = 1;' }), true);
            const btn = fixture.nativeElement.querySelector('.interview-answer__code-toggle');
            expect(btn.textContent).toContain('Show code example');
        });

        it('clicking toggle expands the code block', () => {
            setup(makeQuestion({ codeExample: 'const x = 1;' }), true);
            const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.interview-answer__code-toggle');
            btn.click();
            fixture.detectChanges();
            expect(btn.getAttribute('aria-expanded')).toBe('true');
            const pre = fixture.nativeElement.querySelector('.interview-answer__code');
            expect(pre).toBeTruthy();
            expect(pre.textContent).toContain('const x = 1;');
        });

        it('toggle button label says "Hide code example" when expanded', () => {
            setup(makeQuestion({ codeExample: 'const x = 1;' }), true);
            const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.interview-answer__code-toggle');
            btn.click();
            fixture.detectChanges();
            expect(btn.textContent).toContain('Hide code example');
        });

        it('clicking toggle twice collapses the code block again', () => {
            setup(makeQuestion({ codeExample: 'const x = 1;' }), true);
            const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.interview-answer__code-toggle');
            btn.click();
            fixture.detectChanges();
            btn.click();
            fixture.detectChanges();
            expect(btn.getAttribute('aria-expanded')).toBe('false');
            expect(fixture.nativeElement.querySelector('.interview-answer__code')).toBeNull();
        });

        it('does not render toggle when codeExample is empty', () => {
            setup(makeQuestion({ codeExample: '' }), true);
            const wrap = fixture.nativeElement.querySelector('.interview-answer__code-wrap');
            expect(wrap).toBeNull();
        });
    });

    describe('answer blocks rendering', () => {
        it('renders three answer blocks for non-custom questions', () => {
            setup(makeQuestion());
            const blocks = fixture.nativeElement.querySelectorAll('.interview-answer__block');
            expect(blocks.length).toBe(3);
        });

        it('renders one answer block for custom questions', () => {
            setup(makeQuestion({ category: 'custom' }));
            const blocks = fixture.nativeElement.querySelectorAll('.interview-answer__block');
            expect(blocks.length).toBe(1);
        });
    });
});
