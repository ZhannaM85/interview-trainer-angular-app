import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
    TranslateLoader,
    provideTranslateService,
    type TranslationObject
} from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { ActivityService } from '../../../../core/services/activity.service';
import { TrendChartComponent, type TrendPoint, type TrendWindow } from './trend-chart.component';

class StubLoader implements TranslateLoader {
    getTranslation(): Observable<TranslationObject> {
        return of({});
    }
}

type ComponentInternals = {
    trendPoints: () => TrendPoint[];
    svgPoints: () => Array<{ x: number; yAcc: number; yConf: number }>;
    activeWindow: () => TrendWindow;
    hoveredIndex: { set: (v: number | null) => void; (): number | null };
    setWindow: (w: TrendWindow) => void;
    onPointerLeave: () => void;
};

const testProviders = [
    provideHttpClient(),
    ...provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })
];

function setup() {
    TestBed.configureTestingModule({
        imports: [TrendChartComponent],
        providers: testProviders
    });
    const fixture = TestBed.createComponent(TrendChartComponent);
    const component = fixture.componentInstance as unknown as ComponentInternals;
    const activityService = TestBed.inject(ActivityService);
    fixture.detectChanges();
    return { fixture, component, activityService };
}

describe('TrendChartComponent', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('returns empty trend points when no practice data exists', () => {
        const { component } = setup();
        expect(component.trendPoints()).toEqual([]);
    });

    it('computes accuracy and confidence from daily practiceRatingBest', () => {
        const { component, activityService } = setup();
        // Record: nailed=1, partial=1, didntKnow=1 → total=3
        // accuracy  = 1/3 ≈ 33%
        // confidence = (1 + 0.5) / 3 = 0.5 → 50%
        activityService.recordPracticeRating(1, 'nailed');
        activityService.recordPracticeRating(2, 'partial');
        activityService.recordPracticeRating(3, 'didntKnow');

        const pts = component.trendPoints();
        expect(pts.length).toBe(1);
        expect(pts[0].accuracyPct).toBe(33);
        expect(pts[0].confidencePct).toBe(50);
    });

    it('computes 100% accuracy when all questions are nailed', () => {
        const { component, activityService } = setup();
        activityService.recordPracticeRating(1, 'nailed');
        activityService.recordPracticeRating(2, 'nailed');

        const pts = component.trendPoints();
        expect(pts.length).toBe(1);
        expect(pts[0].accuracyPct).toBe(100);
        expect(pts[0].confidencePct).toBe(100);
    });

    it('defaults to 30d window', () => {
        const { component } = setup();
        expect(component.activeWindow()).toBe('30d');
    });

    it('setWindow updates activeWindow and clears hoveredIndex', () => {
        const { component } = setup();
        component.hoveredIndex.set(2);
        component.setWindow('7d');
        expect(component.activeWindow()).toBe('7d');
        expect(component.hoveredIndex()).toBeNull();
    });

    it('setWindow to all sets all-time window', () => {
        const { component } = setup();
        component.setWindow('all');
        expect(component.activeWindow()).toBe('all');
    });

    it('onPointerLeave clears hoveredIndex', () => {
        const { component } = setup();
        component.hoveredIndex.set(0);
        component.onPointerLeave();
        expect(component.hoveredIndex()).toBeNull();
    });

    it('svgPoints is empty when there are no trend points', () => {
        const { component } = setup();
        expect(component.svgPoints()).toEqual([]);
    });

    it('svgPoints places single point at horizontal center', () => {
        const { component, activityService } = setup();
        activityService.recordPracticeRating(1, 'nailed');

        const pts = component.svgPoints();
        expect(pts.length).toBe(1);
        // Single point should be at the midpoint x (frac=0.5)
        const plotL = 34;
        const plotW = 500 - 8 - 34;
        expect(pts[0].x).toBeCloseTo(plotL + 0.5 * plotW, 0);
    });

    it('skips days without practiceRatingBest', () => {
        const { component, activityService } = setup();
        // bumpQuestionsAnswered adds to questionsAnswered but not practiceRatingBest
        activityService.bumpQuestionsAnswered(5);

        expect(component.trendPoints()).toEqual([]);
    });
});
