import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { take } from 'rxjs';

import { ProgressService } from '../../../../core/services/progress.service';
import { QuestionService } from '../../../../core/services/question.service';
import type { Progress } from '../../../../shared/models/progress.model';
import type { Question } from '../../../../shared/models/question.model';
import { ProgressBarComponent } from '../../../../shared/components/progress-bar/progress-bar.component';

export interface DashboardStats {
    totalAnswered: number;
    accuracyPct: number;
    weakCategories: string[];
}

@Component({
    selector: 'app-dashboard-page',
    imports: [ProgressBarComponent],
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
            .pipe(take(1))
            .subscribe({
                next: (questions) => {
                    const progress = this.progressService.getProgress();
                    this.stats.set(this.computeStats(questions, progress));
                    this.loading.set(false);
                },
                error: () => {
                    this.loadError.set(true);
                    this.loading.set(false);
                }
            });
    }

    private computeStats(questions: Question[], progress: Progress[]): DashboardStats {
        const byId = new Map(progress.map((p) => [p.questionId, p]));
        let totalCorrect = 0;
        let totalAttempts = 0;
        const byCategory = new Map<string, { attempts: number; correct: number }>();

        for (const q of questions) {
            const p = byId.get(q.id);
            const correct = p?.correctCount ?? 0;
            const incorrect = p?.incorrectCount ?? 0;
            const attempts = correct + incorrect;
            if (attempts === 0) {
                continue;
            }
            totalCorrect += correct;
            totalAttempts += attempts;
            const agg = byCategory.get(q.category) ?? { attempts: 0, correct: 0 };
            agg.attempts += attempts;
            agg.correct += correct;
            byCategory.set(q.category, agg);
        }

        const weakCategories: string[] = [];
        for (const [category, agg] of byCategory) {
            if (agg.attempts >= 3 && agg.correct / agg.attempts < 0.6) {
                weakCategories.push(category);
            }
        }
        weakCategories.sort();

        const accuracyPct =
            totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 1000) / 10;

        return {
            totalAnswered: totalAttempts,
            accuracyPct,
            weakCategories
        };
    }
}
