import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ActivityService } from '../../../../core/services/activity.service';
import { ProgressService } from '../../../../core/services/progress.service';
import { QuestionService } from '../../../../core/services/question.service';
import type { Progress } from '../../../../shared/models/progress.model';
import type { Question } from '../../../../shared/models/question.model';
import { formatLocalYmd } from '../../../../shared/utils/local-date.utils';
import { ActivityHeatmapComponent } from '../../components/activity-heatmap/activity-heatmap.component';
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
    imports: [ActivityHeatmapComponent, ProgressBarComponent, RouterLink, TranslatePipe],
    templateUrl: './dashboard-page.component.html',
    styleUrl: './dashboard-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
    private readonly progressService = inject(ProgressService);
    private readonly questionService = inject(QuestionService);
    private readonly activityService = inject(ActivityService);

    /** Illustrative bar max (10,000 h in seconds) — not a literal goal. */
    protected readonly tenKHoursSeconds = 10_000 * 3600;

    protected readonly activeTimeView = computed(() => {
        const totalSeconds = this.activityService.totalActiveSeconds();
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return { hours, minutes, totalSeconds };
    });

    protected readonly streakView = computed(() => {
        const map = this.activityService.activityMap();
        const active = new Set<string>();
        for (const row of map.values()) {
            const hasAnyActivity =
                row.questionsAnswered > 0 ||
                row.topicsStudied > 0 ||
                (row.activeSeconds ?? 0) > 0 ||
                row.coveredTopicIds.length > 0;
            if (hasAnyActivity) {
                active.add(row.date);
            }
        }

        const currentDays = this.countBackwardStreakFrom(new Date(), active);

        let bestDays = 0;
        for (const d of active) {
            const prev = this.shiftYmdByDays(d, -1);
            if (active.has(prev)) {
                continue;
            }
            let run = 1;
            let cursor = d;
            while (active.has(this.shiftYmdByDays(cursor, 1))) {
                cursor = this.shiftYmdByDays(cursor, 1);
                run += 1;
            }
            bestDays = Math.max(bestDays, run);
        }

        return { currentDays, bestDays };
    });

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

    private countBackwardStreakFrom(from: Date, activeDays: Set<string>): number {
        let n = 0;
        let cursor = formatLocalYmd(from);
        while (activeDays.has(cursor)) {
            n += 1;
            cursor = this.shiftYmdByDays(cursor, -1);
        }
        return n;
    }

    private shiftYmdByDays(ymd: string, deltaDays: number): string {
        const [yRaw, mRaw, dRaw] = ymd.split('-');
        const y = Number(yRaw);
        const m = Number(mRaw);
        const d = Number(dRaw);
        if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
            return ymd;
        }
        const dt = new Date(y, m - 1, d);
        dt.setDate(dt.getDate() + deltaDays);
        return formatLocalYmd(dt);
    }
}
