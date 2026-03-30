import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { LegacyProgress, Progress } from '../../shared/models/progress.model';
import type { Question } from '../../shared/models/question.model';
import type { SelfRating } from '../../shared/models/self-rating.model';
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

function normalizeProgressEntry(row: Progress | LegacyProgress): Progress {
    if (!isLegacyProgress(row)) {
        return {
            questionId: row.questionId,
            nailedCount: row.nailedCount ?? 0,
            partialCount: row.partialCount ?? 0,
            didntKnowCount: row.didntKnowCount ?? 0,
            lastAnswered: row.lastAnswered,
            nextReview: row.nextReview
        };
    }
    return {
        questionId: row.questionId,
        nailedCount: row.correctCount ?? 0,
        partialCount: 0,
        didntKnowCount: row.incorrectCount ?? 0,
        lastAnswered: row.lastAnswered,
        nextReview: row.nextReview
    };
}

@Injectable({
    providedIn: 'root'
})
export class ProgressService {
    private readonly storage = inject(StorageService);
    private readonly questionService = inject(QuestionService);

    /**
     * Spaced repetition: nailed → +3 days, partial → +2 days, didn’t know → +1 day.
     */
    recordSelfRating(questionId: number, rating: SelfRating): void {
        const list = this.getProgress();
        const now = new Date();
        const nextReview = new Date(now);
        if (rating === 'nailed') {
            nextReview.setDate(nextReview.getDate() + 3);
        } else if (rating === 'partial') {
            nextReview.setDate(nextReview.getDate() + 2);
        } else {
            nextReview.setDate(nextReview.getDate() + 1);
        }

        const existing = list.find((p) => p.questionId === questionId);
        if (existing) {
            if (rating === 'nailed') {
                existing.nailedCount += 1;
            } else if (rating === 'partial') {
                existing.partialCount += 1;
            } else {
                existing.didntKnowCount += 1;
            }
            existing.lastAnswered = now.toISOString();
            existing.nextReview = nextReview.toISOString();
        } else {
            list.push({
                questionId,
                nailedCount: rating === 'nailed' ? 1 : 0,
                partialCount: rating === 'partial' ? 1 : 0,
                didntKnowCount: rating === 'didntKnow' ? 1 : 0,
                lastAnswered: now.toISOString(),
                nextReview: nextReview.toISOString()
            });
        }
        this.storage.set(PROGRESS_KEY, list);
    }

    getProgress(): Progress[] {
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
        return due.sort((a, b) => a.id - b.id);
    }
}
