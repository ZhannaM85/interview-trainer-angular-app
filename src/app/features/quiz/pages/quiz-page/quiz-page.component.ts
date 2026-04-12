import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs';

import { ActivityService } from '../../../../core/services/activity.service';
import { ProgressService, SCORE_BY_RATING } from '../../../../core/services/progress.service';
import { QuestionService } from '../../../../core/services/question.service';
import { TodayPlanService } from '../../../../core/services/today-plan.service';
import type { Question, QuestionCategory } from '../../../../shared/models/question.model';
import { topicIdFromQuestion } from '../../../../shared/utils/topic-key.utils';
import type { SelfRating } from '../../../../shared/models/self-rating.model';
import { ProgressBarComponent } from '../../../../shared/components/progress-bar/progress-bar.component';
import { InterviewAnswerComponent } from '../../components/interview-answer/interview-answer.component';
import { InterviewFeedbackComponent } from '../../components/interview-feedback/interview-feedback.component';
import { InterviewQuestionComponent } from '../../components/interview-question/interview-question.component';
import { SelfEvaluationComponent } from '../../components/self-evaluation/self-evaluation.component';

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

@Component({
    selector: 'app-quiz-page',
    imports: [
        InterviewQuestionComponent,
        InterviewAnswerComponent,
        InterviewFeedbackComponent,
        ProgressBarComponent,
        SelfEvaluationComponent,
        RouterLink,
        TranslatePipe
    ],
    templateUrl: './quiz-page.component.html',
    styleUrl: './quiz-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizPageComponent {
    private readonly questionService = inject(QuestionService);
    private readonly progressService = inject(ProgressService);
    private readonly todayPlan = inject(TodayPlanService);
    private readonly activityService = inject(ActivityService);
    private readonly translate = inject(TranslateService);

    protected readonly currentQuestion = signal<Question | null>(null);
    protected readonly phase = signal<QuizPhase>('question');
    protected readonly feedbackSnapshot = signal<FeedbackSnapshot | null>(null);
    protected readonly sessionComplete = signal(false);
    protected readonly loadError = signal(false);
    protected readonly loading = signal(true);
    protected readonly usingFallbackQueue = signal(false);
    protected readonly sessionIndex = signal(0);
    protected readonly sessionTotal = signal(0);
    /** Unique `category:subtopic` ids in the current session queue (stable for the round). */
    protected readonly sessionStackTopicIds = signal<string[]>([]);

    /** Today’s plan has topics selected but none marked studied yet — practice still uses full catalog. */
    protected readonly planFocusHint = computed(
        () => this.todayPlan.hasSelection() && !this.todayPlan.hasStudiedTopics()
    );

    /**
     * `planFocused` — only questions in topics marked studied today (when any exist).
     * `full` — entire catalog (same due / fallback rules as before).
     */
    protected readonly practiceScope = signal<'planFocused' | 'full'>('planFocused');

    /**
     * When today’s studied topics have no due items, we used to jump straight to “all questions in those topics”.
     * We first show a dialog; this flag skips that dialog on the next load (user chose to practice anyway).
     */
    private readonly acceptPlanTopicFallback = signal(false);

    /** Shown when plan-focused practice has nothing due — user picks full bank or practicing every topic in the plan. */
    protected readonly showPlanTopicsCoveredDialog = signal(false);

    /** At least one topic marked studied today and session is limited to those topics. */
    protected readonly todayTopicsFilterActive = computed(
        () =>
            this.todayPlan.studiedTopicIds().length > 0 && this.practiceScope() === 'planFocused'
    );

    protected readonly showBackToTodaysTopicsOption = computed(
        () => this.todayPlan.studiedTopicIds().length > 0 && this.practiceScope() === 'full'
    );

    /** Persisted across language switches while feedback phase is showing. */
    private readonly feedbackCtx = signal<{
        rating: SelfRating;
        subtopic: string;
        category: QuestionCategory;
        nextReviewIso: string;
    } | null>(null);

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
        this.todayPlan.syncCalendarDay();

        this.questionService
            .getQuestions()
            .pipe(takeUntilDestroyed())
            .subscribe((all) => {
                if (!this.loading()) {
                    const cur = this.currentQuestion();
                    if (cur && !this.sessionComplete()) {
                        const updated = this.questionService.getQuestionByIdFromList(all, cur.id);
                        if (updated) {
                            this.currentQuestion.set(updated);
                        }
                    }
                    if (this.phase() === 'feedback' && this.feedbackCtx()) {
                        this.rebuildFeedbackSnapshot();
                    }
                }
            });

        this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe(() => {
            if (this.phase() === 'feedback' && this.feedbackCtx()) {
                this.rebuildFeedbackSnapshot();
            }
        });

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
        this.activityService.bumpQuestionsAnswered(1);
        this.activityService.addCoveredTopic(topicIdFromQuestion(q));
        const updated = this.progressService.getProgress().find((p) => p.questionId === q.id);
        const nextReviewIso = updated?.nextReview ?? new Date().toISOString();
        this.feedbackCtx.set({
            rating,
            subtopic: q.subtopic,
            category: q.category,
            nextReviewIso
        });
        this.rebuildFeedbackSnapshot();
        this.phase.set('feedback');
    }

    protected onNextQuestion(): void {
        this.advanceToNextQuestion();
    }

    protected restartSession(): void {
        this.loadQuiz();
    }

    protected switchToFullQuestionBank(): void {
        this.showPlanTopicsCoveredDialog.set(false);
        this.acceptPlanTopicFallback.set(false);
        this.practiceScope.set('full');
        this.loadQuiz();
    }

    protected switchToTodaysStudiedTopics(): void {
        this.acceptPlanTopicFallback.set(false);
        this.practiceScope.set('planFocused');
        this.loadQuiz();
    }

    /** User confirmed: practice every question in today’s studied topics (former automatic fallback). */
    protected confirmPracticePlanTopicsAnyway(): void {
        this.showPlanTopicsCoveredDialog.set(false);
        this.acceptPlanTopicFallback.set(true);
        this.loadQuiz();
    }

    private rebuildFeedbackSnapshot(): void {
        const ctx = this.feedbackCtx();
        if (!ctx) {
            return;
        }
        const headlineKey =
            ctx.rating === 'nailed'
                ? 'feedback.headlineNailed'
                : ctx.rating === 'partial'
                  ? 'feedback.headlinePartial'
                  : 'feedback.headlineWeak';
        const weakArea =
            ctx.category === 'custom' && ctx.subtopic.trim()
                ? ctx.subtopic
                : this.translate.instant(
                      ctx.subtopic.trim() ? `subtopics.${ctx.subtopic}` : `category.${ctx.category}`
                  );
        this.feedbackSnapshot.set({
            headline: this.translate.instant(headlineKey),
            scoreDelta: SCORE_BY_RATING[ctx.rating],
            weakArea,
            nextReviewLabel: this.formatNextReviewLabel(ctx.nextReviewIso)
        });
    }

    private formatNextReviewLabel(iso: string): string {
        const target = new Date(iso);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(target);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.round((d.getTime() - today.getTime()) / 86_400_000);
        if (diffDays <= 0) {
            return this.translate.instant('feedback.nextReviewToday');
        }
        if (diffDays === 1) {
            return this.translate.instant('feedback.nextReviewTomorrow');
        }
        const loc = this.translate.currentLang === 'ru' ? 'ru-RU' : 'en-US';
        return target.toLocaleDateString(loc, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    private loadQuiz(): void {
        this.loading.set(true);
        this.loadError.set(false);
        this.sessionComplete.set(false);
        this.showPlanTopicsCoveredDialog.set(false);
        this.currentQuestion.set(null);
        this.phase.set('question');
        this.feedbackSnapshot.set(null);
        this.feedbackCtx.set(null);
        this.questionService
            .getQuestions()
            .pipe(take(1))
            .subscribe({
                next: (all) => {
                    const studied = this.todayPlan.studiedTopicIds();
                    const studiedSet = new Set(studied);
                    const useTodayTopicFilter =
                        studied.length > 0 && this.practiceScope() === 'planFocused';
                    const candidate = useTodayTopicFilter
                        ? all.filter((q) => studiedSet.has(topicIdFromQuestion(q)))
                        : all;
                    const due = this.progressService.getDueQuestionsSync(candidate);
                    const fullBankMode = this.practiceScope() === 'full';
                    /** Due-only queue when focusing on today’s topics; full bank includes every question in the candidate set. */
                    const useFallback = !fullBankMode && due.length === 0;
                    const skipDialog = this.acceptPlanTopicFallback();
                    if (
                        useFallback &&
                        studied.length > 0 &&
                        candidate.length > 0 &&
                        !skipDialog
                    ) {
                        this.showPlanTopicsCoveredDialog.set(true);
                        this.usingFallbackQueue.set(false);
                        this.sessionTotal.set(0);
                        this.sessionIndex.set(0);
                        this.sessionStackTopicIds.set([]);
                        this.questionService.initializeQueue([]);
                        this.loading.set(false);
                        return;
                    }
                    if (skipDialog) {
                        this.acceptPlanTopicFallback.set(false);
                    }
                    this.usingFallbackQueue.set(useFallback);
                    const queue = fullBankMode ? candidate : useFallback ? candidate : due;
                    this.sessionTotal.set(queue.length);
                    this.sessionIndex.set(0);
                    this.sessionStackTopicIds.set(this.uniqueSortedTopicIds(queue));
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
        this.feedbackCtx.set(null);
        if (next) {
            this.sessionIndex.update((i) => i + 1);
        }
        if (!next) {
            this.sessionComplete.set(true);
        }
    }

    private uniqueSortedTopicIds(questions: Question[]): string[] {
        const ids = new Set<string>();
        for (const q of questions) {
            ids.add(topicIdFromQuestion(q));
        }
        return [...ids].sort((a, b) => a.localeCompare(b));
    }

    /** Subtopic i18n key from `category:subtopic` id. */
    protected stackSubtopicKey(topicId: string): string {
        const i = topicId.indexOf(':');
        return i >= 0 ? topicId.slice(i + 1) : topicId;
    }
}
