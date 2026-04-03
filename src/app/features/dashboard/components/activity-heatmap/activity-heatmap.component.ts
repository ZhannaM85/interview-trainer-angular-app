import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

import { ActivityService } from '../../../../core/services/activity.service';
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

@Component({
    selector: 'app-activity-heatmap',
    imports: [TranslatePipe],
    templateUrl: './activity-heatmap.component.html',
    styleUrl: './activity-heatmap.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ActivityHeatmapComponent {
    private readonly activityService = inject(ActivityService);
    private readonly translate = inject(TranslateService);

    private readonly activeLang = toSignal(
        this.translate.onLangChange.pipe(map((e) => e.lang)),
        { initialValue: this.translate.currentLang }
    );

    protected readonly weekColumns = computed(() => {
        void this.activeLang();
        return this.buildGrid();
    });

    private buildGrid(): HeatmapCell[][] {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayYmd = formatLocalYmd(today);
        const todaySunday = this.startOfWeekSunday(today);
        const gridStart = new Date(todaySunday);
        gridStart.setDate(gridStart.getDate() - (WEEKS - 1) * 7);

        const map = this.activityService.activityMap();
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
