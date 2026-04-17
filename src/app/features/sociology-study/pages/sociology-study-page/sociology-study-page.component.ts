import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { distinctUntilChanged, map } from 'rxjs';

import { SociologyQuestionService } from '../../../../core/services/sociology-question.service';
import type { SociologyQuestion } from '../../../../shared/models/sociology-question.model';
import {
    buildSociologyStudySections,
    filterSociologySectionsBySubtopics,
    type SociologyStudyTopicSection
} from '../../sociology-study-grouping';

@Component({
    selector: 'app-sociology-study-page',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './sociology-study-page.component.html',
    styleUrl: './sociology-study-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SociologyStudyPageComponent {
    private readonly questionService = inject(SociologyQuestionService);
    private readonly route = inject(ActivatedRoute);

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

    protected readonly topicsFocusActive = computed(() => this.topicsFilterSet() !== null);

    protected readonly questions = signal<SociologyQuestion[]>([]);
    protected readonly sections = signal<SociologyStudyTopicSection[]>([]);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    protected readonly visibleSections = computed(() => {
        const base = this.sections();
        const filter = this.topicsFilterSet();
        if (!filter) {
            return base;
        }
        return filterSociologySectionsBySubtopics(base, filter);
    });

    constructor() {
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
}
