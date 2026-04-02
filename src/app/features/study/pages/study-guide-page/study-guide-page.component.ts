import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { QuestionService } from '../../../../core/services/question.service';
import { AnswerBlocksComponent } from '../../../../shared/components/answer-blocks/answer-blocks.component';
import type { Question } from '../../../../shared/models/question.model';
import { buildStudyGuideSections } from '../../study-guide-grouping';

@Component({
    selector: 'app-study-guide-page',
    imports: [AnswerBlocksComponent, RouterLink],
    templateUrl: './study-guide-page.component.html',
    styleUrl: './study-guide-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudyGuidePageComponent {
    private readonly questionService = inject(QuestionService);
    private readonly viewportScroller = inject(ViewportScroller);

    protected readonly questions = signal<Question[]>([]);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    protected readonly sections = computed(() => buildStudyGuideSections(this.questions()));

    protected scrollToTocAnchor(event: MouseEvent, anchorId: string): void {
        event.preventDefault();
        this.viewportScroller.scrollToAnchor(anchorId);
    }

    constructor() {
        this.questionService
            .getQuestions()
            .pipe(take(1))
            .subscribe({
                next: (all) => {
                    this.questions.set(all);
                    this.loading.set(false);
                },
                error: () => {
                    this.loadError.set(true);
                    this.loading.set(false);
                }
            });
    }
}
