import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { ActivityService } from '../../../../core/services/activity.service';
import { PlanSuggestionService } from '../../../../core/services/plan-suggestion.service';
import { ProgressService } from '../../../../core/services/progress.service';
import { StorageService } from '../../../../core/services/storage.service';
import { TodayPlanService } from '../../../../core/services/today-plan.service';
import { QuestionService } from '../../../../core/services/question.service';
import type { Question } from '../../../../shared/models/question.model';
import { isSociologyPlanTopicId } from '../../../../shared/utils/sociology-topic-key.utils';
import { topicIdFromParts } from '../../../../shared/utils/topic-key.utils';
import {
    buildTopicLastStudiedDateMap,
    buildTopicLastStudiedHintMap,
    type TopicLastStudiedHint
} from '../../../../shared/utils/topic-last-studied.utils';
import { buildStudyGuideSections, type StudyCategorySection, type StudySubtopicSection } from '../../../study/study-guide-grouping';

export type PlanSortMode = 'default' | 'oldest-first' | 'newest-first';
const PLAN_SORT_STORAGE_KEY = 'plan-sort-mode';

@Component({
    selector: 'app-plan-page',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './plan-page.component.html',
    styleUrl: './plan-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanPageComponent {
    private readonly questionService = inject(QuestionService);
    private readonly progressService = inject(ProgressService);
    private readonly activityService = inject(ActivityService);
    private readonly planSuggestionService = inject(PlanSuggestionService);
    private readonly translate = inject(TranslateService);
    private readonly router = inject(Router);
    private readonly storage = inject(StorageService);
    protected readonly todayPlan = inject(TodayPlanService);

    /** Recomputes last-studied hints when locale, navigation, or stored activity/progress may have changed. */
    private readonly lastStudiedRefresh = signal(0);

    protected readonly questions = signal<Question[]>([]);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    protected readonly sortMode = signal<PlanSortMode>(
        this.storage.get<PlanSortMode>(PLAN_SORT_STORAGE_KEY) ?? 'default'
    );

    protected readonly sections = computed(() => buildStudyGuideSections(this.questions()));

    private readonly topicLastStudiedDateById = computed(() => {
        this.lastStudiedRefresh();
        return buildTopicLastStudiedDateMap(
            this.questions(),
            this.activityService.activityMap(),
            this.progressService.getProgress()
        );
    });

    protected readonly sortedSections = computed(() => {
        const secs = this.sections();
        const mode = this.sortMode();
        if (mode === 'default') return secs;
        const dateMap = this.topicLastStudiedDateById();
        return secs.map((cat) => {
            const subtopics = [...cat.subtopics].sort((a, b) => {
                const dA = dateMap.get(topicIdFromParts(cat.category, a.subtopic)) ?? null;
                const dB = dateMap.get(topicIdFromParts(cat.category, b.subtopic)) ?? null;
                if (mode === 'oldest-first') {
                    if (!dA && !dB) return a.subtopic.localeCompare(b.subtopic);
                    if (!dA) return -1;
                    if (!dB) return 1;
                    return dA.getTime() - dB.getTime();
                } else {
                    if (!dA && !dB) return a.subtopic.localeCompare(b.subtopic);
                    if (!dA) return 1;
                    if (!dB) return -1;
                    return dB.getTime() - dA.getTime();
                }
            });
            return { ...cat, subtopics };
        });
    });

    protected readonly selectedTopicIds = this.todayPlan.selectedTopicIds;
    protected readonly studiedTopicIds = this.todayPlan.studiedTopicIds;
    protected readonly topicsRemainingToStudy = this.todayPlan.topicsRemainingToStudy;

    /** Main-track plan UI excludes sociology ids (sociology has its own plan page). */
    protected readonly topicsRemainingToStudyJs = computed(() =>
        this.todayPlan.topicsRemainingToStudy().filter((id) => !isSociologyPlanTopicId(id))
    );

    protected readonly selectedTopicIdsJs = computed(() =>
        this.todayPlan.selectedTopicIds().filter((id) => !isSociologyPlanTopicId(id))
    );

    protected readonly doneTopics = computed(() => {
        return this.todayPlan.studiedTopicIds().filter((id) => !isSociologyPlanTopicId(id));
    });

    protected readonly topicLastStudiedById = computed(() => {
        this.lastStudiedRefresh();
        this.questions();
        this.activityService.activityMap();
        return buildTopicLastStudiedHintMap(
            this.questions(),
            this.activityService.activityMap(),
            this.progressService.getProgress(),
            this.translate.currentLang ?? 'en'
        );
    });

    constructor() {
        this.todayPlan.syncCalendarDay();

        this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe(() => {
            this.lastStudiedRefresh.update((n) => n + 1);
        });

        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                if (this.router.url.includes('/plan')) {
                    this.lastStudiedRefresh.update((n) => n + 1);
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

    protected topicId(cat: StudyCategorySection, sub: StudySubtopicSection): string {
        return topicIdFromParts(cat.category, sub.subtopic);
    }

    protected isChecked(cat: StudyCategorySection, sub: StudySubtopicSection): boolean {
        return this.todayPlan.isSelected(this.topicId(cat, sub));
    }

    protected labelKey(sub: StudySubtopicSection): string {
        return `subtopics.${sub.subtopic}`;
    }

    protected topicStatusKey(cat: StudyCategorySection, sub: StudySubtopicSection): string | null {
        const id = this.topicId(cat, sub);
        if (this.todayPlan.isStudied(id)) {
            return 'plan.statusInPractice';
        }
        return this.todayPlan.isSelected(id) ? 'plan.statusToStudy' : null;
    }

    protected removeRemainingTopic(id: string): void {
        this.todayPlan.toggleTopicSelected(id);
    }

    protected removeDoneTopic(id: string): void {
        this.todayPlan.clearStudied(id);
    }

    /** Unfinished topics from yesterday (JS/Angular only — sociology excluded). */
    protected readonly carryoverTopicIds = computed(() => {
        const carryover = this.todayPlan.carryoverPending();
        if (!carryover) return [];
        return carryover.topicIds.filter((id) => !isSociologyPlanTopicId(id));
    });

    protected acceptCarryover(): void {
        this.todayPlan.acceptCarryover();
    }

    protected dismissCarryover(): void {
        this.todayPlan.dismissCarryover();
    }

    protected readonly confirmRemoveAll = signal(false);

    protected requestRemoveAll(): void {
        this.confirmRemoveAll.set(true);
    }

    protected confirmRemoveAllDoneTopics(): void {
        for (const id of this.doneTopics()) {
            this.todayPlan.clearStudied(id);
        }
        this.confirmRemoveAll.set(false);
    }

    protected cancelRemoveAll(): void {
        this.confirmRemoveAll.set(false);
    }

    /**
     * Holds `'global'` or a category `anchorId` while waiting for confirmation.
     * Only one pending confirmation at a time.
     */
    protected readonly confirmMarkAllStudied = signal<string | null>(null);

    protected categorySelectedUnstudiedCount(cat: StudyCategorySection): number {
        return cat.subtopics.filter((sub) => {
            const id = this.topicId(cat, sub);
            return this.todayPlan.isSelected(id) && !this.todayPlan.isStudied(id);
        }).length;
    }

    protected requestMarkAllStudied(key: string): void {
        this.confirmMarkAllStudied.set(key);
    }

    protected confirmMarkAllStudiedTopics(): void {
        const key = this.confirmMarkAllStudied();
        if (!key) return;

        if (key === 'global') {
            for (const id of [...this.topicsRemainingToStudyJs()]) {
                this.todayPlan.markStudied(id);
            }
        } else {
            const cat = this.sections().find((c) => c.anchorId === key);
            if (cat) {
                for (const sub of cat.subtopics) {
                    const id = this.topicId(cat, sub);
                    if (this.todayPlan.isSelected(id) && !this.todayPlan.isStudied(id)) {
                        this.todayPlan.markStudied(id);
                    }
                }
            }
        }

        this.confirmMarkAllStudied.set(null);
    }

    protected cancelMarkAllStudied(): void {
        this.confirmMarkAllStudied.set(null);
    }

    protected readonly masteredTopicIds = computed(() =>
        this.progressService.getMasteredTopicIds(this.questions())
    );

    protected isMastered(cat: StudyCategorySection, sub: StudySubtopicSection): boolean {
        return this.masteredTopicIds().has(this.topicId(cat, sub));
    }

    protected topicLastStudiedHint(cat: StudyCategorySection, sub: StudySubtopicSection): TopicLastStudiedHint {
        return this.topicLastStudiedById().get(this.topicId(cat, sub)) ?? { kind: 'none' };
    }

    protected lastStudiedDateAria(hint: TopicLastStudiedHint): string {
        if (hint.kind === 'none') {
            return this.translate.instant('plan.lastStudiedNeverAria');
        }
        const dateLabel =
            hint.kind === 'today'
                ? this.translate.instant('plan.lastStudiedToday')
                : hint.dateStr;
        return this.translate.instant('plan.lastStudiedAria', { date: dateLabel });
    }

    /** Subtopic string from `category:subtopic` id. */
    protected topicSubtopicFromId(id: string): string {
        const i = id.indexOf(':');
        return i >= 0 ? id.slice(i + 1) : id;
    }

    protected isCustomTopicId(id: string): boolean {
        return id.startsWith('custom:');
    }

    /** Query params for Study guide when opening today's unread topics only. */
    protected studyGuideQueryParams(): Record<string, string> | undefined {
        return this.topicsRemainingToStudyJs().length > 0 ? { today: '1' } : undefined;
    }

    protected setSortMode(mode: PlanSortMode): void {
        this.sortMode.set(mode);
        this.storage.set(PLAN_SORT_STORAGE_KEY, mode);
    }

    /** null = not yet clicked; number = count of topics added by the last suggestion run. */
    protected readonly lastSuggestionCount = signal<number | null>(null);

    protected suggestTopics(): void {
        const alreadyHandled = [
            ...this.todayPlan.selectedTopicIds(),
            ...this.todayPlan.studiedTopicIds()
        ];
        const suggestions = this.planSuggestionService.suggestTopics(
            this.questions(),
            this.progressService.getProgress(),
            this.activityService.activityMap(),
            alreadyHandled
        );
        for (const id of suggestions) {
            if (!this.todayPlan.isSelected(id)) {
                this.todayPlan.toggleTopicSelected(id);
            }
        }
        this.lastSuggestionCount.set(suggestions.length);
    }
}
