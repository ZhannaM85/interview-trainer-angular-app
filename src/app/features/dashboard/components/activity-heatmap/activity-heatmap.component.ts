import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    signal,
    viewChild
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

import { ActivityService } from '../../../../core/services/activity.service';
import { SociologyActivityService } from '../../../../core/services/sociology-activity.service';
import { sociologyPlanTopicIdDisplayLabel } from '../../../../shared/utils/sociology-topic-key.utils';
import { formatLocalYmd } from '../../../../shared/utils/local-date.utils';

const WEEKS = 26;

export interface HeatmapCell {
    date: string;
    total: number;
    level: 0 | 1 | 2 | 3 | 4;
    isFuture: boolean;
    isToday: boolean;
    label: string;
}

export interface HeatmapDayDetail {
    date: string;
    dateLabel: string;
    questionsAnswered: number;
    topicsStudied: number;
    topicIds: string[];
}

@Component({
    selector: 'app-activity-heatmap',
    imports: [TranslatePipe],
    host: {
        '(document:keydown)': 'onEscape($event)'
    },
    templateUrl: './activity-heatmap.component.html',
    styleUrl: './activity-heatmap.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityHeatmapComponent {
    private readonly activityService = inject(ActivityService);
    private readonly sociologyActivityService = inject(SociologyActivityService);
    private readonly translate = inject(TranslateService);

    /** `interview` = main `activity-by-day`; `sociology` = isolated sociology store. */
    readonly variant = input<'interview' | 'sociology'>('interview');

    readonly headingKey = input<string>('heatmap.heading');
    readonly descriptionKey = input<string>('heatmap.description');

    private readonly activityMapForHeatmap = computed(() =>
        this.variant() === 'sociology' ? this.sociologyActivityService.activityMap() : this.activityService.activityMap()
    );

    /** Scroll container; scrolled to the right so the current week (today) is in view. */
    private readonly scrollHost = viewChild<ElementRef<HTMLElement>>('heatmapScroll');

    protected readonly dayDetail = signal<HeatmapDayDetail | null>(null);

    private readonly activeLang = toSignal(this.translate.onLangChange.pipe(map((e) => e.lang)), {
        initialValue: this.translate.currentLang
    });

    protected readonly weekColumns = computed(() => {
        void this.activeLang();
        void this.activityMapForHeatmap();
        return this.buildGrid();
    });

    constructor() {
        effect(() => {
            void this.weekColumns();
            queueMicrotask(() => {
                requestAnimationFrame(() => {
                    this.scrollToEnd();
                    requestAnimationFrame(() => this.scrollToEnd());
                });
            });
        });
    }

    private scrollToEnd(): void {
        const el = this.scrollHost()?.nativeElement;
        if (!el) {
            return;
        }
        const max = el.scrollWidth - el.clientWidth;
        if (max > 0) {
            el.scrollLeft = max;
        }
    }

    protected onCellClick(cell: HeatmapCell): void {
        if (cell.isFuture) {
            return;
        }
        const row = this.activityMapForHeatmap().get(cell.date);
        const loc = this.translate.currentLang === 'ru' ? 'ru-RU' : 'en-US';
        const dt = this.parseLocalYmd(cell.date);
        const dateLabel = dt.toLocaleDateString(loc, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
        this.dayDetail.set({
            date: cell.date,
            dateLabel,
            questionsAnswered: row?.questionsAnswered ?? 0,
            topicsStudied: row?.topicsStudied ?? 0,
            topicIds: row?.coveredTopicIds ?? []
        });
    }

    protected closeDayDetail(): void {
        this.dayDetail.set(null);
    }

    protected onEscape(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || !this.dayDetail()) {
            return;
        }
        event.preventDefault();
        this.closeDayDetail();
    }

    protected subtopicKeyFromTopicId(topicId: string): string {
        const i = topicId.indexOf(':');
        return i >= 0 ? topicId.slice(i + 1) : topicId;
    }

    protected sociologyTopicLabel(topicId: string): string {
        return sociologyPlanTopicIdDisplayLabel(topicId);
    }

    private parseLocalYmd(ymd: string): Date {
        const parts = ymd.split('-').map(Number);
        const y = parts[0] ?? 0;
        const m = parts[1] ?? 1;
        const d = parts[2] ?? 1;
        return new Date(y, m - 1, d);
    }

    private buildGrid(): HeatmapCell[][] {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayYmd = formatLocalYmd(today);
        const todaySunday = this.startOfWeekSunday(today);
        const gridStart = new Date(todaySunday);
        gridStart.setDate(gridStart.getDate() - (WEEKS - 1) * 7);

        const map = this.activityMapForHeatmap();
        const cols: HeatmapCell[][] = [];

        for (let w = 0; w < WEEKS; w++) {
            const column: HeatmapCell[] = [];
            for (let d = 0; d < 7; d++) {
                const dt = new Date(gridStart);
                dt.setDate(gridStart.getDate() + w * 7 + d);
                dt.setHours(0, 0, 0, 0);
                const ymd = formatLocalYmd(dt);
                const isFuture = dt.getTime() > today.getTime();
                const row = map.get(ymd);
                const total = isFuture
                    ? 0
                    : (row?.questionsAnswered ?? 0) + (row?.topicsStudied ?? 0);
                column.push({
                    date: ymd,
                    total,
                    level: isFuture ? 0 : this.intensityLevel(total),
                    isFuture,
                    isToday: ymd === todayYmd,
                    label: this.formatDayLabel(dt, total, isFuture)
                });
            }
            cols.push(column);
        }
        return cols;
    }

    private intensityLevel(total: number): 0 | 1 | 2 | 3 | 4 {
        if (total <= 0) {
            return 0;
        }
        if (total <= 1) {
            return 1;
        }
        if (total <= 3) {
            return 2;
        }
        if (total <= 6) {
            return 3;
        }
        return 4;
    }

    private startOfWeekSunday(d: Date): Date {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        const day = x.getDay();
        x.setDate(x.getDate() - day);
        return x;
    }

    private formatDayLabel(d: Date, total: number, isFuture: boolean): string {
        const loc = this.translate.currentLang === 'ru' ? 'ru-RU' : 'en-US';
        const dateStr = d.toLocaleDateString(loc, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        if (isFuture) {
            return this.translate.instant('heatmap.cellFuture', { date: dateStr });
        }
        if (total === 0) {
            return this.translate.instant('heatmap.cellNone', { date: dateStr });
        }
        return this.translate.instant('heatmap.cellActivity', {
            date: dateStr,
            count: total
        });
    }
}
