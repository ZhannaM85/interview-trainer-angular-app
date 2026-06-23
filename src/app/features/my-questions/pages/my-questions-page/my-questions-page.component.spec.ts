import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateService, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { MyQuestionsPageComponent } from './my-questions-page.component';
import { CustomQuestionService } from '../../../../core/services/custom-question.service';

const TRANSLATIONS: TranslationObject = {
    myQuestions: {
        title: 'My Questions',
        addNew: 'Add Question',
        editQuestion: 'Edit Question',
        questionLabel: 'Question',
        questionPlaceholder: '',
        answerLabel: 'Answer',
        answerPlaceholder: '',
        subtopicLabel: 'Topic',
        subtopicPlaceholder: '',
        difficultyLabel: 'Difficulty',
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        delete: 'Delete',
        empty: 'No custom questions yet.',
        validationRequired: 'Please fill in all required fields.',
        export: 'Export',
        import: 'Import',
        importSuccess: 'Imported {{added}} question(s), {{skipped}} skipped.',
        importError: 'Invalid file — could not read or parse the JSON.'
    },
    difficulty: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }
};

class StubLoader implements TranslateLoader {
    getTranslation(): Observable<TranslationObject> {
        return of(TRANSLATIONS);
    }
}

function setup(): { fixture: ComponentFixture<MyQuestionsPageComponent>; service: CustomQuestionService } {
    TestBed.configureTestingModule({
        imports: [MyQuestionsPageComponent],
        providers: [
            ...provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })
        ]
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', TRANSLATIONS);
    translate.use('en');
    const fixture = TestBed.createComponent(MyQuestionsPageComponent);
    fixture.detectChanges();
    return { fixture, service: TestBed.inject(CustomQuestionService) };
}

describe('MyQuestionsPageComponent — export button state', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('is disabled when there are no questions', () => {
        const { fixture } = setup();
        const exportBtn = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find((b) => b.textContent?.trim() === 'Export');
        expect(exportBtn?.disabled).toBe(true);
    });

    it('is enabled after a question is added', () => {
        const { fixture, service } = setup();
        service.add({ question: 'Q?', answer: 'A.', subtopic: 'X', difficulty: 'beginner' });
        fixture.detectChanges();
        const exportBtn = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find((b) => b.textContent?.trim() === 'Export');
        expect(exportBtn?.disabled).toBe(false);
    });
});

describe('MyQuestionsPageComponent — export download', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(() => {
        localStorage.clear();
        URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
        URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        TestBed.resetTestingModule();
    });

    it('triggers URL.createObjectURL with a Blob when exporting', () => {
        const { fixture, service } = setup();
        service.add({ question: 'Q?', answer: 'A.', subtopic: 'X', difficulty: 'beginner' });
        fixture.detectChanges();

        const exportBtn = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find((b) => b.textContent?.trim() === 'Export');
        exportBtn?.click();

        expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });
});

describe('MyQuestionsPageComponent — import toast', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    function simulateFileRead(fixture: ComponentFixture<MyQuestionsPageComponent>, content: string): Promise<void> {
        const component = fixture.componentInstance as unknown as { onFileChange: (e: Event) => void };
        const input = Object.defineProperty(document.createElement('input'), 'files', {
            value: [new File([content], 'import.json', { type: 'application/json' })],
            writable: false
        });

        return new Promise<void>((resolve) => {
            const original = FileReader.prototype.readAsText;
            FileReader.prototype.readAsText = function (this: FileReader) {
                Object.defineProperty(this, 'result', { value: content, writable: true, configurable: true });
                this.onload?.({} as ProgressEvent<FileReader>);
                FileReader.prototype.readAsText = original;
                resolve();
            };
            component.onFileChange({ target: input } as unknown as Event);
        });
    }

    it('shows success toast and adds questions after valid import', async () => {
        const { fixture } = setup();
        const validJson = JSON.stringify([
            { id: 9001, question: 'What is RxJS?', answer: 'Reactive Extensions.', subtopic: 'RxJS', difficulty: 'beginner', createdAt: '2026-01-01T00:00:00.000Z' }
        ]);

        await simulateFileRead(fixture, validJson);
        fixture.detectChanges();

        const toast = fixture.nativeElement.querySelector('.myq__toast') as HTMLElement | null;
        expect(toast).toBeTruthy();
        expect(toast?.classList.contains('myq__toast--error')).toBe(false);
        expect(fixture.nativeElement.querySelectorAll('.myq__card').length).toBe(1);
    });

    it('shows error toast when JSON is malformed', async () => {
        const { fixture } = setup();

        await simulateFileRead(fixture, 'not valid json!!!');
        fixture.detectChanges();

        const toast = fixture.nativeElement.querySelector('.myq__toast--error') as HTMLElement | null;
        expect(toast).toBeTruthy();
    });

    it('shows error toast when JSON is an object instead of an array', async () => {
        const { fixture } = setup();

        await simulateFileRead(fixture, '{"question":"oops"}');
        fixture.detectChanges();

        const toast = fixture.nativeElement.querySelector('.myq__toast--error') as HTMLElement | null;
        expect(toast).toBeTruthy();
    });

    it('reports correct added/skipped counts in success toast', async () => {
        const { fixture, service } = setup();
        const q = { id: 9002, question: 'Existing?', answer: 'Yes.', subtopic: 'Test', difficulty: 'beginner', createdAt: '2026-01-01T00:00:00.000Z' };
        service.importFrom([q]);

        const json = JSON.stringify([q, { ...q, id: 9003, question: 'New?' }]);
        await simulateFileRead(fixture, json);
        fixture.detectChanges();

        const toast = fixture.nativeElement.querySelector('.myq__toast') as HTMLElement | null;
        expect(toast?.textContent).toContain('1');
    });
});
