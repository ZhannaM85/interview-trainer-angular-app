import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { ActivityService } from '../../../../core/services/activity.service';
import { ProgressService } from '../../../../core/services/progress.service';
import { TodayPlanService } from '../../../../core/services/today-plan.service';
import { QuestionService } from '../../../../core/services/question.service';
import type { Question } from '../../../../shared/models/question.model';
import { isSociologyPlanTopicId } from '../../../../shared/utils/sociology-topic-key.utils';
import { topicIdFromParts } from '../../../../shared/utils/topic-key.utils';
import {
    buildTopicLastStudiedHintMap,
    type TopicLastStudiedHint
} from '../../../../shared/utils/topic-last-studied.utils';
import { buildStudyGuideSections, type StudyCategorySection, type StudySubtopicSection } from '../../../study/study-guide-grouping';

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
    private readonly translate = inject(TranslateService);
    private readonly router = inject(Router);
    protected readonly todayPlan = inject(TodayPlanService);

    /** Recomputes last-studied hints when locale, navigation, or stored activity/progress may have changed. */
    private readonly lastStudiedRefresh = signal(0);

    protected readonly questions = signal<Question[]>([]);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    protected readonly sections = computed(() => buildStudyGuideSections(this.questions()));

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

    /** Query params for Study guide when opening today’s unread topics only. */
    protected studyGuideQueryParams(): Record<string, string> | undefined {
        return this.topicsRemainingToStudyJs().length > 0 ? { today: '1' } : undefined;
    }
}
