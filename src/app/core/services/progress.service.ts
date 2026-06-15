import { Injectable, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { LegacyProgress, Progress } from '../../shared/models/progress.model';
import type { Question } from '../../shared/models/question.model';
import type { SelfRating } from '../../shared/models/self-rating.model';
import { ActivityService } from './activity.service';
import { QuestionService } from './question.service';
import { StorageService } from './storage.service';

const PROGRESS_KEY = 'progress';
const MAX_PROGRESS_AGE_DAYS = 400;
const SM2_INITIAL_EASE_FACTOR = 2.5;
const SM2_MIN_EASE_FACTOR = 1.3;

const GRADE_BY_RATING: Record<SelfRating, number> = {
    nailed: 5,
    partial: 3,
    didntKnow: 1
};

export function sm2(
    grade: number,
    repetitionCount: number,
    easeFactor: number,
    lastIntervalDays: number
): { nextIntervalDays: number; easeFactor: number; repetitionCount: number } {
    const newEF = Math.max(
        SM2_MIN_EASE_FACTOR,
        easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    );
    if (grade < 3) {
        return { nextIntervalDays: 1, easeFactor: newEF, repetitionCount: 0 };
    }
    const newN = repetitionCount + 1;
    const nextIntervalDays =
        newN === 1 ? 1 : newN === 2 ? 6 : Math.round(lastIntervalDays * newEF);
    return { nextIntervalDays, easeFactor: newEF, repetitionCount: newN };
}

function pruneStaleProgress(list: Progress[]): Progress[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_PROGRESS_AGE_DAYS);
    return list.filter((p) => !p.lastAnswered || new Date(p.lastAnswered) >= cutoff);
}

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
            nextReview: repairNextReview(row.nextReview),
            easeFactor: row.easeFactor ?? SM2_INITIAL_EASE_FACTOR,
            repetitionCount: row.repetitionCount ?? 0,
            intervalDays: row.intervalDays ?? 0
        };
    }
    return {
        questionId: row.questionId,
        nailedCount: row.correctCount ?? 0,
        partialCount: 0,
        didntKnowCount: row.incorrectCount ?? 0,
        lastAnswered: repairLastAnswered(row.lastAnswered),
        nextReview: repairNextReview(row.nextReview),
        easeFactor: SM2_INITIAL_EASE_FACTOR,
        repetitionCount: 0,
        intervalDays: 0
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

    recordSelfRating(questionId: number, rating: SelfRating): void {
        const now = new Date();
        const grade = GRADE_BY_RATING[rating];

        this._progress.update((list) => {
            const existing = list.find((p) => p.questionId === questionId);
            const result = sm2(
                grade,
                existing?.repetitionCount ?? 0,
                existing?.easeFactor ?? SM2_INITIAL_EASE_FACTOR,
                existing?.intervalDays ?? 0
            );
            const nextReview = new Date(now);
            nextReview.setDate(nextReview.getDate() + result.nextIntervalDays);

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
                              nextReview: nextReview.toISOString(),
                              easeFactor: result.easeFactor,
                              repetitionCount: result.repetitionCount,
                              intervalDays: result.nextIntervalDays
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
                    nextReview: nextReview.toISOString(),
                    easeFactor: result.easeFactor,
                    repetitionCount: result.repetitionCount,
                    intervalDays: result.nextIntervalDays
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

    /**
     * Reverts a previously recorded self-rating. Pass the progress snapshot captured
     * just before calling `recordSelfRating` — null means the question had no entry yet.
     */
    revertProgress(questionId: number, previous: Progress | null): void {
        this._progress.update((list) => {
            if (previous === null) {
                return list.filter((p) => p.questionId !== questionId);
            }
            const exists = list.some((p) => p.questionId === questionId);
            if (exists) {
                return list.map((p) => (p.questionId === questionId ? previous : p));
            }
            return [...list, previous];
        });
        this.storage.set(PROGRESS_KEY, this._progress());
    }

    private loadProgress(): Progress[] {
        const raw = this.storage.get<unknown>(PROGRESS_KEY);
        if (!Array.isArray(raw)) {
            return [];
        }
        const normalized = raw.map((row) => normalizeProgressEntry(row as Progress | LegacyProgress));
        const pruned = pruneStaleProgress(normalized);
        if (pruned.length < normalized.length) {
            this.storage.set(PROGRESS_KEY, pruned);
        }
        return pruned;
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
