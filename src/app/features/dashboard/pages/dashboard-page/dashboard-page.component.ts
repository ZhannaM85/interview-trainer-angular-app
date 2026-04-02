import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ProgressService } from '../../../../core/services/progress.service';
import { QuestionService } from '../../../../core/services/question.service';
import type { Progress } from '../../../../shared/models/progress.model';
import type { Question } from '../../../../shared/models/question.model';
import { ProgressBarComponent } from '../../../../shared/components/progress-bar/progress-bar.component';

export interface DashboardStats {
    totalAnswered: number;
    accuracyPct: number;
    confidencePct: number;
    /** Subtopics that need work (nailed rate below 60% with 3+ attempts). */
    weakTopics: string[];
    /** Same list as `weakTopics` — kept for template compatibility. */
    weakCategories: string[];
}

@Component({
    selector: 'app-dashboard-page',
    imports: [ProgressBarComponent, RouterLink, TranslatePipe],
    templateUrl: './dashboard-page.component.html',
    styleUrl: './dashboard-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
    private readonly progressService = inject(ProgressService);
    private readonly questionService = inject(QuestionService);

    protected readonly stats = signal<DashboardStats | null>(null);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    constructor() {
        this.questionService
            .getQuestions()
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: (questions) => {
                    const progress = this.progressService.getProgress();
                    this.stats.set(this.computeStats(questions, progress));
                    this.loading.set(false);
                    this.loadError.set(false);
                },
                error: () => {
                    this.loadError.set(true);
                    this.loading.set(false);
                }
            });
    }

    private computeStats(questions: Question[], progress: Progress[]): DashboardStats {
        const byId = new Map(progress.map((p) => [p.questionId, p]));
        let totalNailed = 0;
        let totalPartial = 0;
        let totalDidnt = 0;
        const bySubtopic = new Map<string, { attempts: number; nailed: number }>();

        for (const q of questions) {
            const p = byId.get(q.id);
            if (!p) {
                continue;
            }
            const nailed = p.nailedCount ?? 0;
            const partial = p.partialCount ?? 0;
            const didnt = p.didntKnowCount ?? 0;
            const attempts = nailed + partial + didnt;
            if (attempts === 0) {
                continue;
            }
            totalNailed += nailed;
            totalPartial += partial;
            totalDidnt += didnt;
            const key = q.subtopic || q.category;
            const agg = bySubtopic.get(key) ?? { attempts: 0, nailed: 0 };
            agg.attempts += attempts;
            agg.nailed += nailed;
            bySubtopic.set(key, agg);
        }

        const totalRatings = totalNailed + totalPartial + totalDidnt;
        /** Share of ratings where you chose “Nailed it”. */
        const accuracyPct =
            totalRatings === 0 ? 0 : Math.round((totalNailed / totalRatings) * 1000) / 10;
        /** Weighted performance: partial counts half. */
        const confidencePct =
            totalRatings === 0
                ? 0
                : Math.round(((totalNailed + 0.5 * totalPartial) / totalRatings) * 1000) / 10;

        const weakTopics: string[] = [];
        for (const [subtopic, agg] of bySubtopic) {
            if (agg.attempts >= 3 && agg.nailed / agg.attempts < 0.6) {
                weakTopics.push(subtopic);
            }
        }
        weakTopics.sort((a, b) => a.localeCompare(b));

        return {
            totalAnswered: totalRatings,
            accuracyPct,
            confidencePct,
            weakTopics,
            weakCategories: weakTopics
        };
    }
}
