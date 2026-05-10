import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateLoader, TranslateService, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { PlanPageComponent } from './plan-page.component';
import { TodayPlanService } from '../../../../core/services/today-plan.service';

class StubLoader implements TranslateLoader {
    getTranslation(): Observable<TranslationObject> {
        return of({ plan: {}, study: { category: {} } });
    }
}

async function setup() {
    localStorage.clear();
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
        requestMarkAllStudied(key: string): void;
        confirmMarkAllStudiedTopics(): void;
        cancelMarkAllStudied(): void;
        topicsRemainingToStudyJs: () => string[];
    };
    fixture.detectChanges();
    return { fixture, component, plan: TestBed.inject(TodayPlanService) };
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
