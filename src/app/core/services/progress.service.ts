import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { LegacyProgress, Progress } from '../../shared/models/progress.model';
import type { Question } from '../../shared/models/question.model';
import type { SelfRating } from '../../shared/models/self-rating.model';
import { ActivityService } from './activity.service';
import { QuestionService } from './question.service';
import { StorageService } from './storage.service';

const PROGRESS_KEY = 'progress';

/** Points shown on the feedback screen after a self-rating. */
export const SCORE_BY_RATING: Record<SelfRating, number> = {
    nailed: 12,
    partial: 5,
    didntKnow: 0
};

function isLegacyProgress(row: unknown): row is LegacyProgress {
    return (
        typeof row === 'object' &&
        row !== null &&
        'correctCount' in row &&
        !('nailedCount' in row)
    );
}

function repairNextReview(value: unknown): string {
    if (typeof value === 'string' && value && !isNaN(new Date(value).getTime())) {
        return value;
    }
    return new Date().toISOString();
}

function repairLastAnswered(value: unknown): string {
    if (typeof value === 'string' && value && !isNaN(new Date(value).getTime())) {
        return value;
    }
    return '';
}

function normalizeProgressEntry(row: Progress | LegacyProgress): Progress {
    if (!isLegacyProgress(row)) {
        return {
            questionId: row.questionId,
            nailedCount: row.nailedCount ?? 0,
            partialCount: row.partialCount ?? 0,
            didntKnowCount: row.didntKnowCount ?? 0,
            lastAnswered: repairLastAnswered(row.lastAnswered),
            nextReview: repairNextReview(row.nextReview)
        };
    }
    return {
        questionId: row.questionId,
        nailedCount: row.correctCount ?? 0,
        partialCount: 0,
        didntKnowCount: row.incorrectCount ?? 0,
        lastAnswered: repairLastAnswered(row.lastAnswered),
        nextReview: repairNextReview(row.nextReview)
    };
}

@Injectable({
    providedIn: 'root'
})
export class ProgressService {
    private readonly storage = inject(StorageService);
    private readonly questionService = inject(QuestionService);
    private readonly activityService = inject(ActivityService);

    private readonly _progress = signal<Progress[]>(this.loadProgress());

    /**
     * Spaced repetition: nailed -> +3 days, partial -> +2 days, didn't know -> +1 day.
     */
    recordSelfRating(questionId: number, rating: SelfRating): void {
        const now = new Date();
        const nextReview = new Date(now);
        if (rating === 'nailed') {
            nextReview.setDate(nextReview.getDate() + 3);
        } else if (rating === 'partial') {
            nextReview.setDate(nextReview.getDate() + 2);
        } else {
            nextReview.setDate(nextReview.getDate() + 1);
        }

        this._progress.update((list) => {
            const existing = list.find((p) => p.questionId === questionId);
            if (existing) {
                return list.map((p) =>
                    p.questionId === questionId
                        ? {
                              ...p,
                              nailedCount: p.nailedCount + (rating === 'nailed' ? 1 : 0),
                              partialCount: p.partialCount + (rating === 'partial' ? 1 : 0),
                              didntKnowCount:
                                  p.didntKnowCount + (rating === 'didntKnow' ? 1 : 0),
                              lastAnswered: now.toISOString(),
                              nextReview: nextReview.toISOString()
                          }
                        : p
                );
            }
            return [
                ...list,
                {
                    questionId,
                    nailedCount: rating === 'nailed' ? 1 : 0,
                    partialCount: rating === 'partial' ? 1 : 0,
                    didntKnowCount: rating === 'didntKnow' ? 1 : 0,
                    lastAnswered: now.toISOString(),
                    nextReview: nextReview.toISOString()
                }
            ];
        });

        this.storage.set(PROGRESS_KEY, this._progress());
        this.activityService.recordPracticeRating(questionId, rating);
    }

    /** Returns cached progress. Reads the signal, so computed() callers track it reactively. */
    getProgress(): Progress[] {
        return this._progress();
    }

    private loadProgress(): Progress[] {
        const raw = this.storage.get<unknown>(PROGRESS_KEY);
        if (!Array.isArray(raw)) {
            return [];
        }
        return raw.map((row) => normalizeProgressEntry(row as Progress | LegacyProgress));
    }

    getDueQuestions(): Observable<Question[]> {
        return this.questionService.getQuestions().pipe(
            map((questions) => this.getDueQuestionsSync(questions))
        );
    }

    getDueQuestionsSync(questions: Question[]): Question[] {
        return this.filterDueQuestions(questions);
    }

    private filterDueQuestions(questions: Question[]): Question[] {
        const progress = this.getProgress();
        const now = new Date();
        const due = questions.filter((q) => {
            const p = progress.find((x) => x.questionId === q.id);
            if (!p) {
                return true;
            }
            return new Date(p.nextReview) <= now;
        });
        for (let i = due.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [due[i], due[j]] = [due[j], due[i]];
        }
        return due;
    }
}
