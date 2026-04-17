import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { SociologyActivityService } from '../../../../core/services/sociology-activity.service';
import { SociologyProgressService } from '../../../../core/services/sociology-progress.service';
import { SociologyQuestionService } from '../../../../core/services/sociology-question.service';
import type { SociologyProgress } from '../../../../shared/models/sociology-progress.model';
import type { SociologyQuestion } from '../../../../shared/models/sociology-question.model';
import { ActivityHeatmapComponent } from '../../../dashboard/components/activity-heatmap/activity-heatmap.component';
import { ProgressBarComponent } from '../../../../shared/components/progress-bar/progress-bar.component';

export interface SociologyWeakSubtopic {
    subtopic: string;
    /** How many more fully correct answers (across this subtopic) clear it from the weak list. */
    clearNeeded: number;
}

export interface SociologyDashboardStats {
    totalAttempts: number;
    totalCorrect: number;
    accuracyPct: number;
    questionsTouched: number;
    weakSubtopics: SociologyWeakSubtopic[];
}

@Component({
    selector: 'app-sociology-dashboard-page',
    imports: [ActivityHeatmapComponent, ProgressBarComponent, RouterLink, TranslatePipe],
    templateUrl: './sociology-dashboard-page.component.html',
    styleUrl: './sociology-dashboard-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SociologyDashboardPageComponent {
    private readonly questionService = inject(SociologyQuestionService);
    private readonly progressService = inject(SociologyProgressService);
    protected readonly sociologyActivity = inject(SociologyActivityService);

    private readonly questions = signal<SociologyQuestion[]>([]);
    protected readonly loadError = signal(false);

    protected readonly stats = computed(() => {
        this.progressService.progressList();
        const qs = this.questions();
        if (qs.length === 0) {
            return null;
        }
        return this.computeStats(qs, this.progressService.getProgress());
    });

    protected readonly loading = computed(
        () => !this.loadError() && this.questions().length === 0
    );

    protected readonly activeTimeView = computed(() => {
        const totalSeconds = this.sociologyActivity.totalActiveSeconds();
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const todaySeconds = this.sociologyActivity.todayActiveSeconds();
        const todayHours = Math.floor(todaySeconds / 3600);
        const todayMinutes = Math.floor((todaySeconds % 3600) / 60);
        return { hours, minutes, totalSeconds, todaySeconds, todayHours, todayMinutes };
    });

    constructor() {
        this.questionService
            .getQuestions()
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: (list) => {
                    this.questions.set(list);
                    this.loadError.set(false);
                },
                error: () => {
                    this.loadError.set(true);
                }
            });
    }

    private computeStats(
        questions: SociologyQuestion[],
        progress: SociologyProgress[]
    ): SociologyDashboardStats {
        const byId = new Map(progress.map((p) => [p.questionId, p]));
        let totalAttempts = 0;
        let totalCorrect = 0;
        let questionsTouched = 0;

        const bySubtopic = new Map<string, { attempts: number; correct: number }>();

        for (const q of questions) {
            const p = byId.get(q.id);
            if (!p || p.attempts <= 0) {
                continue;
            }
            questionsTouched += 1;
            totalAttempts += p.attempts;
            totalCorrect += p.correct;
            const agg = bySubtopic.get(q.subtopic) ?? { attempts: 0, correct: 0 };
            agg.attempts += p.attempts;
            agg.correct += p.correct;
            bySubtopic.set(q.subtopic, agg);
        }

        const accuracyPct =
            totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 1000) / 10;

        const weakSubtopics: SociologyWeakSubtopic[] = [];
        for (const [subtopic, agg] of bySubtopic) {
            // Any non–fully-correct attempt (wrong or partial) flags the subtopic so the user
            // can jump back from Progress; unlike the interview dashboard’s 3×60% rule.
            if (agg.attempts >= 1 && agg.correct < agg.attempts) {
                weakSubtopics.push({
                    subtopic,
                    clearNeeded: agg.attempts - agg.correct
                });
            }
        }
        weakSubtopics.sort((a, b) => a.subtopic.localeCompare(b.subtopic, 'ru'));

        return {
            totalAttempts,
            totalCorrect,
            accuracyPct,
            questionsTouched,
            weakSubtopics
        };
    }
}
