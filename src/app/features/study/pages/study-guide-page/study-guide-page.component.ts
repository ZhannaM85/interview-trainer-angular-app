import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { distinctUntilChanged, filter, map } from 'rxjs';

import { ProgressService } from '../../../../core/services/progress.service';
import { TodayPlanService } from '../../../../core/services/today-plan.service';
import { QuestionService } from '../../../../core/services/question.service';
import { AnswerBlocksComponent } from '../../../../shared/components/answer-blocks/answer-blocks.component';
import { SplitQuestionCodePipe } from '../../../../shared/pipes/split-question-code.pipe';
import type { Question } from '../../../../shared/models/question.model';
import { topicIdFromParts } from '../../../../shared/utils/topic-key.utils';
import {
    buildStudyGuideSections,
    filterStudyGuideSectionsByTopicIds,
    filterStudyGuideSectionsWithoutPractice,
    type StudyCategorySection,
    type StudySubtopicSection
} from '../../study-guide-grouping';

/** Shown next to a question when it was answered in Practice (self-rating). */
type StudyQuestionPracticeHint =
    | { kind: 'today' }
    | { kind: 'past'; dateStr: string };

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

@Component({
    selector: 'app-study-guide-page',
    imports: [AnswerBlocksComponent, RouterLink, SplitQuestionCodePipe, TranslatePipe],
    templateUrl: './study-guide-page.component.html',
    styleUrl: './study-guide-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudyGuidePageComponent {
    private readonly questionService = inject(QuestionService);
    private readonly progressService = inject(ProgressService);
    protected readonly todayPlan = inject(TodayPlanService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly translate = inject(TranslateService);
    private readonly viewportScroller = inject(ViewportScroller);

    /** Bumps when returning to this page so practice progress is re-read from storage. */
    private readonly studyProgressRefresh = signal(0);

    /** `?today=1` — show only subtopics still “to study” in today’s plan. */
    private readonly planTodayOnly = toSignal(
        this.route.queryParamMap.pipe(
            map((m) => m.get('today') === '1'),
            distinctUntilChanged()
        ),
        { initialValue: this.route.snapshot.queryParamMap.get('today') === '1' }
    );

    protected readonly questions = signal<Question[]>([]);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    /** Table of contents `<details>` open state (collapsible; in-flow, not an overlay). */
    protected readonly tocExpanded = signal(true);

    /** Shown after marking the last topic in today’s plan as studied. */
    protected readonly showPlanCompleteBanner = signal(false);

    /**
     * Per-topic accordion open state (`category:subtopic` id).
     * If absent, default is open when not studied, closed when studied.
     */
    private readonly subtopicAccordionState = signal<ReadonlyMap<string, boolean>>(new Map());

    /**
     * Drives the single “Expand / collapse all” control: next click collapses when `true`, expands when `false`.
     */
    private readonly accordionBulkNextIsCollapse = signal(false);

    /** Show only subtopics where no question has been answered in Practice yet. */
    protected readonly showUntouchedOnly = signal(false);

    /**
     * Topic ids captured when entering `?today=1`.
     * Keeps the "today list" stable even after marking items as studied (which unselects them in Plan).
     */
    private readonly todayScopedTopicIds = signal<ReadonlySet<string>>(new Set());

    private readonly practicedQuestionIds = computed(() => {
        this.studyProgressRefresh();
        const ids = new Set<number>();
        for (const row of this.progressService.getProgress()) {
            const attempts =
                (row.nailedCount ?? 0) + (row.partialCount ?? 0) + (row.didntKnowCount ?? 0);
            if (attempts > 0) {
                ids.add(row.questionId);
            }
        }
        return ids;
    });

    protected readonly sections = computed(() => {
        let all = buildStudyGuideSections(this.questions());
        if (this.planTodayOnly()) {
            /**
             * In `?today=1`, while there are still topics left from today's plan,
             * show only topics captured when entering today's plan mode.
             * Once today's plan is fully completed, show the full guide again.
             */
            if (this.todayPlan.topicsRemainingToStudy().length > 0) {
                const allow = this.todayScopedTopicIds();
                if (allow.size > 0) {
                    all = filterStudyGuideSectionsByTopicIds(all, allow);
                }
            }
        }
        if (this.showUntouchedOnly()) {
            all = filterStudyGuideSectionsWithoutPractice(all, this.practicedQuestionIds());
        }
        return all;
    });

    protected readonly planTodayFilterActive = computed(() => {
        if (!this.planTodayOnly()) {
            return false;
        }
        return this.todayPlan.topicsRemainingToStudy().length > 0;
    });

    /** At least one subtopic accordion is shown (guide loaded and not empty). */
    protected readonly hasAccordionSubtopics = computed(() => {
        for (const cat of this.sections()) {
            if (cat.subtopics.length > 0) {
                return true;
            }
        }
        return false;
    });

    /** 1-based index per question in the visible guide (order matches DOM; total count across all topics). */
    protected readonly globalOrdinalByQuestionId = computed(() => {
        const map = new Map<number, number>();
        let n = 0;
        for (const cat of this.sections()) {
            for (const sub of cat.subtopics) {
                for (const q of sub.questions) {
                    n += 1;
                    map.set(q.id, n);
                }
            }
        }
        return map;
    });

    private readonly lastAnsweredIsoByQuestionId = computed(() => {
        this.studyProgressRefresh();
        this.questions();
        const m = new Map<number, string>();
        for (const row of this.progressService.getProgress()) {
            if (row.lastAnswered) {
                m.set(row.questionId, row.lastAnswered);
            }
        }
        return m;
    });

    protected onTocShellToggle(event: Event): void {
        const el = event.currentTarget as HTMLDetailsElement | null;
        if (!el || el.tagName !== 'DETAILS') {
            return;
        }
        this.tocExpanded.set(el.open);
    }

    protected scrollToTocAnchor(
        event: MouseEvent,
        anchorId: string,
        cat?: StudyCategorySection,
        sub?: StudySubtopicSection
    ): void {
        event.preventDefault();
        if (cat && sub) {
            const id = topicIdFromParts(cat.category, sub.subtopic);
            this.patchSubtopicAccordion(id, true);
        }
        this.viewportScroller.scrollToAnchor(anchorId);
    }

    protected showMarkStudied(cat: StudyCategorySection, sub: StudySubtopicSection): boolean {
        const id = topicIdFromParts(cat.category, sub.subtopic);
        return !this.todayPlan.isStudied(id);
    }

    protected isStudiedTopic(cat: StudyCategorySection, sub: StudySubtopicSection): boolean {
        return this.todayPlan.isStudied(topicIdFromParts(cat.category, sub.subtopic));
    }

    protected topicAccordionKey(cat: StudyCategorySection, sub: StudySubtopicSection): string {
        return topicIdFromParts(cat.category, sub.subtopic);
    }

    protected subtopicAccordionOpen(cat: StudyCategorySection, sub: StudySubtopicSection): boolean {
        const id = topicIdFromParts(cat.category, sub.subtopic);
        const m = this.subtopicAccordionState();
        if (m.has(id)) {
            return m.get(id)!;
        }
        return !this.todayPlan.isStudied(id);
    }

    protected toggleSubtopicAccordion(cat: StudyCategorySection, sub: StudySubtopicSection): void {
        const id = topicIdFromParts(cat.category, sub.subtopic);
        const open = !this.subtopicAccordionOpen(cat, sub);
        this.patchSubtopicAccordion(id, open);
    }

    private patchSubtopicAccordion(topicKey: string, open: boolean): void {
        const next = new Map(this.subtopicAccordionState());
        next.set(topicKey, open);
        this.subtopicAccordionState.set(next);
    }

    protected toggleExpandCollapseAll(): void {
        const collapse = this.accordionBulkNextIsCollapse();
        this.setAllSubtopicAccordions(!collapse);
        this.accordionBulkNextIsCollapse.update((v) => !v);
    }

    private setAllSubtopicAccordions(open: boolean): void {
        const next = new Map(this.subtopicAccordionState());
        for (const cat of this.sections()) {
            for (const sub of cat.subtopics) {
                next.set(topicIdFromParts(cat.category, sub.subtopic), open);
            }
        }
        this.subtopicAccordionState.set(next);
    }

    protected onMarkStudied(cat: StudyCategorySection, sub: StudySubtopicSection): void {
        const topicId = topicIdFromParts(cat.category, sub.subtopic);
        const remainingBefore = this.todayPlan.topicsRemainingToStudy().length;
        if (this.planTodayOnly()) {
            const next = new Set(this.todayScopedTopicIds());
            next.add(topicId);
            this.todayScopedTopicIds.set(next);
        }
        if (!this.todayPlan.isSelected(topicId)) {
            this.todayPlan.toggleTopicSelected(topicId);
        }
        this.todayPlan.markStudied(topicId);
        this.patchSubtopicAccordion(topicId, false);
        if (remainingBefore === 1) {
            this.showPlanCompleteBanner.set(true);
        }
    }

    protected dismissPlanCompleteBanner(): void {
        this.showPlanCompleteBanner.set(false);
    }

    protected toggleUntouchedFilter(checked: boolean): void {
        this.showUntouchedOnly.set(checked);
    }

    /**
     * Latest practice in this subtopic (max `lastAnswered` across its questions).
     */
    protected topicPracticeHint(
        cat: StudyCategorySection,
        sub: StudySubtopicSection
    ): StudyQuestionPracticeHint | null {
        const map = this.lastAnsweredIsoByQuestionId();
        let bestIso: string | null = null;
        for (const q of sub.questions) {
            const iso = map.get(q.id);
            if (iso && (!bestIso || iso > bestIso)) {
                bestIso = iso;
            }
        }
        if (!bestIso) {
            return null;
        }
        const d = new Date(bestIso);
        if (Number.isNaN(d.getTime())) {
            return null;
        }
        const now = new Date();
        if (isSameLocalCalendarDay(d, now)) {
            return { kind: 'today' };
        }
        return { kind: 'past', dateStr: this.formatShortPracticeDate(d) };
    }

    /**
     * From quiz `lastAnswered`: “practiced today” vs short “last practice” date (per question).
     */
    protected questionPracticeHint(questionId: number): StudyQuestionPracticeHint | null {
        const iso = this.lastAnsweredIsoByQuestionId().get(questionId);
        if (!iso) {
            return null;
        }
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) {
            return null;
        }
        const now = new Date();
        if (isSameLocalCalendarDay(d, now)) {
            return { kind: 'today' };
        }
        return { kind: 'past', dateStr: this.formatShortPracticeDate(d) };
    }

    private formatShortPracticeDate(d: Date): string {
        const lang = this.translate.currentLang?.toLowerCase().startsWith('ru') ? 'ru-RU' : 'en-GB';
        const now = new Date();
        const opts: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'short'
        };
        if (d.getFullYear() !== now.getFullYear()) {
            opts.year = 'numeric';
        }
        return d.toLocaleDateString(lang, opts);
    }

    constructor() {
        this.todayPlan.syncCalendarDay();

        this.route.queryParamMap
            .pipe(
                map((m) => m.get('today') === '1'),
                distinctUntilChanged(),
                takeUntilDestroyed()
            )
            .subscribe((todayOnly) => {
                if (!todayOnly) {
                    this.todayScopedTopicIds.set(new Set());
                    return;
                }
                this.todayScopedTopicIds.set(new Set(this.todayPlan.selectedTopicIds()));
            });

        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                if (this.router.url.includes('study')) {
                    this.studyProgressRefresh.update((n) => n + 1);
                }
            });

        this.questionService
            .getQuestions()
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: (all) => {
                    this.questions.set(all);
                    this.loading.set(false);
                    this.loadError.set(false);
                },
                error: () => {
                    this.loadError.set(true);
                    this.loading.set(false);
                }
            });
    }
}
