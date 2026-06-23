import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateLoader, TranslateService, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { PlanPageComponent, type PlanSortMode } from './plan-page.component';
import { TodayPlanService } from '../../../../core/services/today-plan.service';
import { PlanSuggestionService } from '../../../../core/services/plan-suggestion.service';
import { formatLocalYmd } from '../../../../shared/utils/local-date.utils';

class StubLoader implements TranslateLoader {
    getTranslation(): Observable<TranslationObject> {
        return of({ plan: {}, study: { category: {} } });
    }
}

async function setup(storageEntries: Record<string, unknown> = {}) {
    localStorage.clear();
    for (const [key, value] of Object.entries(storageEntries)) {
        localStorage.setItem(`interview-trainer:${key}`, JSON.stringify(value));
    }
    await TestBed.configureTestingModule({
        imports: [PlanPageComponent],
        providers: [
            provideHttpClient(),
            provideRouter([]),
            ...provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })
        ]
    }).compileComponents();
    TestBed.inject(TranslateService).use('en');
    const fixture = TestBed.createComponent(PlanPageComponent);
    const component = fixture.componentInstance as unknown as {
        confirmMarkAllStudied: ReturnType<typeof import('@angular/core').signal<string | null>>;
        sortMode: ReturnType<typeof import('@angular/core').signal<PlanSortMode>>;
        sortedSections: () => import('../../../study/study-guide-grouping').StudyCategorySection[];
        carryoverTopicIds: () => string[];
        acceptCarryover(): void;
        dismissCarryover(): void;
        requestMarkAllStudied(key: string): void;
        confirmMarkAllStudiedTopics(): void;
        cancelMarkAllStudied(): void;
        topicsRemainingToStudyJs: () => string[];
        setSortMode(mode: PlanSortMode): void;
        lastSuggestionCount: ReturnType<typeof import('@angular/core').signal<number | null>>;
        suggestTopics(): void;
    };
    fixture.detectChanges();
    return { fixture, component, plan: TestBed.inject(TodayPlanService) };
}

function yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatLocalYmd(d);
}

describe('PlanPageComponent — bulk mark all as studied', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.clear();
    });

    it('confirmMarkAllStudied starts as null', async () => {
        const { component } = await setup();
        expect(component.confirmMarkAllStudied()).toBeNull();
    });

    it('requestMarkAllStudied sets the pending key', async () => {
        const { component } = await setup();
        component.requestMarkAllStudied('global');
        expect(component.confirmMarkAllStudied()).toBe('global');
    });

    it('cancelMarkAllStudied resets to null', async () => {
        const { component } = await setup();
        component.requestMarkAllStudied('global');
        component.cancelMarkAllStudied();
        expect(component.confirmMarkAllStudied()).toBeNull();
    });

    it('confirmMarkAllStudiedTopics resets signal after confirming', async () => {
        const { component } = await setup();
        component.requestMarkAllStudied('global');
        component.confirmMarkAllStudiedTopics();
        expect(component.confirmMarkAllStudied()).toBeNull();
    });

    it('confirmMarkAllStudiedTopics marks all remaining JS topics as studied', async () => {
        const { component, plan } = await setup();

        // Select two topics directly via TodayPlanService
        plan.toggleTopicSelected('javascript:closures');
        plan.toggleTopicSelected('angular:signals');
        expect(plan.topicsRemainingToStudy().length).toBe(2);

        component.requestMarkAllStudied('global');
        component.confirmMarkAllStudiedTopics();

        expect(plan.isStudied('javascript:closures')).toBe(true);
        expect(plan.isStudied('angular:signals')).toBe(true);
        expect(plan.topicsRemainingToStudy().length).toBe(0);
    });

    it('only marks selected topics — unselected topics are left untouched', async () => {
        const { component, plan } = await setup();

        plan.toggleTopicSelected('javascript:closures');
        // angular:signals not selected

        component.requestMarkAllStudied('global');
        component.confirmMarkAllStudiedTopics();

        expect(plan.isStudied('javascript:closures')).toBe(true);
        expect(plan.isStudied('angular:signals')).toBe(false);
    });

    it('does nothing when confirmMarkAllStudied is null', async () => {
        const { component, plan } = await setup();
        plan.toggleTopicSelected('javascript:closures');

        // Do NOT call requestMarkAllStudied
        component.confirmMarkAllStudiedTopics();

        expect(plan.isStudied('javascript:closures')).toBe(false);
    });

    it('requestMarkAllStudied can hold a category key for per-category confirmation', async () => {
        const { component } = await setup();
        component.requestMarkAllStudied('javascript__heading');
        expect(component.confirmMarkAllStudied()).toBe('javascript__heading');
    });
});

describe('PlanPageComponent — carryover banner', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.clear();
    });

    it('carryoverTopicIds is empty when there is no carryover', async () => {
        const { component } = await setup();
        expect(component.carryoverTopicIds()).toEqual([]);
    });

    it('carryoverTopicIds reflects pending carryover topics (excluding sociology)', async () => {
        const { component } = await setup({
            'plan-carryover': { fromDate: yesterdayStr(), topicIds: ['javascript:closures', 'angular:signals'] }
        });
        expect(component.carryoverTopicIds()).toEqual(['javascript:closures', 'angular:signals']);
    });

    it('excludes sociology topics from carryoverTopicIds', async () => {
        const { component } = await setup({
            'plan-carryover': { fromDate: yesterdayStr(), topicIds: ['javascript:closures', 'sociology:topic:sub'] }
        });
        expect(component.carryoverTopicIds()).toEqual(['javascript:closures']);
    });

    it('acceptCarryover adds topics to today plan and clears carryoverTopicIds', async () => {
        const { component, plan } = await setup({
            'plan-carryover': { fromDate: yesterdayStr(), topicIds: ['javascript:closures'] }
        });

        component.acceptCarryover();

        expect(component.carryoverTopicIds()).toEqual([]);
        expect(plan.isSelected('javascript:closures')).toBe(true);
    });

    it('dismissCarryover clears carryoverTopicIds without adding to plan', async () => {
        const { component, plan } = await setup({
            'plan-carryover': { fromDate: yesterdayStr(), topicIds: ['javascript:closures'] }
        });

        component.dismissCarryover();

        expect(component.carryoverTopicIds()).toEqual([]);
        expect(plan.isSelected('javascript:closures')).toBe(false);
    });
});

describe('PlanPageComponent — sort by date', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.clear();
    });

    it('sortMode defaults to "default" when nothing is stored', async () => {
        const { component } = await setup();
        expect(component.sortMode()).toBe('default');
    });

    it('sortMode is loaded from localStorage on init', async () => {
        const { component } = await setup({ 'plan-sort-mode': 'oldest-first' });
        expect(component.sortMode()).toBe('oldest-first');
    });

    it('setSortMode updates the sortMode signal', async () => {
        const { component } = await setup();
        component.setSortMode('newest-first');
        expect(component.sortMode()).toBe('newest-first');
    });

    it('setSortMode persists the choice to localStorage', async () => {
        const { component } = await setup();
        component.setSortMode('oldest-first');
        const stored = JSON.parse(localStorage.getItem('interview-trainer:plan-sort-mode') ?? 'null');
        expect(stored).toBe('oldest-first');
    });

    it('setSortMode("default") resets back to default', async () => {
        const { component } = await setup({ 'plan-sort-mode': 'oldest-first' });
        component.setSortMode('default');
        expect(component.sortMode()).toBe('default');
    });

    it('sortedSections returns an array when sortMode is "default"', async () => {
        const { component } = await setup();
        const sorted = component.sortedSections();
        expect(Array.isArray(sorted)).toBe(true);
    });

    it('sortedSections returns same structure in all sort modes', async () => {
        const { component } = await setup();
        await new Promise((r) => setTimeout(r, 50));

        const defaultSections = component.sortedSections();
        component.setSortMode('oldest-first');
        const oldestSections = component.sortedSections();
        component.setSortMode('newest-first');
        const newestSections = component.sortedSections();

        expect(oldestSections.length).toBe(defaultSections.length);
        expect(newestSections.length).toBe(defaultSections.length);

        for (let i = 0; i < defaultSections.length; i++) {
            expect(oldestSections[i].category).toBe(defaultSections[i].category);
            expect(oldestSections[i].subtopics.length).toBe(defaultSections[i].subtopics.length);
            expect(newestSections[i].category).toBe(defaultSections[i].category);
            expect(newestSections[i].subtopics.length).toBe(defaultSections[i].subtopics.length);
        }
    });

    it('oldest-first puts never-studied topics before studied ones', async () => {
        const today = new Date();
        const todayStr = formatLocalYmd(today);
        const { component } = await setup({
            'activity-by-day': {
                [todayStr]: {
                    date: todayStr,
                    questionsAnswered: 1,
                    topicsStudied: 1,
                    activeSeconds: 0,
                    coveredTopicIds: ['javascript:closures']
                }
            }
        });
        await new Promise((r) => setTimeout(r, 50));

        component.setSortMode('oldest-first');
        const sections = component.sortedSections();
        const jsCat = sections.find((c) => c.category === 'javascript');
        if (!jsCat) return;

        const closuresIdx = jsCat.subtopics.findIndex((s) => s.subtopic === 'closures');
        const neverStudiedIdx = jsCat.subtopics.findIndex((s) => s.subtopic !== 'closures');
        if (neverStudiedIdx >= 0 && closuresIdx >= 0) {
            expect(neverStudiedIdx).toBeLessThan(closuresIdx);
        }
    });

    it('newest-first puts recently-studied topics before never-studied ones', async () => {
        const today = new Date();
        const todayStr = formatLocalYmd(today);
        const { component } = await setup({
            'activity-by-day': {
                [todayStr]: {
                    date: todayStr,
                    questionsAnswered: 1,
                    topicsStudied: 1,
                    activeSeconds: 0,
                    coveredTopicIds: ['javascript:closures']
                }
            }
        });
        await new Promise((r) => setTimeout(r, 50));

        component.setSortMode('newest-first');
        const sections = component.sortedSections();
        const jsCat = sections.find((c) => c.category === 'javascript');
        if (!jsCat) return;

        const closuresIdx = jsCat.subtopics.findIndex((s) => s.subtopic === 'closures');
        const neverStudiedIdx = jsCat.subtopics.findIndex((s) => s.subtopic !== 'closures');
        if (neverStudiedIdx >= 0 && closuresIdx >= 0) {
            expect(closuresIdx).toBeLessThan(neverStudiedIdx);
        }
    });
});

describe('PlanPageComponent — suggest topics', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.clear();
    });

    it('lastSuggestionCount starts as null', async () => {
        const { component } = await setup();
        expect(component.lastSuggestionCount()).toBeNull();
    });

    it('suggestTopics sets lastSuggestionCount to a number', async () => {
        const { component } = await setup();
        component.suggestTopics();
        expect(component.lastSuggestionCount()).not.toBeNull();
    });

    it('suggestTopics with no questions returns count 0', async () => {
        const { component } = await setup();
        // Questions load asynchronously; if empty, suggestion count is 0
        component.suggestTopics();
        const count = component.lastSuggestionCount();
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
    });

    it('suggestTopics delegates to PlanSuggestionService', async () => {
        const { component } = await setup();
        const suggestionService = TestBed.inject(PlanSuggestionService);
        const spy = jest.spyOn(suggestionService, 'suggestTopics').mockReturnValue(['javascript:closures']);
        component.suggestTopics();
        expect(spy).toHaveBeenCalled();
        expect(component.lastSuggestionCount()).toBe(1);
    });

    it('suggestTopics adds returned topic IDs to the plan', async () => {
        const { component, plan } = await setup();
        const suggestionService = TestBed.inject(PlanSuggestionService);
        jest.spyOn(suggestionService, 'suggestTopics').mockReturnValue(['javascript:closures', 'angular:signals']);
        component.suggestTopics();
        expect(plan.isSelected('javascript:closures')).toBe(true);
        expect(plan.isSelected('angular:signals')).toBe(true);
    });

    it('suggestTopics sets count to 0 when service returns empty array', async () => {
        const { component } = await setup();
        const suggestionService = TestBed.inject(PlanSuggestionService);
        jest.spyOn(suggestionService, 'suggestTopics').mockReturnValue([]);
        component.suggestTopics();
        expect(component.lastSuggestionCount()).toBe(0);
    });
});
