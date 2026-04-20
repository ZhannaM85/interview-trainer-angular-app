import { Injectable, inject, signal } from '@angular/core';

import type { SociologyProgress } from '../../shared/models/sociology-progress.model';
import type { SociologyQuestion } from '../../shared/models/sociology-question.model';
import { StorageService } from './storage.service';

const SOCIOLOGY_PROGRESS_KEY = 'sociology-progress';

export type SociologyAnswerOutcome = 'correct' | 'partial' | 'wrong';

@Injectable({
    providedIn: 'root'
})
export class SociologyProgressService {
    private readonly storage = inject(StorageService);

    private readonly _progress = signal<SociologyProgress[]>(this.loadProgress());

    /** Reactive read for dashboards (tracks `recordAnswer` updates in-session). */
    readonly progressList = this._progress.asReadonly();

    recordAnswer(questionId: number, outcome: SociologyAnswerOutcome): void {
        const now = new Date();
        const nextReview = new Date(now);
        if (outcome === 'correct') {
            nextReview.setDate(nextReview.getDate() + 3);
        } else if (outcome === 'partial') {
            nextReview.setDate(nextReview.getDate() + 2);
        } else {
            nextReview.setDate(nextReview.getDate() + 1);
        }

        this._progress.update((list) => {
            const existing = list.find((p) => p.questionId === questionId);
            const isCorrect = outcome === 'correct';
            const isWrong = outcome === 'wrong';
            if (existing) {
                return list.map((p) =>
                    p.questionId === questionId
                        ? {
                              ...p,
                              attempts: p.attempts + 1,
                              correct: p.correct + (isCorrect ? 1 : 0),
                              incorrect: p.incorrect + (isWrong ? 1 : 0),
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
                    attempts: 1,
                    correct: isCorrect ? 1 : 0,
                    incorrect: isWrong ? 1 : 0,
                    lastAnswered: now.toISOString(),
                    nextReview: nextReview.toISOString()
                }
            ];
        });

        this.storage.set(SOCIOLOGY_PROGRESS_KEY, this._progress());
    }

    getProgress(): SociologyProgress[] {
        return this._progress();
    }

    /**
     * Full bank ordered with due items first (then by nextReview, then id).
     */
    orderQuestionsForSession(questions: SociologyQuestion[]): SociologyQuestion[] {
        const progress = this.getProgress();
        const now = new Date();
        const dueIds = new Set(
            questions
                .filter((q) => {
                    const p = progress.find((x) => x.questionId === q.id);
                    if (!p) {
                        return true;
                    }
                    return new Date(p.nextReview) <= now;
                })
                .map((q) => q.id)
        );

        return [...questions].sort((a, b) => {
            const aDue = dueIds.has(a.id) ? 0 : 1;
            const bDue = dueIds.has(b.id) ? 0 : 1;
            if (aDue !== bDue) {
                return aDue - bDue;
            }
            const pa = progress.find((x) => x.questionId === a.id);
            const pb = progress.find((x) => x.questionId === b.id);
            const ta = pa ? new Date(pa.nextReview).getTime() : 0;
            const tb = pb ? new Date(pb.nextReview).getTime() : 0;
            if (ta !== tb) {
                return ta - tb;
            }
            return a.id - b.id;
        });
    }

    getDueQuestionsSync(questions: SociologyQuestion[]): SociologyQuestion[] {
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

    private loadProgress(): SociologyProgress[] {
        const raw = this.storage.get<unknown>(SOCIOLOGY_PROGRESS_KEY);
        if (!Array.isArray(raw)) {
            return [];
        }
        return raw.map((row) => this.normalizeEntry(row as SociologyProgress));
    }

    private normalizeEntry(row: SociologyProgress): SociologyProgress {
        const lastAnswered =
            row.lastAnswered && !isNaN(new Date(row.lastAnswered).getTime())
                ? row.lastAnswered
                : '';
        const nextReview =
            row.nextReview && !isNaN(new Date(row.nextReview).getTime())
                ? row.nextReview
                : new Date().toISOString();
        return { ...row, lastAnswered, nextReview };
    }
}
