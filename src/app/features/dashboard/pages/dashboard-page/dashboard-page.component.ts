import {
    ChangeDetectionStrategy,
    Component,
    HostListener,
    computed,
    inject,
    signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { ActivityService } from '../../../../core/services/activity.service';
import type { DailyActivity } from '../../../../shared/models/activity.model';
import type { PracticeRatingBreakdown } from '../../../../core/services/activity.service';
import { DataExportService } from '../../../../core/services/data-export.service';
import type { AppBackup, BackupDiff } from '../../../../core/services/data-export.service';
import { ProgressService } from '../../../../core/services/progress.service';
import { QuestionService } from '../../../../core/services/question.service';
import type { Progress } from '../../../../shared/models/progress.model';
import type { Question } from '../../../../shared/models/question.model';
import { formatLocalYmd } from '../../../../shared/utils/local-date.utils';
import { topicIdFromParts } from '../../../../shared/utils/topic-key.utils';
import { ActivityHeatmapComponent } from '../../components/activity-heatmap/activity-heatmap.component';
import { TrendChartComponent } from '../../components/trend-chart/trend-chart.component';
import { ProgressBarComponent } from '../../../../shared/components/progress-bar/progress-bar.component';

export interface WeakTopic {
    id: string;
    /** Minimum "Nailed it" ratings (assuming every future attempt is nailed) to reach 60%. */
    nailedNeeded: number;
}

export interface TopicStrengthEntry {
    id: string;
    category: string;
    subtopic: string;
    nailedPct: number;
    nailed: number;
    partial: number;
    didntKnow: number;
    total: number;
}

export interface DashboardStats {
    totalAnswered: number;
    accuracyPct: number;
    confidencePct: number;
    /** `category:subtopic` ids that need work (nailed rate below 60% with 3+ attempts). */
    weakTopics: WeakTopic[];
    /** Same list as `weakTopics` — kept for template compatibility. */
    weakCategories: string[];
}

@Component({
    selector: 'app-dashboard-page',
    imports: [ActivityHeatmapComponent, TrendChartComponent, ProgressBarComponent, RouterLink, TranslatePipe],
    templateUrl: './dashboard-page.component.html',
    styleUrl: './dashboard-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
    private readonly progressService = inject(ProgressService);
    private readonly questionService = inject(QuestionService);
    private readonly activityService = inject(ActivityService);
    private readonly dataExportService = inject(DataExportService);

    /** Inline help for Accuracy / Confidence (tap icon on mobile; hover title still works on desktop). */
    protected readonly openMetricHelp = signal<'accuracy' | 'confidence' | null>(null);

    /** Illustrative bar max (10,000 h in seconds) — not a literal goal. */
    protected readonly tenKHoursSeconds = 10_000 * 3600;

    protected readonly activeTimeView = computed(() => {
        const totalSeconds = this.activityService.totalActiveSeconds();
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const todaySeconds = this.activityService.todayActiveSeconds();
        const todayHours = Math.floor(todaySeconds / 3600);
        const todayMinutes = Math.floor((todaySeconds % 3600) / 60);
        return { hours, minutes, totalSeconds, todaySeconds, todayHours, todayMinutes };
    });

    protected readonly longerThanYesterday = computed(() => {
        const map = this.activityService.activityMap();
        const todayYmd = formatLocalYmd(new Date());
        const yesterdayYmd = this.shiftYmdByDays(todayYmd, -1);
        const todaySeconds = Math.max(0, map.get(todayYmd)?.activeSeconds ?? 0);
        const yesterdaySeconds = Math.max(0, map.get(yesterdayYmd)?.activeSeconds ?? 0);
        return todaySeconds > 0 && todaySeconds > yesterdaySeconds;
    });

    protected readonly streakView = computed(() => {
        const map = this.activityService.activityMap();
        const active = new Set<string>();
        for (const row of map.values()) {
            // Match Activity heatmap: a “lit” day is practice answers or topics marked studied.
            // Do not count foreground time alone (`activeSeconds`) — that caused streaks to grow
            // across gaps that look empty on the grid.
            if (this.dayHasPracticeOrStudyForStreak(row)) {
                active.add(row.date);
            }
        }

        const todayYmd = formatLocalYmd(new Date());
        const startYmd = active.has(todayYmd) ? todayYmd : this.shiftYmdByDays(todayYmd, -1);
        const currentDays = this.countBackwardStreakFrom(startYmd, active);

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

    /** Self-rating buckets: today / all days (best per question per day) stay in sync with activity storage. */
    protected readonly practiceRatingsView = computed(() => {
        this.activityService.activityMap();
        return {
            today: this.activityService.todayPracticeRatingBreakdown(),
            allDaysBest: this.activityService.aggregatePracticeRatingBreakdown(),
            everyAttempt: this.lifetimeAttemptsBreakdown()
        };
    });

    protected readonly stats = signal<DashboardStats | null>(null);
    protected readonly loading = signal(true);
    protected readonly loadError = signal(false);

    protected readonly importPending = signal<AppBackup | null>(null);
    protected readonly importDiff = computed<BackupDiff | null>(() => {
        const pending = this.importPending();
        return pending ? this.dataExportService.diffBackup(pending) : null;
    });
    protected readonly importError = signal(false);

    private readonly questionsSignal = signal<Question[]>([]);

    protected readonly bestTopicsView = computed((): TopicStrengthEntry[] => {
        const qs = this.questionsSignal();
        if (qs.length === 0) {
            return [];
        }
        const idToTopic = new Map<string, string>();
        for (const q of qs) {
            idToTopic.set(String(q.id), topicIdFromParts(q.category, q.subtopic));
        }
        const byTopic = new Map<string, { nailed: number; partial: number; didntKnow: number }>();
        for (const row of this.activityService.activityMap().values()) {
            if (!row.practiceRatingBest) {
                continue;
            }
            for (const [qId, rating] of Object.entries(row.practiceRatingBest)) {
                const topicId = idToTopic.get(qId);
                if (!topicId) {
                    continue;
                }
                const agg = byTopic.get(topicId) ?? { nailed: 0, partial: 0, didntKnow: 0 };
                if (rating === 'nailed') {
                    agg.nailed++;
                } else if (rating === 'partial') {
                    agg.partial++;
                } else if (rating === 'didntKnow') {
                    agg.didntKnow++;
                }
                byTopic.set(topicId, agg);
            }
        }
        const entries: TopicStrengthEntry[] = [];
        for (const [id, agg] of byTopic) {
            const total = agg.nailed + agg.partial + agg.didntKnow;
            if (total === 0) {
                continue;
            }
            const ci = id.indexOf(':');
            const category = ci >= 0 ? id.slice(0, ci) : id;
            const subtopic = ci >= 0 ? id.slice(ci + 1) : id;
            entries.push({ id, category, subtopic, nailedPct: Math.round((agg.nailed / total) * 100), ...agg, total });
        }
        entries.sort((a, b) => b.nailedPct - a.nailedPct || a.id.localeCompare(b.id));
        return entries.slice(0, 5);
    });

    protected toggleMetricHelp(which: 'accuracy' | 'confidence'): void {
        this.openMetricHelp.update((current) => (current === which ? null : which));
    }

    @HostListener('document:pointerdown', ['$event'])
    protected onDocumentPointerDown(event: PointerEvent): void {
        const t = event.target;
        if (t instanceof Element && t.closest('[data-dashboard-metric-help]')) {
            return;
        }
        this.openMetricHelp.set(null);
    }

    constructor() {
        this.questionService
            .getQuestions()
            .pipe(takeUntilDestroyed())
            .subscribe({
                next: (questions) => {
                    const progress = this.progressService.getProgress();
                    this.stats.set(this.computeStats(questions, progress));
                    this.questionsSignal.set(questions);
                    this.loading.set(false);
                    this.loadError.set(false);
                },
                error: () => {
                    this.loadError.set(true);
                    this.loading.set(false);
                }
            });
    }

    protected exportData(): void {
        this.dataExportService.exportBackup();
    }

    protected onImportFileChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.dataExportService.parseBackupFile(file).then(
            (backup) => {
                this.importError.set(false);
                this.importPending.set(backup);
            },
            () => {
                this.importError.set(true);
                this.importPending.set(null);
            }
        );
        input.value = '';
    }

    protected confirmImport(): void {
        const backup = this.importPending();
        if (!backup) return;
        this.dataExportService.applyBackup(backup);
    }

    protected cancelImport(): void {
        this.importPending.set(null);
        this.importError.set(false);
    }

    private computeStats(questions: Question[], progress: Progress[]): DashboardStats {
        const byId = new Map(progress.map((p) => [p.questionId, p]));
        let totalNailed = 0;
        let totalPartial = 0;
        let totalDidnt = 0;
        const byTopicId = new Map<string, { attempts: number; nailed: number }>();

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
            const topicId = topicIdFromParts(q.category, q.subtopic);
            const agg = byTopicId.get(topicId) ?? { attempts: 0, nailed: 0 };
            agg.attempts += attempts;
            agg.nailed += nailed;
            byTopicId.set(topicId, agg);
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

        const weakTopics: WeakTopic[] = [];
        for (const [topicId, agg] of byTopicId) {
            if (agg.attempts >= 3 && agg.nailed / agg.attempts < 0.6) {
                const nailedNeeded = Math.ceil((0.6 * agg.attempts - agg.nailed) / 0.4);
                weakTopics.push({ id: topicId, nailedNeeded: Math.max(nailedNeeded, 1) });
            }
        }
        weakTopics.sort((a, b) => a.id.localeCompare(b.id));

        return {
            totalAnswered: totalRatings,
            accuracyPct,
            confidencePct,
            weakTopics,
            weakCategories: weakTopics.map((w) => w.id)
        };
    }

    protected practiceRatingTotal(b: PracticeRatingBreakdown): number {
        return b.nailed + b.partial + b.didntKnow;
    }

    private lifetimeAttemptsBreakdown(): PracticeRatingBreakdown {
        let nailed = 0;
        let partial = 0;
        let didntKnow = 0;
        for (const p of this.progressService.getProgress()) {
            nailed += p.nailedCount ?? 0;
            partial += p.partialCount ?? 0;
            didntKnow += p.didntKnowCount ?? 0;
        }
        return { nailed, partial, didntKnow };
    }

    /** Same notion of “activity” as the heatmap cell intensity (answers + mark-studied). */
    private dayHasPracticeOrStudyForStreak(row: DailyActivity): boolean {
        return (row.questionsAnswered ?? 0) > 0 || (row.topicsStudied ?? 0) > 0;
    }

    private countBackwardStreakFrom(from: string, activeDays: Set<string>): number {
        let n = 0;
        let cursor = from;
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

    /** Subtopic key for i18n from a `category:subtopic` id. */
    protected weakTopicSubtopicKey(topicId: string): string {
        const i = topicId.indexOf(':');
        return i >= 0 ? topicId.slice(i + 1) : topicId;
    }
}
