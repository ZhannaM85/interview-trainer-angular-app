import { ViewportScroller } from '@angular/common';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    Injector,
    signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { distinctUntilChanged, filter, map } from 'rxjs';

import { SociologyCatalogEditService } from '../../../../core/services/sociology-catalog-edit.service';
import { SociologyProgressService } from '../../../../core/services/sociology-progress.service';
import { SociologyQuestionService } from '../../../../core/services/sociology-question.service';
import { TodayPlanService } from '../../../../core/services/today-plan.service';
import type { SociologyQuestion } from '../../../../shared/models/sociology-question.model';
import {
    isSociologyPlanTopicId,
    sociologyPlanTopicId
} from '../../../../shared/utils/sociology-topic-key.utils';
import { SociologyQuestionEditorSheetComponent } from '../../components/sociology-question-editor-sheet/sociology-question-editor-sheet.component';
import {
    buildSociologyStudySections,
    filterSociologySectionsByPlanTopicIds,
    filterSociologySectionsBySubtopics,
    type SociologyStudySubtopicSection,
    type SociologyStudyTopicSection
} from '../../sociology-study-grouping';

type StudyQuestionPracticeHint = { kind: 'today' } | { kind: 'past'; dateStr: string };

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

@Component({
    selector: 'app-sociology-study-page',
    imports: [RouterLink, TranslatePipe, SociologyQuestionEditorSheetComponent],
    templateUrl: './sociology-study-page.component.html',
    styleUrl: './sociology-study-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SociologyStudyPageComponent {
    private readonly questionService = inject(SociologyQuestionService);
    private readonly catalogEdits = inject(SociologyCatalogEditService);
    private readonly progressService = inject(SociologyProgressService);
    protected readonly todayPlan = inject(TodayPlanService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly translate = inject(TranslateService);
    private readonly injector = inject(Injector);
    private readonly viewportScroller = inject(ViewportScroller);

    private readonly studyProgressRefresh = signal(0);

    /** Table of contents `<details>` open state (in-flow, not an overlay). */
    protected readonly tocExpanded = signal(true);

    /**
     * Per-subtopic accordion open state (sociology plan topic id: `topic|subtopic` segment form from
     * {@link sociologyPlanTopicId}).
     * If absent, default is open when not studied, closed when studied.
     */
    private readonly subtopicAccordionState = signal<ReadonlyMap<string, boolean>>(new Map());

    /**
     * Drives “Expand / collapse all”: next click collapses when `true`, expands when `false`.
     */
    private readonly accordionBulkNextIsCollapse = signal(false);

    private readonly planTodayOnly = toSignal(
        this.route.queryParamMap.pipe(
            map((m) => m.get('today') === '1'),
            distinctUntilChanged()
        ),
        { initialValue: this.route.snapshot.queryParamMap.get('today') === '1' }
    );

    private readonly topicsParam = toSignal(
        this.route.queryParamMap.pipe(
            map((m) => m.get('topics') ?? ''),
            distinctUntilChanged()
        ),
        { initialValue: this.route.snapshot.queryParamMap.get('topics') ?? '' }
    );

    private readonly topicsFilterSet = computed((): ReadonlySet<string> | null => {
        const raw = this.topicsParam().trim();
        if (!raw) {
            return null;
        }
        const parts = raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        return new Set(parts);
    });

    private readonly todayScopedTopicIds = signal<ReadonlySet<string>>(new Set());

    protected readonly showPlanCompleteBanner = signal(false);

    /** Local-only edits open in a sheet; `null` when closed. */
    protected readonly editorQuestion = signal<SociologyQuestion | null>(null);

    protected readonly questions = signal<SociologyQuestion[]>([]);
    protected readonly sections = signal<SociologyStudyTopicSection[]>([]);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    protected readonly topicsFocusActive = computed(() => this.topicsFilterSet() !== null);

    protected readonly topicsRemainingToStudySoc = computed(() =>
        this.todayPlan.topicsRemainingToStudy().filter((id) => isSociologyPlanTopicId(id))
    );

    protected readonly visibleSections = computed(() => {
        let base = this.sections();
        const filterSub = this.topicsFilterSet();
        if (filterSub) {
            base = filterSociologySectionsBySubtopics(base, filterSub);
        }
        if (this.planTodayOnly()) {
            if (this.topicsRemainingToStudySoc().length > 0) {
                const allow = this.todayScopedTopicIds();
                if (allow.size > 0) {
                    base = filterSociologySectionsByPlanTopicIds(base, allow);
                }
            }
        }
        return base;
    });

    protected readonly planTodayFilterActive = computed(() => {
        if (!this.planTodayOnly()) {
            return false;
        }
        return this.topicsRemainingToStudySoc().length > 0;
    });

    /** At least one subtopic accordion is shown (catalog loaded and not empty). */
    protected readonly hasAccordionSubtopics = computed(() => {
        for (const t of this.visibleSections()) {
            if (t.subtopics.length > 0) {
                return true;
            }
        }
        return false;
    });

    /** 1-based index per question in the visible guide (DOM order). */
    protected readonly globalOrdinalByQuestionId = computed(() => {
        const map = new Map<number, number>();
        let n = 0;
        for (const t of this.visibleSections()) {
            for (const s of t.subtopics) {
                for (const q of s.questions) {
                    n += 1;
                    map.set(q.id, n);
                }
            }
        }
        return map;
    });

    private readonly lastAnsweredIsoByQuestionId = computed(() => {
        this.studyProgressRefresh();
        const m = new Map<number, string>();
        for (const row of this.progressService.getProgress()) {
            if (row.lastAnswered) {
                m.set(row.questionId, row.lastAnswered);
            }
        }
        return m;
    });

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
                this.todayScopedTopicIds.set(
                    new Set(this.todayPlan.selectedTopicIds().filter((id) => isSociologyPlanTopicId(id)))
                );
            });

        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                if (this.router.url.includes('/sociology/study')) {
                    this.studyProgressRefresh.update((n) => n + 1);
                }
            });

        this.questionService.getQuestions().subscribe({
            next: (all) => {
                this.questions.set(all);
                this.sections.set(buildSociologyStudySections(all));
                this.loading.set(false);
                this.loadError.set(false);
            },
            error: () => {
                this.loadError.set(true);
                this.loading.set(false);
            }
        });
    }

    protected isCorrectOption(q: SociologyQuestion, optionIndex: number): boolean {
        return q.correctIndices.includes(optionIndex);
    }

    protected openQuestionEditor(q: SociologyQuestion): void {
        this.editorQuestion.set({
            ...q,
            options: [...q.options],
            correctIndices: [...q.correctIndices]
        });
    }

    protected closeQuestionEditor(): void {
        this.editorQuestion.set(null);
    }

    protected isLocallyEdited(id: number): boolean {
        return this.catalogEdits.hasOverrideFor(id);
    }

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
        topic?: SociologyStudyTopicSection,
        sub?: SociologyStudySubtopicSection
    ): void {
        event.preventDefault();
        if (topic && sub) {
            const id = sociologyPlanTopicId(topic.topic, sub.subtopic);
            this.patchSubtopicAccordion(id, true);
        }
        this.viewportScroller.scrollToAnchor(anchorId);
    }

    protected topicAccordionKey(topic: SociologyStudyTopicSection, sub: SociologyStudySubtopicSection): string {
        return sociologyPlanTopicId(topic.topic, sub.subtopic);
    }

    protected subtopicAccordionOpen(topic: SociologyStudyTopicSection, sub: SociologyStudySubtopicSection): boolean {
        const id = sociologyPlanTopicId(topic.topic, sub.subtopic);
        const m = this.subtopicAccordionState();
        if (m.has(id)) {
            return m.get(id)!;
        }
        return !this.todayPlan.isStudied(id);
    }

    protected toggleSubtopicAccordion(topic: SociologyStudyTopicSection, sub: SociologyStudySubtopicSection): void {
        const id = sociologyPlanTopicId(topic.topic, sub.subtopic);
        const open = !this.subtopicAccordionOpen(topic, sub);
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
        for (const t of this.visibleSections()) {
            for (const s of t.subtopics) {
                next.set(sociologyPlanTopicId(t.topic, s.subtopic), open);
            }
        }
        this.subtopicAccordionState.set(next);
    }

    protected showMarkStudied(topic: SociologyStudyTopicSection, sub: SociologyStudySubtopicSection): boolean {
        const id = sociologyPlanTopicId(topic.topic, sub.subtopic);
        return !this.todayPlan.isStudied(id);
    }

    protected isStudiedTopic(topic: SociologyStudyTopicSection, sub: SociologyStudySubtopicSection): boolean {
        return this.todayPlan.isStudied(sociologyPlanTopicId(topic.topic, sub.subtopic));
    }

    protected onMarkStudied(topic: SociologyStudyTopicSection, sub: SociologyStudySubtopicSection): void {
        const topicId = sociologyPlanTopicId(topic.topic, sub.subtopic);
        const remainingBefore = this.topicsRemainingToStudySoc().length;
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
            requestAnimationFrame(() => {
                requestAnimationFrame(() => this.scrollPlanCompleteBannerIntoView());
            });
            return;
        }
        const nextSub = this.findNextSubtopicAfter(topic, sub);
        if (nextSub) {
            const nextKey = sociologyPlanTopicId(nextSub.topic.topic, nextSub.sub.subtopic);
            this.patchSubtopicAccordion(nextKey, true);
            afterNextRender(
                () => {
                    this.scrollBlockStartBelowHeader(nextSub.sub.anchorId);
                },
                { injector: this.injector }
            );
        }
    }

    protected dismissPlanCompleteBanner(): void {
        this.showPlanCompleteBanner.set(false);
    }

    protected topicPracticeHint(
        topic: SociologyStudyTopicSection,
        sub: SociologyStudySubtopicSection
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

    private findNextSubtopicAfter(
        topic: SociologyStudyTopicSection,
        sub: SociologyStudySubtopicSection
    ): { topic: SociologyStudyTopicSection; sub: SociologyStudySubtopicSection } | null {
        const secs = this.visibleSections();
        let seen = false;
        for (const t of secs) {
            for (const s of t.subtopics) {
                if (seen) {
                    return { topic: t, sub: s };
                }
                if (t.topic === topic.topic && s.subtopic === sub.subtopic) {
                    seen = true;
                }
            }
        }
        return null;
    }

    private scrollBlockStartBelowHeader(elementId: string, fallbackScrollTop = 0): void {
        const el = document.getElementById(elementId);
        if (!el) {
            window.scrollTo({ top: fallbackScrollTop, behavior: 'smooth' });
            return;
        }
        const headerEl = document.querySelector('.app__header') as HTMLElement | null;
        const headerH = headerEl ? headerEl.getBoundingClientRect().height : 56;
        const gap = 12;
        const targetY = window.scrollY + el.getBoundingClientRect().top - headerH - gap;
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }

    private scrollPlanCompleteBannerIntoView(): void {
        this.scrollBlockStartBelowHeader('soc-study-plan-complete-banner', 0);
    }
}
