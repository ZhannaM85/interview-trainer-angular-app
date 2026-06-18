import { TestBed } from '@angular/core/testing';

import type { DailyActivity } from '../../shared/models/activity.model';
import type { Progress } from '../../shared/models/progress.model';
import type { Question } from '../../shared/models/question.model';
import { formatLocalYmd } from '../../shared/utils/local-date.utils';
import { PlanSuggestionService } from './plan-suggestion.service';

function makeQuestion(id: number, category: 'javascript' | 'angular' | 'rxjs', subtopic: string): Question {
    return {
        id,
        question: `Q${id}`,
        answer: '',
        weakAnswer: '',
        technicalAnswer: '',
        interviewAnswer: '',
        codeExample: '',
        readMoreLinks: [],
        subtopic,
        category,
        difficulty: 'beginner'
    };
}

function makeProgress(questionId: number, nailed: number, partial: number, didntKnow: number, daysUntilReview: number): Progress {
    const next = new Date();
    next.setDate(next.getDate() + daysUntilReview);
    const last = new Date();
    last.setDate(last.getDate() - 1);
    return {
        questionId,
        nailedCount: nailed,
        partialCount: partial,
        didntKnowCount: didntKnow,
        lastAnswered: last.toISOString(),
        nextReview: next.toISOString(),
        easeFactor: 2.5,
        repetitionCount: 1,
        intervalDays: 1
    };
}

function makeActivityMap(entries: Array<{ daysAgo: number; topicIds: string[] }>): Map<string, DailyActivity> {
    const map = new Map<string, DailyActivity>();
    for (const { daysAgo, topicIds } of entries) {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        const dateStr = formatLocalYmd(d);
        map.set(dateStr, {
            date: dateStr,
            questionsAnswered: 0,
            topicsStudied: 0,
            activeSeconds: 0,
            coveredTopicIds: topicIds
        });
    }
    return map;
}

describe('PlanSuggestionService', () => {
    let service: PlanSuggestionService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PlanSuggestionService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('suggests a topic with an overdue question (nextReview in the past)', () => {
        const questions = [makeQuestion(1, 'javascript', 'closures')];
        const progress = [makeProgress(1, 1, 0, 0, -1)]; // overdue
        const result = service.suggestTopics(questions, progress, new Map(), []);
        expect(result).toContain('javascript:closures');
    });

    it('suggests a topic with no progress (never answered = overdue)', () => {
        const questions = [makeQuestion(1, 'javascript', 'closures')];
        const result = service.suggestTopics(questions, [], new Map(), []);
        expect(result).toContain('javascript:closures');
    });

    it('does not suggest a topic whose questions are not yet due (when recently covered)', () => {
        const questions = [makeQuestion(1, 'javascript', 'closures')];
        const progress = [makeProgress(1, 3, 0, 0, 5)]; // due in 5 days, not overdue
        // Mark as recently covered so it also doesn't fall into the stale bucket
        const activityMap = makeActivityMap([{ daysAgo: 1, topicIds: ['javascript:closures'] }]);
        const result = service.suggestTopics(questions, progress, activityMap, []);
        expect(result).not.toContain('javascript:closures');
    });

    it('suggests a weak topic (more not-nailed than nailed)', () => {
        const questions = [makeQuestion(1, 'angular', 'signals')];
        // Not overdue (due in future), but mostly didntKnow
        const progress = [makeProgress(1, 1, 2, 3, 5)]; // nailed=1, notNailed=5
        const result = service.suggestTopics(questions, progress, new Map(), []);
        expect(result).toContain('angular:signals');
    });

    it('does not suggest a strong topic when recently covered (more nailed than not-nailed)', () => {
        const questions = [makeQuestion(1, 'angular', 'signals')];
        const progress = [makeProgress(1, 5, 0, 1, 5)]; // nailed=5, notNailed=1, not overdue
        // Mark as recently covered so it also doesn't fall into the stale bucket
        const activityMap = makeActivityMap([{ daysAgo: 2, topicIds: ['angular:signals'] }]);
        const result = service.suggestTopics(questions, progress, activityMap, []);
        expect(result).not.toContain('angular:signals');
    });

    it('suggests a stale topic not covered in the last 7 days', () => {
        const questions = [makeQuestion(1, 'rxjs', 'operators')];
        const progress = [makeProgress(1, 5, 0, 0, 5)]; // not overdue, not weak
        // Not in recent activity
        const result = service.suggestTopics(questions, progress, new Map(), []);
        expect(result).toContain('rxjs:operators');
    });

    it('does not suggest a topic covered today', () => {
        const questions = [makeQuestion(1, 'rxjs', 'operators')];
        const progress = [makeProgress(1, 5, 0, 0, 5)];
        const activityMap = makeActivityMap([{ daysAgo: 0, topicIds: ['rxjs:operators'] }]);
        const result = service.suggestTopics(questions, progress, activityMap, []);
        expect(result).not.toContain('rxjs:operators');
    });

    it('does not suggest topics already in alreadyHandled', () => {
        const questions = [makeQuestion(1, 'javascript', 'closures')];
        const result = service.suggestTopics(questions, [], new Map(), ['javascript:closures']);
        expect(result).not.toContain('javascript:closures');
    });

    it('caps suggestions at 5 topics', () => {
        const questions = [
            makeQuestion(1, 'javascript', 'closures'),
            makeQuestion(2, 'javascript', 'promises'),
            makeQuestion(3, 'angular', 'signals'),
            makeQuestion(4, 'angular', 'components'),
            makeQuestion(5, 'rxjs', 'operators'),
            makeQuestion(6, 'rxjs', 'subjects'),
            makeQuestion(7, 'javascript', 'this')
        ];
        const result = service.suggestTopics(questions, [], new Map(), []);
        expect(result.length).toBeLessThanOrEqual(5);
    });

    it('puts overdue topics before weak topics', () => {
        const questions = [
            makeQuestion(1, 'javascript', 'closures'), // overdue
            makeQuestion(2, 'angular', 'signals')      // weak but not overdue
        ];
        const progress = [
            makeProgress(1, 0, 0, 1, -1),  // overdue
            makeProgress(2, 0, 3, 5, 5)    // not overdue, weak
        ];
        const result = service.suggestTopics(questions, progress, new Map(), []);
        expect(result.indexOf('javascript:closures')).toBeLessThan(result.indexOf('angular:signals'));
    });

    it('excludes sociology topics', () => {
        const questions = [
            { ...makeQuestion(1, 'javascript', 'closures'), category: 'javascript' as const },
        ];
        const sociologyQuestion = {
            ...makeQuestion(99, 'javascript', 'something'),
            category: 'sociology' as 'javascript',
            subtopic: 'topic:sub'
        };
        const all = [...questions, sociologyQuestion as unknown as Question];
        const result = service.suggestTopics(all, [], new Map(), []);
        expect(result.every((id) => !id.startsWith('sociology:'))).toBe(true);
    });

    it('returns empty array when all topics are already handled', () => {
        const questions = [makeQuestion(1, 'javascript', 'closures')];
        const result = service.suggestTopics(questions, [], new Map(), ['javascript:closures']);
        expect(result).toEqual([]);
    });

    it('returns empty array when questions list is empty', () => {
        const result = service.suggestTopics([], [], new Map(), []);
        expect(result).toEqual([]);
    });
});
