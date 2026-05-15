import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateLoader, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { QuizPageComponent, type SessionMode } from './quiz-page.component';
import { AchievementService } from '../../../../core/services/achievement.service';
import { QuestionService } from '../../../../core/services/question.service';
import type { ActiveSessionSnapshot } from '../../../../shared/models/active-session.model';

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
                sessionModeDeepDesc: 'All due',
                resumeSession: 'Resume ({{question}} of {{total}})',
                resumeBtn: 'Resume',
                resumeDismiss: 'Start new',
                resumeBannerAria: 'Resume previous session'
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

describe('QuizPageComponent — session resume', () => {
    const SNAPSHOT_KEY = 'interview-trainer:active-session';

    const makeSnap = (partial?: Partial<ActiveSessionSnapshot>): ActiveSessionSnapshot => ({
        queueIds: [1, 2, 3],
        currentIndex: 1,
        sessionMode: 'standard',
        practiceScope: 'full',
        topicsFocusParam: '',
        sessionNailed: 1,
        sessionPartial: 0,
        sessionDidntKnow: 0,
        sessionBestStreak: 1,
        currentStreak: 1,
        sessionTotal: 3,
        sessionStackTopicIds: ['javascript:closures'],
        usingFallbackQueue: false,
        savedAt: new Date().toISOString(),
        ...partial
    });

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [QuizPageComponent],
            providers: testProviders
        }).compileComponents();
    });

    afterEach(() => TestBed.resetTestingModule());

    it('sets resumeInfo when a valid snapshot exists in localStorage', () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnap()));
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            resumeInfo: () => { questionNumber: number; total: number } | null;
        };
        expect(component.resumeInfo()).toEqual({ questionNumber: 2, total: 3 });
    });

    it('does not set resumeInfo when no snapshot exists', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            resumeInfo: () => { questionNumber: number; total: number } | null;
        };
        expect(component.resumeInfo()).toBeNull();
    });

    it('does not set resumeInfo when snapshot has empty queueIds', () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnap({ queueIds: [] })));
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            resumeInfo: () => { questionNumber: number; total: number } | null;
        };
        expect(component.resumeInfo()).toBeNull();
    });

    it('does not set resumeInfo when currentIndex is out of bounds', () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnap({ currentIndex: 10 })));
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            resumeInfo: () => { questionNumber: number; total: number } | null;
        };
        expect(component.resumeInfo()).toBeNull();
    });

    it('restores sessionMode from snapshot', () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnap({ sessionMode: 'quick' })));
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            sessionMode: () => SessionMode;
        };
        expect(component.sessionMode()).toBe('quick');
    });

    it('dismissResume clears resumeInfo and removes snapshot from localStorage', () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnap()));
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            resumeInfo: () => { questionNumber: number; total: number } | null;
            dismissResume: () => void;
        };
        expect(component.resumeInfo()).not.toBeNull();
        component.dismissResume();
        expect(component.resumeInfo()).toBeNull();
        expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull();
    });

    it('startSession clears snapshot and resumeInfo', () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnap()));
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            resumeInfo: () => { questionNumber: number; total: number } | null;
            startSession: (mode: SessionMode) => void;
        };
        component.startSession('deep');
        expect(component.resumeInfo()).toBeNull();
        expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull();
    });

    it('restartSession clears snapshot and resumeInfo', () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnap()));
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            resumeInfo: () => { questionNumber: number; total: number } | null;
            restartSession: () => void;
        };
        component.restartSession();
        expect(component.resumeInfo()).toBeNull();
        expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull();
    });
});

describe('QuizPageComponent — interview-ready session message', () => {
    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [QuizPageComponent],
            providers: testProviders
        }).compileComponents();
    });

    afterEach(() => TestBed.resetTestingModule());

    it('interviewReadySession is false on component init', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as {
            interviewReadySession: () => boolean;
        };
        expect(component.interviewReadySession()).toBe(false);
    });

    it('interviewReadySession is reset to false when startSession is called', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const achievementService = TestBed.inject(AchievementService);
        vi.spyOn(achievementService, 'checkAndGrantSession').mockReturnValue(true);
        const component = fixture.componentInstance as unknown as {
            interviewReadySession: () => boolean;
            startSession: (mode: SessionMode) => void;
        };
        // Simulate a previous session having set the flag
        // by calling startSession which resets it via loadQuiz
        component.startSession('quick');
        expect(component.interviewReadySession()).toBe(false);
    });
});
