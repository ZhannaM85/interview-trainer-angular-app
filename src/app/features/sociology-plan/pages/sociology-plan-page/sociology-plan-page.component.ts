import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { SociologyActivityService } from '../../../../core/services/sociology-activity.service';
import { SociologyProgressService } from '../../../../core/services/sociology-progress.service';
import { SociologyQuestionService } from '../../../../core/services/sociology-question.service';
import { TodayPlanService } from '../../../../core/services/today-plan.service';
import type { SociologyQuestion } from '../../../../shared/models/sociology-question.model';
import { isSociologyPlanTopicId, sociologyPlanTopicId } from '../../../../shared/utils/sociology-topic-key.utils';
import {
    buildSociologyTopicLastStudiedHintMap,
    type TopicLastStudiedHint
} from '../../../../shared/utils/topic-last-studied.utils';
import {
    buildSociologyStudySections,
    type SociologyStudySubtopicSection,
    type SociologyStudyTopicSection
} from '../../../sociology-study/sociology-study-grouping';

@Component({
    selector: 'app-sociology-plan-page',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './sociology-plan-page.component.html',
    styleUrl: '../../../plan/pages/plan-page/plan-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SociologyPlanPageComponent {
    private readonly questionService = inject(SociologyQuestionService);
    private readonly progressService = inject(SociologyProgressService);
    private readonly sociologyActivity = inject(SociologyActivityService);
    private readonly translate = inject(TranslateService);
    private readonly router = inject(Router);
    protected readonly todayPlan = inject(TodayPlanService);

    private readonly lastStudiedRefresh = signal(0);

    protected readonly questions = signal<SociologyQuestion[]>([]);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    protected readonly sections = computed(() => buildSociologyStudySections(this.questions()));

    protected readonly topicsRemainingToStudySoc = computed(() =>
        this.todayPlan.topicsRemainingToStudy().filter((id) => isSociologyPlanTopicId(id))
    );

    protected readonly selectedTopicIdsSoc = computed(() =>
        this.todayPlan.selectedTopicIds().filter((id) => isSociologyPlanTopicId(id))
    );

    protected readonly doneTopicsSoc = computed(() =>
        this.todayPlan.studiedTopicIds().filter((id) => isSociologyPlanTopicId(id))
    );

    protected readonly topicLastStudiedById = computed(() => {
        this.lastStudiedRefresh();
        this.questions();
        this.sociologyActivity.activityMap();
        return buildSociologyTopicLastStudiedHintMap(
            this.questions(),
            this.sociologyActivity.activityMap(),
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
                if (this.router.url.includes('/sociology/plan')) {
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

    protected topicId(topic: SociologyStudyTopicSection, sub: SociologyStudySubtopicSection): string {
        return sociologyPlanTopicId(topic.topic, sub.subtopic);
    }

    protected isChecked(topic: SociologyStudyTopicSection, sub: SociologyStudySubtopicSection): boolean {
        return this.todayPlan.isSelected(this.topicId(topic, sub));
    }

    protected topicStatusKey(
        topic: SociologyStudyTopicSection,
        sub: SociologyStudySubtopicSection
    ): string | null {
        const id = this.topicId(topic, sub);
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

    protected removeAllDoneTopics(): void {
        for (const id of this.doneTopicsSoc()) {
            this.todayPlan.clearStudied(id);
        }
    }

    protected topicLastStudiedHint(
        topic: SociologyStudyTopicSection,
        sub: SociologyStudySubtopicSection
    ): TopicLastStudiedHint {
        return this.topicLastStudiedById().get(this.topicId(topic, sub)) ?? { kind: 'none' };
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

    protected sociologyPlanIdLabel(id: string): string {
        for (const t of this.sections()) {
            for (const s of t.subtopics) {
                if (this.topicId(t, s) === id) {
                    return `${t.topic} — ${s.subtopic}`;
                }
            }
        }
        return id;
    }

    protected studyGuideQueryParams(): Record<string, string> | undefined {
        return this.topicsRemainingToStudySoc().length > 0 ? { today: '1' } : undefined;
    }
}
