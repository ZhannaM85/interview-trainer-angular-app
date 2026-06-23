import { TestBed } from '@angular/core/testing';

import { SociologyActivityService } from './sociology-activity.service';
import { formatLocalYmd } from '../../shared/utils/local-date.utils';

const STORAGE_KEY = 'interview-trainer:sociology-activity-by-day';

function setup(): SociologyActivityService {
    TestBed.configureTestingModule({});
    return TestBed.inject(SociologyActivityService);
}

describe('SociologyActivityService', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    describe('initial state', () => {
        it('starts with an empty activity map when no stored data', () => {
            const svc = setup();
            expect(svc.activityMap().size).toBe(0);
        });

        it('starts with zero totalActiveSeconds when no stored data', () => {
            const svc = setup();
            expect(svc.totalActiveSeconds()).toBe(0);
        });

        it('loads pre-seeded data from localStorage', () => {
            const today = formatLocalYmd(new Date());
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify([{ date: today, questionsAnswered: 3, topicsStudied: 1, activeSeconds: 60, coveredTopicIds: [] }])
            );
            TestBed.configureTestingModule({});
            const svc = TestBed.inject(SociologyActivityService);
            expect(svc.activityMap().size).toBe(1);
            expect(svc.activityMap().get(today)!.questionsAnswered).toBe(3);
            expect(svc.totalActiveSeconds()).toBe(60);
        });

        it('ignores malformed rows in stored data', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([{ bad: true }, 42, null]));
            TestBed.configureTestingModule({});
            const svc = TestBed.inject(SociologyActivityService);
            expect(svc.activityMap().size).toBe(0);
        });

        it('handles non-array stored value gracefully', () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify('not-an-array'));
            TestBed.configureTestingModule({});
            const svc = TestBed.inject(SociologyActivityService);
            expect(svc.activityMap().size).toBe(0);
        });
    });

    describe('bumpQuestionsAnswered', () => {
        it('increments questionsAnswered for today', () => {
            const svc = setup();
            svc.bumpQuestionsAnswered();
            const today = formatLocalYmd(new Date());
            expect(svc.activityMap().get(today)!.questionsAnswered).toBe(1);
        });

        it('accumulates multiple bumps', () => {
            const svc = setup();
            svc.bumpQuestionsAnswered(3);
            svc.bumpQuestionsAnswered(2);
            const today = formatLocalYmd(new Date());
            expect(svc.activityMap().get(today)!.questionsAnswered).toBe(5);
        });

        it('ignores zero or negative delta', () => {
            const svc = setup();
            svc.bumpQuestionsAnswered(0);
            svc.bumpQuestionsAnswered(-1);
            expect(svc.activityMap().size).toBe(0);
        });

        it('persists to localStorage', () => {
            const svc = setup();
            svc.bumpQuestionsAnswered(2);
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as unknown[];
            expect(stored.length).toBe(1);
        });
    });

    describe('bumpTopicsStudied', () => {
        it('increments topicsStudied for today', () => {
            const svc = setup();
            svc.bumpTopicsStudied();
            const today = formatLocalYmd(new Date());
            expect(svc.activityMap().get(today)!.topicsStudied).toBe(1);
        });

        it('ignores zero or negative delta', () => {
            const svc = setup();
            svc.bumpTopicsStudied(0);
            svc.bumpTopicsStudied(-5);
            expect(svc.activityMap().size).toBe(0);
        });
    });

    describe('recordPracticeRating', () => {
        it('records a rating for a question', () => {
            const svc = setup();
            svc.recordPracticeRating(42, 'partial');
            const today = formatLocalYmd(new Date());
            const row = svc.activityMap().get(today)!;
            expect(row.practiceRatingBest!['42']).toBe('partial');
        });

        it('upgrades rating (partial -> nailed) but does not downgrade', () => {
            const svc = setup();
            svc.recordPracticeRating(42, 'partial');
            svc.recordPracticeRating(42, 'nailed');
            const today = formatLocalYmd(new Date());
            expect(svc.activityMap().get(today)!.practiceRatingBest!['42']).toBe('nailed');
        });

        it('does not downgrade a better rating', () => {
            const svc = setup();
            svc.recordPracticeRating(42, 'nailed');
            svc.recordPracticeRating(42, 'didntKnow');
            const today = formatLocalYmd(new Date());
            expect(svc.activityMap().get(today)!.practiceRatingBest!['42']).toBe('nailed');
        });
    });

    describe('todayActiveSeconds', () => {
        it('returns 0 when no activity for today', () => {
            const svc = setup();
            expect(svc.todayActiveSeconds()).toBe(0);
        });

        it('returns accumulated seconds after addActiveSeconds', () => {
            const svc = setup();
            svc.addActiveSeconds(30);
            expect(svc.todayActiveSeconds()).toBe(30);
        });
    });

    describe('addActiveSeconds', () => {
        it('adds seconds to today and increments totalActiveSeconds', () => {
            const svc = setup();
            svc.addActiveSeconds(10);
            svc.addActiveSeconds(20);
            expect(svc.todayActiveSeconds()).toBe(30);
            expect(svc.totalActiveSeconds()).toBe(30);
        });

        it('ignores zero or negative delta', () => {
            const svc = setup();
            svc.addActiveSeconds(0);
            svc.addActiveSeconds(-5);
            expect(svc.totalActiveSeconds()).toBe(0);
        });
    });

    describe('addCoveredTopic', () => {
        it('adds a topic id for today', () => {
            const svc = setup();
            svc.addCoveredTopic('sociology:culture');
            const today = formatLocalYmd(new Date());
            expect(svc.activityMap().get(today)!.coveredTopicIds).toContain('sociology:culture');
        });

        it('deduplicates topic ids', () => {
            const svc = setup();
            svc.addCoveredTopic('sociology:culture');
            svc.addCoveredTopic('sociology:culture');
            const today = formatLocalYmd(new Date());
            const ids = svc.activityMap().get(today)!.coveredTopicIds;
            expect(ids.filter((x) => x === 'sociology:culture').length).toBe(1);
        });

        it('ignores empty or whitespace-only topic id', () => {
            const svc = setup();
            svc.addCoveredTopic('');
            svc.addCoveredTopic('   ');
            expect(svc.activityMap().size).toBe(0);
        });

        it('trims whitespace from topic id', () => {
            const svc = setup();
            svc.addCoveredTopic('  sociology:norms  ');
            const today = formatLocalYmd(new Date());
            expect(svc.activityMap().get(today)!.coveredTopicIds).toContain('sociology:norms');
        });
    });

    describe('data normalization on load', () => {
        it('normalizes practiceRatingBest and strips invalid values', () => {
            const today = formatLocalYmd(new Date());
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify([{
                    date: today,
                    questionsAnswered: 1,
                    topicsStudied: 0,
                    activeSeconds: 0,
                    coveredTopicIds: [],
                    practiceRatingBest: { '1': 'nailed', '2': 'invalidValue', '3': 'partial' }
                }])
            );
            TestBed.configureTestingModule({});
            const svc = TestBed.inject(SociologyActivityService);
            const row = svc.activityMap().get(today)!;
            expect(row.practiceRatingBest!['1']).toBe('nailed');
            expect(row.practiceRatingBest!['3']).toBe('partial');
            expect(row.practiceRatingBest!['2']).toBeUndefined();
        });

        it('clamps negative activeSeconds to 0', () => {
            const today = formatLocalYmd(new Date());
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify([{ date: today, questionsAnswered: 0, topicsStudied: 0, activeSeconds: -10, coveredTopicIds: [] }])
            );
            TestBed.configureTestingModule({});
            const svc = TestBed.inject(SociologyActivityService);
            expect(svc.activityMap().get(today)!.activeSeconds).toBe(0);
        });
    });
});
