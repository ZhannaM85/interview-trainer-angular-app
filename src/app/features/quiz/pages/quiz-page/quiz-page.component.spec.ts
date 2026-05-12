import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateLoader, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { QuizPageComponent, type SessionMode } from './quiz-page.component';
import { QuestionService } from '../../../../core/services/question.service';

class StubLoader implements TranslateLoader {
    getTranslation(): Observable<TranslationObject> {
        return of({
            quiz: {
                titleHidden: 'Quiz',
                loading: 'Loading…',
                shuffleOn: 'Shuffle: On',
                shuffleOff: 'Shuffle: Off',
                sessionPickerTitle: 'Choose session length',
                sessionPickerOptionsAria: 'Session length options',
                sessionModeQuick: 'Quick',
                sessionModeQuickDesc: '5 questions',
                sessionModeStandard: 'Standard',
                sessionModeStandardDesc: '15 questions',
                sessionModeDeep: 'Deep',
                sessionModeDeepDesc: 'All due'
            }
        });
    }
}

const testProviders = [
    provideHttpClient(),
    provideRouter([]),
    ...provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })
];

describe('QuizPageComponent — shuffle toggle', () => {
    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [QuizPageComponent],
            providers: testProviders
        }).compileComponents();
    });

    afterEach(() => TestBed.resetTestingModule());

    it('exposes shuffleEnabled from QuestionService', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as { shuffleEnabled: () => boolean };
        const questionService = TestBed.inject(QuestionService);
        expect(component.shuffleEnabled()).toBe(questionService.shuffleEnabled());
    });

    it('toggleShuffle delegates to QuestionService', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as { toggleShuffle: () => void };
        const questionService = TestBed.inject(QuestionService);
        const before = questionService.shuffleEnabled();
        component.toggleShuffle();
        expect(questionService.shuffleEnabled()).toBe(!before);
    });
});

describe('QuizPageComponent — session mode picker', () => {
    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [QuizPageComponent],
            providers: testProviders
        }).compileComponents();
    });

    afterEach(() => TestBed.resetTestingModule());

    it('shows session mode picker on load', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as { showSessionModePicker: () => boolean };
        expect(component.showSessionModePicker()).toBe(true);
    });

    it('defaults to standard session mode when no saved preference', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as { sessionMode: () => SessionMode };
        expect(component.sessionMode()).toBe('standard');
    });

    it('restores session mode from localStorage', () => {
        localStorage.setItem('interview-trainer:quiz-session-mode', '"quick"');
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as { sessionMode: () => SessionMode };
        expect(component.sessionMode()).toBe('quick');
    });

    it('startSession persists mode to localStorage and hides picker', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            startSession: (mode: SessionMode) => void;
            showSessionModePicker: () => boolean;
            sessionMode: () => SessionMode;
        };
        component.startSession('quick');
        expect(component.sessionMode()).toBe('quick');
        expect(component.showSessionModePicker()).toBe(false);
        expect(localStorage.getItem('interview-trainer:quiz-session-mode')).toBe('"quick"');
    });

    it('restartSession shows picker again', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            startSession: (mode: SessionMode) => void;
            restartSession: () => void;
            showSessionModePicker: () => boolean;
        };
        component.startSession('standard');
        expect(component.showSessionModePicker()).toBe(false);
        component.restartSession();
        expect(component.showSessionModePicker()).toBe(true);
    });
});
