import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { take } from 'rxjs';

import { ActivityService } from '../../../../core/services/activity.service';
import { SociologyProgressService } from '../../../../core/services/sociology-progress.service';
import { SociologyQuestionService } from '../../../../core/services/sociology-question.service';
import type { SociologyQuestion } from '../../../../shared/models/sociology-question.model';
import type { SelfRating } from '../../../../shared/models/self-rating.model';
import { evaluateSociologySelection } from '../../../../shared/utils/sociology-answer.utils';
import type { SociologyOutcome } from '../../../../shared/utils/sociology-answer.utils';

export type SociologyQuizPhase = 'question' | 'answer' | 'feedback';

@Component({
    selector: 'app-sociology-quiz-page',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './sociology-quiz-page.component.html',
    styleUrl: './sociology-quiz-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SociologyQuizPageComponent {
    private readonly questionService = inject(SociologyQuestionService);
    private readonly progressService = inject(SociologyProgressService);
    private readonly activityService = inject(ActivityService);

    protected readonly phase = signal<SociologyQuizPhase>('question');
    protected readonly currentQuestion = signal<SociologyQuestion | null>(null);
    protected readonly selectedIndices = signal<number[]>([]);
    protected readonly outcome = signal<SociologyOutcome | null>(null);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);
    protected readonly sessionComplete = signal(false);
    protected readonly sessionIndex = signal(0);
    protected readonly sessionTotal = signal(0);

    protected readonly canSubmitQuestion = computed(() => {
        const q = this.currentQuestion();
        const sel = this.selectedIndices();
        if (!q) {
            return false;
        }
        if (q.type === 'single') {
            return sel.length === 1;
        }
        return sel.length >= 1;
    });

    constructor() {
        this.questionService
            .getQuestions()
            .pipe(takeUntilDestroyed())
            .subscribe((all) => {
                const cur = this.currentQuestion();
                if (cur && !this.sessionComplete()) {
                    const updated = this.questionService.getQuestionByIdFromList(all, cur.id);
                    if (updated) {
                        this.currentQuestion.set(updated);
                    }
                }
            });

        this.loadSession();
    }

    protected toggleMulti(index: number): void {
        const q = this.currentQuestion();
        if (!q || q.type !== 'multi') {
            return;
        }
        const cur = [...this.selectedIndices()];
        const pos = cur.indexOf(index);
        if (pos >= 0) {
            cur.splice(pos, 1);
        } else {
            cur.push(index);
        }
        cur.sort((a, b) => a - b);
        this.selectedIndices.set(cur);
    }

    protected selectSingle(index: number): void {
        const q = this.currentQuestion();
        if (!q || q.type !== 'single') {
            return;
        }
        this.selectedIndices.set([index]);
    }

    protected isSelected(index: number): boolean {
        return this.selectedIndices().includes(index);
    }

    protected optionState(index: number): 'neutral' | 'correct' | 'wrong' | 'missed' {
        const q = this.currentQuestion();
        const ph = this.phase();
        if (!q || ph === 'question') {
            return 'neutral';
        }
        const correct = q.correctIndices.includes(index);
        const picked = this.selectedIndices().includes(index);
        if (correct && picked) {
            return 'correct';
        }
        if (!correct && picked) {
            return 'wrong';
        }
        if (correct && !picked) {
            return 'missed';
        }
        return 'neutral';
    }

    protected submitQuestion(): void {
        const q = this.currentQuestion();
        if (!q || this.phase() !== 'question' || !this.canSubmitQuestion()) {
            return;
        }
        const o = evaluateSociologySelection(q, this.selectedIndices());
        this.outcome.set(o);
        this.phase.set('answer');
    }

    protected continueToFeedback(): void {
        if (this.phase() !== 'answer') {
            return;
        }
        this.phase.set('feedback');
    }

    protected nextQuestion(): void {
        const q = this.currentQuestion();
        const o = this.outcome();
        if (!q || !o || this.phase() !== 'feedback') {
            return;
        }
        this.progressService.recordAnswer(q.id, o);
        this.activityService.bumpQuestionsAnswered(1);
        const rating: SelfRating =
            o === 'correct' ? 'nailed' : o === 'partial' ? 'partial' : 'didntKnow';
        this.activityService.recordPracticeRating(q.id, rating);

        const next = this.questionService.getNextQuestion();
        this.sessionIndex.update((i) => i + 1);
        if (!next) {
            this.sessionComplete.set(true);
            this.currentQuestion.set(null);
            this.phase.set('question');
            this.selectedIndices.set([]);
            this.outcome.set(null);
            return;
        }
        this.currentQuestion.set(next);
        this.phase.set('question');
        this.selectedIndices.set([]);
        this.outcome.set(null);
    }

    protected restartSession(): void {
        this.loadSession();
    }

    private loadSession(): void {
        this.loading.set(true);
        this.loadError.set(false);
        this.sessionComplete.set(false);
        this.phase.set('question');
        this.selectedIndices.set([]);
        this.outcome.set(null);
        this.questionService.resetQueue();
        this.questionService
            .getQuestions()
            .pipe(take(1))
            .subscribe({
                next: (all) => {
                    const ordered = this.progressService.orderQuestionsForSession(all);
                    this.sessionTotal.set(ordered.length);
                    this.sessionIndex.set(0);
                    this.questionService.initializeQueue(ordered);
                    this.loading.set(false);
                    const first = this.questionService.getNextQuestion();
                    this.currentQuestion.set(first);
                    if (!first) {
                        this.sessionComplete.set(true);
                    }
                },
                error: () => {
                    this.loadError.set(true);
                    this.loading.set(false);
                }
            });
    }
}
