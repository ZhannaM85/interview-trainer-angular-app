import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
    TranslateLoader,
    provideTranslateService,
    type TranslationObject
} from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { ActivityService } from '../../../../core/services/activity.service';
import { ProgressService } from '../../../../core/services/progress.service';
import { QuestionService } from '../../../../core/services/question.service';
import { UserPreferencesService } from '../../../../core/services/user-preferences.service';
import type { Question } from '../../../../shared/models/question.model';
import { DashboardPageComponent, type DifficultyAccuracyEntry, type HardestQuestion } from './dashboard-page.component';

class StubLoader implements TranslateLoader {
    getTranslation(): Observable<TranslationObject> {
        return of({});
    }
}

type ComponentInternals = {
    hardestQuestionsView: () => HardestQuestion[];
    difficultyBreakdownView: () => DifficultyAccuracyEntry[];
    dailyGoalView: () => { answered: number; goal: number; pct: number; reached: boolean };
};

const testProviders = [
    provideHttpClient(),
    provideRouter([]),
    ...provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })
];

function makeQuestion(overrides: Partial<Question> = {}): Question {
    return {
        id: 1,
        question: 'What is a closure?',
        answer: 'A closure is…',
        weakAnswer: '',
        technicalAnswer: '',
        interviewAnswer: '',
        codeExample: '',
        readMoreLinks: [],
        subtopic: 'closures',
        category: 'javascript',
        difficulty: 'intermediate',
        ...overrides
    };
}

function setup(questions: Question[] = []) {
    TestBed.configureTestingModule({
        imports: [DashboardPageComponent],
        providers: testProviders
    });
    vi.spyOn(TestBed.inject(QuestionService), 'getQuestions').mockReturnValue(of(questions));
    const fixture = TestBed.createComponent(DashboardPageComponent);
    const component = fixture.componentInstance as unknown as ComponentInternals;
    const progressService = TestBed.inject(ProgressService);
    fixture.detectChanges();
    return { fixture, component, progressService };
}

describe('DashboardPageComponent — hardestQuestionsView', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('returns empty list when no questions are loaded', () => {
        const { component } = setup([]);
        expect(component.hardestQuestionsView()).toEqual([]);
    });

    it('excludes questions with fewer than 3 attempts', () => {
        const { component, progressService } = setup([makeQuestion({ id: 10 })]);
        progressService.recordSelfRating(10, 'didntKnow');
        progressService.recordSelfRating(10, 'didntKnow');
        expect(component.hardestQuestionsView()).toEqual([]);
    });

    it('includes questions with 3+ attempts', () => {
        const q = makeQuestion({ id: 20, question: 'Hard question' });
        const { component, progressService } = setup([q]);
        progressService.recordSelfRating(20, 'didntKnow');
        progressService.recordSelfRating(20, 'didntKnow');
        progressService.recordSelfRating(20, 'partial');

        const results = component.hardestQuestionsView();
        expect(results.length).toBe(1);
        expect(results[0].questionId).toBe(20);
        expect(results[0].question).toBe('Hard question');
    });

    it('computes nailedPct correctly (0 nailed out of 3)', () => {
        const { component, progressService } = setup([makeQuestion({ id: 30 })]);
        progressService.recordSelfRating(30, 'didntKnow');
        progressService.recordSelfRating(30, 'didntKnow');
        progressService.recordSelfRating(30, 'didntKnow');

        const results = component.hardestQuestionsView();
        expect(results[0].nailedPct).toBe(0);
        expect(results[0].total).toBe(3);
    });

    it('computes nailedPct correctly (all nailed)', () => {
        const { component, progressService } = setup([makeQuestion({ id: 40 })]);
        progressService.recordSelfRating(40, 'nailed');
        progressService.recordSelfRating(40, 'nailed');
        progressService.recordSelfRating(40, 'nailed');

        const results = component.hardestQuestionsView();
        expect(results[0].nailedPct).toBe(100);
    });

    it('sorts by nailedPct ascending (lowest first)', () => {
        const q1 = makeQuestion({ id: 50, question: 'Easy' });
        const q2 = makeQuestion({ id: 51, question: 'Hard' });
        const { component, progressService } = setup([q1, q2]);

        // q1: 3 nailed / 3 total → 100%
        progressService.recordSelfRating(50, 'nailed');
        progressService.recordSelfRating(50, 'nailed');
        progressService.recordSelfRating(50, 'nailed');
        // q2: 0 nailed / 3 total → 0%
        progressService.recordSelfRating(51, 'didntKnow');
        progressService.recordSelfRating(51, 'didntKnow');
        progressService.recordSelfRating(51, 'didntKnow');

        const results = component.hardestQuestionsView();
        expect(results[0].questionId).toBe(51);
        expect(results[1].questionId).toBe(50);
    });

    it('caps the list at 8 questions', () => {
        const questions = Array.from({ length: 12 }, (_, i) =>
            makeQuestion({ id: 100 + i, question: `Q${i}` })
        );
        const { component, progressService } = setup(questions);
        for (const q of questions) {
            for (let i = 0; i < 3; i++) {
                progressService.recordSelfRating(q.id, 'didntKnow');
            }
        }

        expect(component.hardestQuestionsView().length).toBe(8);
    });
});

describe('DashboardPageComponent — difficultyBreakdownView', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('returns empty list when no questions are loaded', () => {
        const { component } = setup([]);
        expect(component.difficultyBreakdownView()).toEqual([]);
    });

    it('returns empty list when no progress exists', () => {
        const { component } = setup([makeQuestion({ id: 1, difficulty: 'beginner' })]);
        expect(component.difficultyBreakdownView()).toEqual([]);
    });

    it('only includes difficulty levels that have at least one answered question', () => {
        const q1 = makeQuestion({ id: 1, difficulty: 'beginner' });
        const q2 = makeQuestion({ id: 2, difficulty: 'advanced' });
        const { component, progressService } = setup([q1, q2]);
        progressService.recordSelfRating(1, 'nailed');

        const result = component.difficultyBreakdownView();
        expect(result.length).toBe(1);
        expect(result[0].difficulty).toBe('beginner');
    });

    it('orders levels beginner → intermediate → advanced', () => {
        const q1 = makeQuestion({ id: 1, difficulty: 'advanced' });
        const q2 = makeQuestion({ id: 2, difficulty: 'beginner' });
        const q3 = makeQuestion({ id: 3, difficulty: 'intermediate' });
        const { component, progressService } = setup([q1, q2, q3]);
        progressService.recordSelfRating(1, 'nailed');
        progressService.recordSelfRating(2, 'nailed');
        progressService.recordSelfRating(3, 'nailed');

        const result = component.difficultyBreakdownView();
        expect(result.map((e) => e.difficulty)).toEqual(['beginner', 'intermediate', 'advanced']);
    });

    it('computes accuracyPct correctly (all nailed)', () => {
        const q = makeQuestion({ id: 10, difficulty: 'intermediate' });
        const { component, progressService } = setup([q]);
        progressService.recordSelfRating(10, 'nailed');
        progressService.recordSelfRating(10, 'nailed');

        const result = component.difficultyBreakdownView();
        expect(result[0].accuracyPct).toBe(100);
        expect(result[0].total).toBe(2);
    });

    it('computes accuracyPct correctly (mixed ratings)', () => {
        const q = makeQuestion({ id: 20, difficulty: 'advanced' });
        const { component, progressService } = setup([q]);
        progressService.recordSelfRating(20, 'nailed');
        progressService.recordSelfRating(20, 'didntKnow');
        progressService.recordSelfRating(20, 'didntKnow');
        progressService.recordSelfRating(20, 'didntKnow');

        const result = component.difficultyBreakdownView();
        expect(result[0].accuracyPct).toBe(25);
        expect(result[0].total).toBe(4);
    });

    it('aggregates multiple questions of the same difficulty', () => {
        const q1 = makeQuestion({ id: 30, difficulty: 'beginner' });
        const q2 = makeQuestion({ id: 31, difficulty: 'beginner' });
        const { component, progressService } = setup([q1, q2]);
        progressService.recordSelfRating(30, 'nailed');
        progressService.recordSelfRating(30, 'nailed');
        progressService.recordSelfRating(31, 'didntKnow');
        progressService.recordSelfRating(31, 'didntKnow');

        const result = component.difficultyBreakdownView();
        expect(result.length).toBe(1);
        expect(result[0].difficulty).toBe('beginner');
        expect(result[0].total).toBe(4);
        expect(result[0].nailed).toBe(2);
        expect(result[0].accuracyPct).toBe(50);
    });
});

describe('DashboardPageComponent — dailyGoalView', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('shows default goal of 10 and 0 answered when no activity', () => {
        const { component } = setup([]);
        const view = component.dailyGoalView();
        expect(view.goal).toBe(10);
        expect(view.answered).toBe(0);
        expect(view.reached).toBe(false);
    });

    it('reflects today\'s answered questions in the view', () => {
        const { component } = setup([]);
        const activityService = TestBed.inject(ActivityService);
        activityService.bumpQuestionsAnswered(3);
        const view = component.dailyGoalView();
        expect(view.answered).toBe(3);
    });

    it('reached is true when answered >= goal', () => {
        const { component } = setup([]);
        const activityService = TestBed.inject(ActivityService);
        const prefsService = TestBed.inject(UserPreferencesService);
        prefsService.setDailyGoal(5);
        activityService.bumpQuestionsAnswered(5);
        const view = component.dailyGoalView();
        expect(view.reached).toBe(true);
    });

    it('reached is false when answered < goal', () => {
        const { component } = setup([]);
        const activityService = TestBed.inject(ActivityService);
        const prefsService = TestBed.inject(UserPreferencesService);
        prefsService.setDailyGoal(10);
        activityService.bumpQuestionsAnswered(7);
        const view = component.dailyGoalView();
        expect(view.reached).toBe(false);
    });

    it('pct is capped at 100 even when answered exceeds goal', () => {
        const { component } = setup([]);
        const activityService = TestBed.inject(ActivityService);
        const prefsService = TestBed.inject(UserPreferencesService);
        prefsService.setDailyGoal(5);
        activityService.bumpQuestionsAnswered(10);
        const view = component.dailyGoalView();
        expect(view.pct).toBe(100);
    });

    it('updates goal reactively when UserPreferencesService changes', () => {
        const { component } = setup([]);
        const prefsService = TestBed.inject(UserPreferencesService);
        prefsService.setDailyGoal(20);
        expect(component.dailyGoalView().goal).toBe(20);
    });
});
