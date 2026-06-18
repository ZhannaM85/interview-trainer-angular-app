import { Injectable } from '@angular/core';

import type { DailyActivity } from '../../shared/models/activity.model';
import type { Progress } from '../../shared/models/progress.model';
import type { Question } from '../../shared/models/question.model';
import { isSociologyPlanTopicId } from '../../shared/utils/sociology-topic-key.utils';
import { topicIdFromQuestion } from '../../shared/utils/topic-key.utils';
import { formatLocalYmd } from '../../shared/utils/local-date.utils';

const MAX_SUGGESTIONS = 5;
const STALE_DAYS = 7;

@Injectable({ providedIn: 'root' })
export class PlanSuggestionService {
    /**
     * Returns up to `MAX_SUGGESTIONS` topic IDs (JS/Angular/RxJS/custom only) to pre-select.
     * Priority order:
     *   1. Topics with any question whose `nextReview` date is today or earlier (or never answered).
     *   2. Topics where non-nailed answers outnumber nailed ones (weak areas).
     *   3. Topics not covered in the last 7 days.
     * Topics already in `alreadyHandled` (selected or studied today) are skipped.
     */
    suggestTopics(
        questions: Question[],
        progress: Progress[],
        activityMap: ReadonlyMap<string, DailyActivity>,
        alreadyHandled: string[]
    ): string[] {
        const now = new Date();
        const handledSet = new Set(alreadyHandled);

        // Group non-sociology questions by topicId
        const byTopic = new Map<string, Question[]>();
        for (const q of questions) {
            const id = topicIdFromQuestion(q);
            if (isSociologyPlanTopicId(id)) continue;
            const bucket = byTopic.get(id);
            if (bucket) {
                bucket.push(q);
            } else {
                byTopic.set(id, [q]);
            }
        }

        // Progress lookup by questionId
        const progressById = new Map(progress.map((p) => [p.questionId, p]));

        // Collect topic IDs covered in the last STALE_DAYS days
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - STALE_DAYS);
        const cutoffStr = formatLocalYmd(cutoff);
        const recentlyCovered = new Set<string>();
        for (const [dateStr, activity] of activityMap) {
            if (dateStr >= cutoffStr) {
                for (const id of activity.coveredTopicIds ?? []) {
                    recentlyCovered.add(id);
                }
            }
        }

        const overdue: string[] = [];
        const weak: string[] = [];
        const stale: string[] = [];

        for (const [topicId, topicQuestions] of byTopic) {
            if (handledSet.has(topicId)) continue;

            // Priority 1 — any question is due (past nextReview or never answered)
            const hasOverdue = topicQuestions.some((q) => {
                const p = progressById.get(q.id);
                if (!p) return true;
                return new Date(p.nextReview) <= now;
            });
            if (hasOverdue) {
                overdue.push(topicId);
                continue;
            }

            // Priority 2 — weak rating: non-nailed answers ≥ nailed answers (among answered questions)
            let nailed = 0;
            let notNailed = 0;
            for (const q of topicQuestions) {
                const p = progressById.get(q.id);
                if (p) {
                    nailed += p.nailedCount;
                    notNailed += p.didntKnowCount + p.partialCount;
                }
            }
            if (notNailed > 0 && notNailed >= nailed) {
                weak.push(topicId);
                continue;
            }

            // Priority 3 — not studied in the last 7 days
            if (!recentlyCovered.has(topicId)) {
                stale.push(topicId);
            }
        }

        const result: string[] = [];
        for (const id of [...overdue, ...weak, ...stale]) {
            if (result.length >= MAX_SUGGESTIONS) break;
            result.push(id);
        }
        return result;
    }
}
