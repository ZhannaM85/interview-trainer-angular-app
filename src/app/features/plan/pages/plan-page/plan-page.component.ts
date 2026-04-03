import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { TodayPlanService } from '../../../../core/services/today-plan.service';
import { QuestionService } from '../../../../core/services/question.service';
import type { Question } from '../../../../shared/models/question.model';
import { topicIdFromParts } from '../../../../shared/utils/topic-key.utils';
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
    protected readonly todayPlan = inject(TodayPlanService);

    protected readonly questions = signal<Question[]>([]);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    protected readonly sections = computed(() => buildStudyGuideSections(this.questions()));

    protected readonly selectedTopicIds = this.todayPlan.selectedTopicIds;
    protected readonly studiedTopicIds = this.todayPlan.studiedTopicIds;
    protected readonly topicsRemainingToStudy = this.todayPlan.topicsRemainingToStudy;

    protected readonly doneTopics = computed(() => {
        const studied = new Set(this.todayPlan.studiedTopicIds());
        return this.todayPlan.selectedTopicIds().filter((id) => studied.has(id));
    });

    constructor() {
        this.todayPlan.syncCalendarDay();

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

    /** Subtopic string from `category:subtopic` id. */
    protected topicSubtopicFromId(id: string): string {
        const i = id.indexOf(':');
        return i >= 0 ? id.slice(i + 1) : id;
    }

    /** Query params for Study guide when opening today’s unread topics only. */
    protected studyGuideQueryParams(): Record<string, string> | undefined {
        return this.todayPlan.topicsRemainingToStudy().length > 0 ? { today: '1' } : undefined;
    }
}
