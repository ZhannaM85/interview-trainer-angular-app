import { ViewportScroller } from '@angular/common';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';

import { TodayPlanService } from '../../../../core/services/today-plan.service';
import { QuestionService } from '../../../../core/services/question.service';
import { AnswerBlocksComponent } from '../../../../shared/components/answer-blocks/answer-blocks.component';
import type { Question } from '../../../../shared/models/question.model';
import { topicIdFromParts } from '../../../../shared/utils/topic-key.utils';
import { buildStudyGuideSections, type StudyCategorySection, type StudySubtopicSection } from '../../study-guide-grouping';

@Component({
    selector: 'app-study-guide-page',
    imports: [AnswerBlocksComponent, RouterLink, TranslatePipe],
    templateUrl: './study-guide-page.component.html',
    styleUrl: './study-guide-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudyGuidePageComponent {
    private readonly questionService = inject(QuestionService);
    protected readonly todayPlan = inject(TodayPlanService);
    private readonly viewportScroller = inject(ViewportScroller);
    private readonly destroyRef = inject(DestroyRef);

    /** Matches `study__layout` two-column breakpoint. */
    private readonly viewportWide = signal(false);

    protected readonly questions = signal<Question[]>([]);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    /** Collapsed on mobile by default; always expanded on wide viewports. */
    protected readonly tocOpen = signal(false);

    protected readonly sections = computed(() => buildStudyGuideSections(this.questions()));

    protected onTocToggle(event: Event): void {
        const el = event.target as HTMLDetailsElement;
        if (this.viewportWide()) {
            if (!el.open) {
                el.open = true;
            }
            this.tocOpen.set(true);
            return;
        }
        this.tocOpen.set(el.open);
    }

    protected scrollToTocAnchor(event: MouseEvent, anchorId: string): void {
        event.preventDefault();
        this.viewportScroller.scrollToAnchor(anchorId);
        if (!this.viewportWide()) {
            this.tocOpen.set(false);
        }
    }

    protected showMarkStudied(cat: StudyCategorySection, sub: StudySubtopicSection): boolean {
        const id = topicIdFromParts(cat.category, sub.subtopic);
        return this.todayPlan.isSelected(id) && !this.todayPlan.isStudied(id);
    }

    protected onMarkStudied(cat: StudyCategorySection, sub: StudySubtopicSection): void {
        this.todayPlan.markStudied(topicIdFromParts(cat.category, sub.subtopic));
    }

    constructor() {
        this.todayPlan.syncCalendarDay();

        afterNextRender(() => {
            const mq = window.matchMedia('(min-width: 900px)');
            const sync = (): void => {
                const wide = mq.matches;
                this.viewportWide.set(wide);
                if (wide) {
                    this.tocOpen.set(true);
                } else {
                    this.tocOpen.set(false);
                }
            };
            sync();
            mq.addEventListener('change', sync);
            this.destroyRef.onDestroy(() => mq.removeEventListener('change', sync));
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
