import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { distinctUntilChanged, filter, map, take } from 'rxjs';

import { AchievementService } from '../../../../core/services/achievement.service';
import { ActivityService } from '../../../../core/services/activity.service';
import { ProgressService, SCORE_BY_RATING } from '../../../../core/services/progress.service';
import { QuestionService } from '../../../../core/services/question.service';
import { StorageService } from '../../../../core/services/storage.service';
import { TodayPlanService } from '../../../../core/services/today-plan.service';
import type { ActiveSessionSnapshot } from '../../../../shared/models/active-session.model';
import type { Progress } from '../../../../shared/models/progress.model';
import type { Question, QuestionCategory } from '../../../../shared/models/question.model';
import { topicIdFromQuestion } from '../../../../shared/utils/topic-key.utils';
import type { SelfRating } from '../../../../shared/models/self-rating.model';
import { ProgressBarComponent } from '../../../../shared/components/progress-bar/progress-bar.component';
import { InterviewAnswerComponent } from '../../components/interview-answer/interview-answer.component';
import { InterviewFeedbackComponent } from '../../components/interview-feedback/interview-feedback.component';
import { InterviewQuestionComponent } from '../../components/interview-question/interview-question.component';
import { SelfEvaluationComponent } from '../../components/self-evaluation/self-evaluation.component';

export type QuizPhase = 'question' | 'answer' | 'feedback';
export type SessionMode = 'quick' | 'standard' | 'deep';

const SESSION_MODE_LIMIT: Record<SessionMode, number | undefined> = {
    quick: 5,
    standard: 15,
    deep: undefined
};

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

interface UndoSnapshot {
    question: Question;
    previousProgress: Progress | null;
    sessionNailed: number;
    sessionPartial: number;
    sessionDidntKnow: number;
    sessionBestStreak: number;
    streak: number;
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
    private readonly achievementService = inject(AchievementService);
    private readonly translate = inject(TranslateService);
    private readonly route = inject(ActivatedRoute);
    private readonly storage = inject(StorageService);

    /** Epoch ms when the current session started (set in startSession / resumeSession). */
    private sessionStartMs = 0;

    /** `?topics=cat:sub` — when present, restrict the session to questions in those topic IDs. */
    private readonly topicsFocusParam = toSignal(
        this.route.queryParamMap.pipe(
            map((m) => m.get('topics') ?? ''),
            distinctUntilChanged()
        ),
        { initialValue: this.route.snapshot.queryParamMap.get('topics') ?? '' }
    );

    protected readonly sessionMode = signal<SessionMode>(
        this.storage.get<SessionMode>('quiz-session-mode') ?? 'standard'
    );
    protected readonly showSessionModePicker = signal(true);
    protected readonly sessionTruncated = signal(false);

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

    protected readonly sessionNailed = signal(0);
    protected readonly sessionPartial = signal(0);
    protected readonly sessionDidntKnow = signal(0);
    protected readonly sessionBestStreak = signal(0);
    private currentStreak = 0;

    protected readonly undoSnapshot = signal<UndoSnapshot | null>(null);

    /** True when the session met the "interview ready" threshold (80%+ nailed, 10+ questions). */
    protected readonly interviewReadySession = signal(false);

    protected readonly resumeInfo = signal<{ questionNumber: number; total: number } | null>(null);

    /** Today's plan has topics selected but none marked studied yet — practice still uses full catalog. */
    protected readonly planFocusHint = computed(
        () => this.todayPlan.hasSelection() && !this.todayPlan.hasStudiedTopics()
    );

    /**
     * `planFocused` — only questions in topics marked studied today (when any exist).
     * `full` — entire catalog (same due / fallback rules as before).
     * `studiedTopics` — questions from all topics ever marked as studied (across all time).
     */
    protected readonly practiceScope = signal<'planFocused' | 'full' | 'studiedTopics'>('planFocused');

    /**
     * When today's studied topics have no due items, we used to jump straight to “all questions in those topics”.
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
        () =>
            this.todayPlan.studiedTopicIds().length > 0 &&
            (this.practiceScope() === 'full' || this.practiceScope() === 'studiedTopics')
    );

    /** Scope is restricted to ever-studied topics and there is at least one. */
    protected readonly studiedTopicsFilterActive = computed(
        () =>
            this.practiceScope() === 'studiedTopics' &&
            this.activityService.everStudiedTopicIds().size > 0
    );

    /** Show the “Practice all studied topics” button when not already in that scope and ever-studied topics exist. */
    protected readonly showSwitchToStudiedOption = computed(
        () =>
            this.practiceScope() !== 'studiedTopics' &&
            this.activityService.everStudiedTopicIds().size > 0
    );

    /** Persisted across language switches while feedback phase is showing. */
    private readonly feedbackCtx = signal<{
        rating: SelfRating;
        subtopic: string;
        category: QuestionCategory;
        nextReviewIso: string;
    } | null>(null);

    protected readonly shuffleEnabled = this.questionService.shuffleEnabled;

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
        this.checkForResumableSession();

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
    }

    @HostListener('document:keydown', ['$event'])
    protected handleKeydown(event: KeyboardEvent): void {
        if (this.showSessionModePicker() || this.showPlanTopicsCoveredDialog() || this.loading() || this.sessionComplete() || !this.currentQuestion()) {
            return;
        }
        const target = event.target as HTMLElement;
        const tag = target.tagName;
        const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
        const isInteractive = isTyping || tag === 'BUTTON' || tag === 'A';
        const ph = this.phase();

        if (ph === 'question') {
            if (!isInteractive && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                this.goToAnswer();
            } else if (!isInteractive && event.key === 'ArrowLeft' && this.undoSnapshot()) {
                event.preventDefault();
                this.onUndoRating();
            }
        } else if (ph === 'answer') {
            if (!isTyping) {
                if (event.key === '1') { event.preventDefault(); this.onSelfRated('didntKnow'); }
                else if (event.key === '2') { event.preventDefault(); this.onSelfRated('partial'); }
                else if (event.key === '3') { event.preventDefault(); this.onSelfRated('nailed'); }
            }
        } else if (ph === 'feedback') {
            if (!isInteractive && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                this.onNextQuestion();
            }
        }
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
        const previousProgress = this.progressService.getProgress().find((p) => p.questionId === q.id) ?? null;
        this.undoSnapshot.set({
            question: q,
            previousProgress,
            sessionNailed: this.sessionNailed(),
            sessionPartial: this.sessionPartial(),
            sessionDidntKnow: this.sessionDidntKnow(),
            sessionBestStreak: this.sessionBestStreak(),
            streak: this.currentStreak
        });
        this.progressService.recordSelfRating(q.id, rating);
        this.activityService.bumpQuestionsAnswered(1);
        this.activityService.addCoveredTopic(topicIdFromQuestion(q));
        if (rating === 'nailed') {
            this.sessionNailed.update((n) => n + 1);
            this.currentStreak++;
            if (this.currentStreak > this.sessionBestStreak()) {
                this.sessionBestStreak.set(this.currentStreak);
            }
        } else {
            if (rating === 'partial') { this.sessionPartial.update((n) => n + 1); }
            else { this.sessionDidntKnow.update((n) => n + 1); }
            this.currentStreak = 0;
        }
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

    protected toggleShuffle(): void {
        this.questionService.toggleShuffle();
    }

    protected startSession(mode: SessionMode): void {
        this.clearSessionSnapshot();
        this.resumeInfo.set(null);
        this.sessionMode.set(mode);
        this.storage.set('quiz-session-mode', mode);
        this.showSessionModePicker.set(false);
        this.sessionStartMs = Date.now();
        this.loadQuiz();
    }

    protected restartSession(): void {
        this.clearSessionSnapshot();
        this.resumeInfo.set(null);
        this.showSessionModePicker.set(true);
    }

    protected resumeSession(): void {
        const snap = this.storage.get<ActiveSessionSnapshot>('active-session');
        if (!snap) {
            this.dismissResume();
            return;
        }
        this.sessionMode.set(snap.sessionMode);
        this.practiceScope.set(snap.practiceScope);
        this.showSessionModePicker.set(false);
        this.loading.set(true);
        this.loadError.set(false);
        this.sessionComplete.set(false);
        this.showPlanTopicsCoveredDialog.set(false);
        this.sessionTruncated.set(false);
        this.phase.set('question');
        this.feedbackSnapshot.set(null);
        this.feedbackCtx.set(null);
        this.undoSnapshot.set(null);
        this.sessionNailed.set(snap.sessionNailed);
        this.sessionPartial.set(snap.sessionPartial);
        this.sessionDidntKnow.set(snap.sessionDidntKnow);
        this.sessionBestStreak.set(snap.sessionBestStreak);
        this.currentStreak = snap.currentStreak;
        this.sessionTotal.set(snap.sessionTotal);
        this.sessionStackTopicIds.set(snap.sessionStackTopicIds);
        this.usingFallbackQueue.set(snap.usingFallbackQueue);
        this.questionService.getQuestions().pipe(filter((qs) => qs.length > 0), take(1)).subscribe({
            next: (all) => {
                const idMap = new Map(all.map((q) => [q.id, q]));
                const queue = snap.queueIds
                    .map((id) => idMap.get(id))
                    .filter((q): q is Question => q != null);
                if (queue.length === 0 || snap.currentIndex >= queue.length) {
                    this.clearSessionSnapshot();
                    this.resumeInfo.set(null);
                    this.showSessionModePicker.set(true);
                    this.loading.set(false);
                    return;
                }
                this.questionService.restoreQueue(queue, snap.currentIndex);
                this.sessionIndex.set(snap.currentIndex);
                this.loading.set(false);
                this.advanceToNextQuestion();
            },
            error: () => {
                this.loadError.set(true);
                this.loading.set(false);
            }
        });
    }

    protected dismissResume(): void {
        this.clearSessionSnapshot();
        this.resumeInfo.set(null);
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

    protected switchToAllStudiedTopics(): void {
        this.acceptPlanTopicFallback.set(false);
        this.practiceScope.set('studiedTopics');
        this.loadQuiz();
    }

    /** User confirmed: practice every question in today's studied topics (former automatic fallback). */
    protected confirmPracticePlanTopicsAnyway(): void {
        this.showPlanTopicsCoveredDialog.set(false);
        this.acceptPlanTopicFallback.set(true);
        this.loadQuiz();
    }

    private checkForResumableSession(): void {
        const snap = this.storage.get<ActiveSessionSnapshot>('active-session');
        if (snap && snap.queueIds.length > 0 && snap.currentIndex < snap.queueIds.length) {
            this.resumeInfo.set({ questionNumber: snap.currentIndex + 1, total: snap.sessionTotal });
            this.sessionMode.set(snap.sessionMode);
        }
    }

    private saveSessionSnapshot(): void {
        const snap: ActiveSessionSnapshot = {
            queueIds: this.questionService.getQueueIds(),
            currentIndex: this.sessionIndex() - 1,
            sessionMode: this.sessionMode(),
            practiceScope: this.practiceScope(),
            topicsFocusParam: this.topicsFocusParam(),
            sessionNailed: this.sessionNailed(),
            sessionPartial: this.sessionPartial(),
            sessionDidntKnow: this.sessionDidntKnow(),
            sessionBestStreak: this.sessionBestStreak(),
            currentStreak: this.currentStreak,
            sessionTotal: this.sessionTotal(),
            sessionStackTopicIds: this.sessionStackTopicIds(),
            usingFallbackQueue: this.usingFallbackQueue(),
            savedAt: new Date().toISOString()
        };
        this.storage.set('active-session', snap);
    }

    private clearSessionSnapshot(): void {
        localStorage.removeItem('interview-trainer:active-session');
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

    protected onUndoRating(): void {
        const snap = this.undoSnapshot();
        if (!snap) {
            return;
        }
        this.progressService.revertProgress(snap.question.id, snap.previousProgress);
        this.activityService.undoQuestionsAnswered();
        this.questionService.stepBack();
        this.sessionNailed.set(snap.sessionNailed);
        this.sessionPartial.set(snap.sessionPartial);
        this.sessionDidntKnow.set(snap.sessionDidntKnow);
        this.sessionBestStreak.set(snap.sessionBestStreak);
        this.currentStreak = snap.streak;
        this.sessionIndex.update((i) => i - 1);
        this.currentQuestion.set(snap.question);
        this.feedbackSnapshot.set(null);
        this.feedbackCtx.set(null);
        this.undoSnapshot.set(null);
        this.phase.set('answer');
    }

    private loadQuiz(): void {
        this.loading.set(true);
        this.loadError.set(false);
        this.sessionComplete.set(false);
        this.showPlanTopicsCoveredDialog.set(false);
        this.sessionTruncated.set(false);
        this.currentQuestion.set(null);
        this.phase.set('question');
        this.feedbackSnapshot.set(null);
        this.feedbackCtx.set(null);
        this.undoSnapshot.set(null);
        this.sessionNailed.set(0);
        this.sessionPartial.set(0);
        this.sessionDidntKnow.set(0);
        this.sessionBestStreak.set(0);
        this.currentStreak = 0;
        this.interviewReadySession.set(false);
        this.questionService
            .getQuestions()
            .pipe(filter((qs) => qs.length > 0), take(1))
            .subscribe({
                next: (all) => {
                    const scope = this.practiceScope();
                    const topicsParam = this.topicsFocusParam();
                    const topicsFocusSet = topicsParam
                        ? new Set(topicsParam.split(',').filter(Boolean))
                        : null;
                    const base = topicsFocusSet
                        ? all.filter((q) => topicsFocusSet.has(topicIdFromQuestion(q)))
                        : all;
                    const studied = this.todayPlan.studiedTopicIds();
                    const studiedSet = new Set(studied);
                    const everStudied = this.activityService.everStudiedTopicIds();
                    const useTodayTopicFilter =
                        !topicsFocusSet && studied.length > 0 && scope === 'planFocused';
                    const useEverStudiedFilter = !topicsFocusSet && scope === 'studiedTopics';
                    const candidate = useTodayTopicFilter
                        ? base.filter((q) => studiedSet.has(topicIdFromQuestion(q)))
                        : useEverStudiedFilter
                            ? base.filter((q) => everStudied.has(topicIdFromQuestion(q)))
                            : base;
                    const due = this.progressService.getDueQuestionsSync(candidate);
                    const fullBankMode = scope === 'full';
                    /** Due-only queue when focusing on today's or ever-studied topics; full bank includes every question. */
                    const useFallback = !fullBankMode && due.length === 0;
                    const skipDialog = this.acceptPlanTopicFallback();
                    if (
                        useFallback &&
                        scope === 'planFocused' &&
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
                    let queue = fullBankMode ? candidate : useFallback ? candidate : due;
                    const limit = SESSION_MODE_LIMIT[this.sessionMode()];
                    this.sessionTruncated.set(
                        limit != null && queue.length < limit && queue.length > 0
                    );
                    // When the due queue is smaller than the session limit, pad it with
                    // non-due questions so the user always gets a full session.
                    // This prevents 1-question sessions when only a few items are due.
                    if (!fullBankMode && !useFallback && limit != null && queue.length > 0 && queue.length < limit) {
                        const queueIdSet = new Set(queue.map((q) => q.id));
                        const extras = candidate.filter((q) => !queueIdSet.has(q.id));
                        for (let i = extras.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [extras[i], extras[j]] = [extras[j], extras[i]];
                        }
                        queue = [...queue, ...extras.slice(0, limit - queue.length)];
                    }
                    const finalQueue = this.questionService.initializeQueue(queue, limit);
                    this.sessionTotal.set(finalQueue.length);
                    this.sessionIndex.set(0);
                    this.sessionStackTopicIds.set(this.uniqueSortedTopicIds(finalQueue));
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
            this.saveSessionSnapshot();
        }
        if (!next) {
            this.clearSessionSnapshot();
            this.resumeInfo.set(null);
            this.sessionComplete.set(true);
            const ready = this.achievementService.checkAndGrantSession({
                total: this.sessionTotal(),
                nailed: this.sessionNailed(),
                partial: this.sessionPartial(),
                didntKnow: this.sessionDidntKnow(),
                durationMs: this.sessionStartMs > 0 ? Date.now() - this.sessionStartMs : Infinity
            });
            this.interviewReadySession.set(ready);
        }
    }

    private uniqueSortedTopicIds(questions: Question[]): string[] {
        const ids = new Set<string>();
        for (const q of questions) {
            ids.add(topicIdFromQuestion(q));
        }
        return [...ids].sort((a, b) => a.localeCompare(b));
    }

    /** Subtopic i18n key from a `category:subtopic` id. */
    protected stackSubtopicKey(topicId: string): string {
        const i = topicId.indexOf(':');
        return i >= 0 ? topicId.slice(i + 1) : topicId;
    }
}
