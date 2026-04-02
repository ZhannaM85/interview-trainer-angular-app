import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { take } from 'rxjs';

import { ProgressService, SCORE_BY_RATING } from '../../../../core/services/progress.service';
import { QuestionService } from '../../../../core/services/question.service';
import type { Question } from '../../../../shared/models/question.model';
import type { SelfRating } from '../../../../shared/models/self-rating.model';
import { ProgressBarComponent } from '../../../../shared/components/progress-bar/progress-bar.component';
import { InterviewAnswerComponent } from '../../components/interview-answer/interview-answer.component';
import { InterviewFeedbackComponent } from '../../components/interview-feedback/interview-feedback.component';
import { InterviewQuestionComponent } from '../../components/interview-question/interview-question.component';

export type QuizPhase = 'question' | 'answer' | 'feedback';

export interface FeedbackSnapshot {
    headline: string;
    scoreDelta: number;
    weakArea: string;
    nextReviewLabel: string;
}

export interface SessionProgressCounts {
    answered: number;
    remaining: number;
    total: number;
}

function formatWeakAreaLabel(subtopic: string): string {
    if (!subtopic.trim()) {
        return '';
    }
    return subtopic.charAt(0).toUpperCase() + subtopic.slice(1);
}

function formatCategoryLabel(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatNextReviewLabel(iso: string): string {
    const target = new Date(iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(target);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
    if (diffDays <= 0) {
        return 'Today';
    }
    if (diffDays === 1) {
        return 'Tomorrow';
    }
    return target.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

@Component({
    selector: 'app-quiz-page',
    imports: [
        InterviewQuestionComponent,
        InterviewAnswerComponent,
        InterviewFeedbackComponent,
        ProgressBarComponent
    ],
    templateUrl: './quiz-page.component.html',
    styleUrl: './quiz-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizPageComponent {
    private readonly questionService = inject(QuestionService);
    private readonly progressService = inject(ProgressService);

    protected readonly currentQuestion = signal<Question | null>(null);
    protected readonly phase = signal<QuizPhase>('question');
    protected readonly feedbackSnapshot = signal<FeedbackSnapshot | null>(null);
    protected readonly sessionComplete = signal(false);
    protected readonly loadError = signal(false);
    protected readonly loading = signal(true);
    protected readonly usingFallbackQueue = signal(false);
    protected readonly sessionIndex = signal(0);
    protected readonly sessionTotal = signal(0);

    protected readonly sessionProgressCounts = computed((): SessionProgressCounts | null => {
        const total = this.sessionTotal();
        if (total <= 0) {
            return null;
        }
        const idx = this.sessionIndex();
        const ph = this.phase();
        const answered = ph === 'feedback' ? idx : idx - 1;
        const remaining = total - answered;
        return { answered, remaining, total };
    });

    constructor() {
        this.loadQuiz();
    }

    protected goToAnswer(): void {
        if (this.phase() !== 'question') {
            return;
        }
        this.phase.set('answer');
    }

    protected onSelfRated(rating: SelfRating): void {
        const q = this.currentQuestion();
        if (!q || this.phase() !== 'answer') {
            return;
        }
        this.progressService.recordSelfRating(q.id, rating);
        const updated = this.progressService.getProgress().find((p) => p.questionId === q.id);
        const nextReviewIso = updated?.nextReview ?? new Date().toISOString();
        const headline =
            rating === 'nailed'
                ? 'Good job!'
                : rating === 'partial'
                  ? 'Nice effort'
                  : 'Keep practicing';
        this.feedbackSnapshot.set({
            headline,
            scoreDelta: SCORE_BY_RATING[rating],
            weakArea: formatWeakAreaLabel(q.subtopic) || formatCategoryLabel(q.category),
            nextReviewLabel: formatNextReviewLabel(nextReviewIso)
        });
        this.phase.set('feedback');
    }

    protected onNextQuestion(): void {
        this.advanceToNextQuestion();
    }

    protected restartSession(): void {
        this.loadQuiz();
    }

    private loadQuiz(): void {
        this.loading.set(true);
        this.loadError.set(false);
        this.sessionComplete.set(false);
        this.currentQuestion.set(null);
        this.phase.set('question');
        this.feedbackSnapshot.set(null);
        this.questionService
            .getQuestions()
            .pipe(take(1))
            .subscribe({
                next: (all) => {
                    const due = this.progressService.getDueQuestionsSync(all);
                    const useFallback = due.length === 0;
                    this.usingFallbackQueue.set(useFallback);
                    const queue = useFallback ? all : due;
                    this.sessionTotal.set(queue.length);
                    this.sessionIndex.set(0);
                    this.questionService.initializeQueue(queue);
                    this.loading.set(false);
                    this.advanceToNextQuestion();
                },
                error: () => {
                    this.loadError.set(true);
                    this.loading.set(false);
                }
            });
    }

    private advanceToNextQuestion(): void {
        const next = this.questionService.getNextQuestion();
        this.currentQuestion.set(next);
        this.phase.set('question');
        this.feedbackSnapshot.set(null);
        if (next) {
            this.sessionIndex.update((i) => i + 1);
        }
        if (!next) {
            this.sessionComplete.set(true);
        }
    }
}
