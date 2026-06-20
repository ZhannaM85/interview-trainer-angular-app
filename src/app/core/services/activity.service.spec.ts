import { TestBed } from '@angular/core/testing';

import { ActivityService } from './activity.service';
import { formatLocalYmd } from '../../shared/utils/local-date.utils';

function setup(): ActivityService {
    TestBed.configureTestingModule({});
    return TestBed.inject(ActivityService);
}

describe('ActivityService — clearOlderThan', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('removes entries strictly older than the cutoff', () => {
        const svc = setup();
        const todayYmd = formatLocalYmd(new Date());
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 100);
        const oldYmd = formatLocalYmd(oldDate);

        // Seed old entry directly into localStorage so the service loads it.
        localStorage.setItem(
            'interview-trainer:activity-by-day',
            JSON.stringify([
                { date: oldYmd, questionsAnswered: 5, topicsStudied: 2, activeSeconds: 60 },
                { date: todayYmd, questionsAnswered: 1, topicsStudied: 0, activeSeconds: 10 }
            ])
        );

        // Re-instantiate so it reads the pre-seeded data.
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({});
        const freshSvc = TestBed.inject(ActivityService);

        freshSvc.clearOlderThan(30);

        const map = freshSvc.activityMap();
        expect(map.has(oldYmd)).toBe(false);
        expect(map.has(todayYmd)).toBe(true);
    });

    it('keeps all entries when days is 0 (no-op)', () => {
        const svc = setup();
        svc.bumpQuestionsAnswered(1);
        const sizeBefore = svc.activityMap().size;
        svc.clearOlderThan(0);
        expect(svc.activityMap().size).toBe(sizeBefore);
    });

    it('persists the pruned map to localStorage', () => {
        const svc = setup();
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 100);
        const oldYmd = formatLocalYmd(oldDate);

        localStorage.setItem(
            'interview-trainer:activity-by-day',
            JSON.stringify([
                { date: oldYmd, questionsAnswered: 3, topicsStudied: 1, activeSeconds: 0 }
            ])
        );

        TestBed.resetTestingModule();
        TestBed.configureTestingModule({});
        const freshSvc = TestBed.inject(ActivityService);

        freshSvc.clearOlderThan(30);

        const stored = JSON.parse(
            localStorage.getItem('interview-trainer:activity-by-day') ?? '[]'
        ) as unknown[];
        expect(stored.length).toBe(0);
    });
});
