import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { take } from 'rxjs';

import { SociologyActivityService } from '../../../../core/services/sociology-activity.service';
import { SociologyProgressService } from '../../../../core/services/sociology-progress.service';
import { SociologyQuestionService } from '../../../../core/services/sociology-question.service';
import { TodayPlanService } from '../../../../core/services/today-plan.service';
import type { SociologyQuestion } from '../../../../shared/models/sociology-question.model';
import type { SelfRating } from '../../../../shared/models/self-rating.model';
import {
    isSociologyPlanTopicId,
    sociologyPlanTopicId
} from '../../../../shared/utils/sociology-topic-key.utils';
import { evaluateSociologySelection } from '../../../../shared/utils/sociology-answer.utils';
import type { SociologyOutcome } from '../../../../shared/utils/sociology-answer.utils';

export type SociologyQuizPhase = 'question' | 'feedback';

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
    private readonly sociologyActivity = inject(SociologyActivityService);
    private readonly todayPlan = inject(TodayPlanService);

    protected readonly phase = signal<SociologyQuizPhase>('question');
    protected readonly currentQuestion = signal<SociologyQuestion | null>(null);
    protected readonly selectedIndices = signal<number[]>([]);
    protected readonly outcome = signal<SociologyOutcome | null>(null);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);
    protected readonly sessionComplete = signal(false);
    protected readonly sessionIndex = signal(0);
    protected readonly sessionTotal = signal(0);
    protected readonly usingFallbackQueue = signal(false);
    protected readonly sessionStackTopicIds = signal<string[]>([]);
    private readonly sessionCatalog = signal<SociologyQuestion[]>([]);

    private readonly acceptPlanTopicFallback = signal(false);
    protected readonly showPlanTopicsCoveredDialog = signal(false);

    protected readonly practiceScope = signal<'planFocused' | 'full'>('planFocused');

    protected readonly studiedSocIds = computed(() =>
        this.todayPlan.studiedTopicIds().filter((id) => isSociologyPlanTopicId(id))
    );

    protected readonly hasSocSelection = computed(() =>
        this.todayPlan.selectedTopicIds().some((id) => isSociologyPlanTopicId(id))
    );

    protected readonly planFocusHint = computed(
        () => this.hasSocSelection() && this.studiedSocIds().length === 0
    );

    protected readonly todayTopicsFilterActive = computed(
        () => this.studiedSocIds().length > 0 && this.practiceScope() === 'planFocused'
    );

    protected readonly showBackToTodaysTopicsOption = computed(
        () => this.studiedSocIds().length > 0 && this.practiceScope() === 'full'
    );

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
        this.todayPlan.syncCalendarDay();

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

        this.loadQuiz();
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
        this.phase.set('feedback');
    }

    protected nextQuestion(): void {
        const q = this.currentQuestion();
        const o = this.outcome();
        if (!q || !o || this.phase() !== 'feedback') {
            return;
        }
        this.progressService.recordAnswer(q.id, o);
        this.sociologyActivity.bumpQuestionsAnswered(1);
        this.sociologyActivity.addCoveredTopic(sociologyPlanTopicId(q.topic, q.subtopic));
        const rating: SelfRating =
            o === 'correct' ? 'nailed' : o === 'partial' ? 'partial' : 'didntKnow';
        this.sociologyActivity.recordPracticeRating(q.id, rating);

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

    protected confirmPracticePlanTopicsAnyway(): void {
        this.showPlanTopicsCoveredDialog.set(false);
        this.acceptPlanTopicFallback.set(true);
        this.loadQuiz();
    }

    protected sociologyStackTopicLabel(planId: string): string {
        for (const q of this.sessionCatalog()) {
            if (sociologyPlanTopicId(q.topic, q.subtopic) === planId) {
                return `${q.topic} — ${q.subtopic}`;
            }
        }
        return planId;
    }

    private loadQuiz(): void {
        this.loading.set(true);
        this.loadError.set(false);
        this.sessionComplete.set(false);
        this.showPlanTopicsCoveredDialog.set(false);
        this.phase.set('question');
        this.selectedIndices.set([]);
        this.outcome.set(null);
        this.questionService.resetQueue();
        this.questionService
            .getQuestions()
            .pipe(take(1))
            .subscribe({
                next: (all) => {
                    this.sessionCatalog.set(all);
                    const studied = this.studiedSocIds();
                    const studiedSet = new Set(studied);
                    const useTodayTopicFilter =
                        studied.length > 0 && this.practiceScope() === 'planFocused';
                    const candidate = useTodayTopicFilter
                        ? all.filter((q) => studiedSet.has(sociologyPlanTopicId(q.topic, q.subtopic)))
                        : all;
                    const due = this.progressService.getDueQuestionsSync(candidate);
                    const fullBankMode = this.practiceScope() === 'full';
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
                    this.sessionStackTopicIds.set(this.uniqueSortedPlanTopicIds(queue));
                    this.questionService.initializeQueue(queue);
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

    private uniqueSortedPlanTopicIds(questions: SociologyQuestion[]): string[] {
        const ids = new Set<string>();
        for (const q of questions) {
            ids.add(sociologyPlanTopicId(q.topic, q.subtopic));
        }
        return [...ids].sort((a, b) => a.localeCompare(b));
    }
}
