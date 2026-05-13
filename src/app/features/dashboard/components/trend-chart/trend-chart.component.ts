import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { ActivityService } from '../../../../core/services/activity.service';
import type { DailyActivity } from '../../../../shared/models/activity.model';
import { formatLocalYmd } from '../../../../shared/utils/local-date.utils';

export type TrendWindow = '7d' | '30d' | 'all';

export interface TrendPoint {
    date: string;
    accuracyPct: number;
    confidencePct: number;
}

interface SvgPoint {
    x: number;
    yAcc: number;
    yConf: number;
    data: TrendPoint;
}

const VW = 500;
const VH = 148;
const PL = 34;
const PR = 8;
const PT = 8;
const PB = 28;
const PLOT_L = PL;
const PLOT_R = VW - PR;
const PLOT_T = PT;
const PLOT_B = VH - PB;
const PLOT_W = PLOT_R - PLOT_L;
const PLOT_H = PLOT_B - PLOT_T;

@Component({
    selector: 'app-trend-chart',
    imports: [TranslatePipe],
    templateUrl: './trend-chart.component.html',
    styleUrl: './trend-chart.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrendChartComponent {
    private readonly activityService = inject(ActivityService);

    protected readonly windows: ReadonlyArray<{ key: TrendWindow; label: string }> = [
        { key: '7d', label: 'dashboard.trendChart.window7d' },
        { key: '30d', label: 'dashboard.trendChart.window30d' },
        { key: 'all', label: 'dashboard.trendChart.windowAll' }
    ];

    protected readonly viewbox = `0 0 ${VW} ${VH}`;
    protected readonly plotL = PLOT_L;
    protected readonly plotR = PLOT_R;
    protected readonly plotT = PLOT_T;
    protected readonly plotB = PLOT_B;
    protected readonly midY = PLOT_T + PLOT_H / 2;

    protected readonly activeWindow = signal<TrendWindow>('30d');
    protected readonly hoveredIndex = signal<number | null>(null);

    protected readonly trendPoints = computed((): TrendPoint[] => {
        const map = this.activityService.activityMap();
        return this.computePoints(map, this.activeWindow());
    });

    protected readonly svgPoints = computed((): SvgPoint[] => {
        const pts = this.trendPoints();
        if (pts.length === 0) return [];
        const n = pts.length;
        return pts.map((p, i) => {
            const frac = n === 1 ? 0.5 : i / (n - 1);
            const x = PLOT_L + frac * PLOT_W;
            return {
                x,
                yAcc: PLOT_T + (1 - p.accuracyPct / 100) * PLOT_H,
                yConf: PLOT_T + (1 - p.confidencePct / 100) * PLOT_H,
                data: p
            };
        });
    });

    protected readonly accuracyPolyline = computed(() =>
        this.svgPoints()
            .map((p) => `${p.x.toFixed(1)},${p.yAcc.toFixed(1)}`)
            .join(' ')
    );

    protected readonly confidencePolyline = computed(() =>
        this.svgPoints()
            .map((p) => `${p.x.toFixed(1)},${p.yConf.toFixed(1)}`)
            .join(' ')
    );

    protected readonly xLabels = computed(() => {
        const pts = this.svgPoints();
        if (pts.length === 0) return [];
        const indices = this.pickLabelIndices(pts.length, 4);
        return indices.map((i) => ({ x: pts[i].x, label: this.shortDate(pts[i].data.date) }));
    });

    protected readonly hoveredPt = computed(() => {
        const i = this.hoveredIndex();
        const pts = this.svgPoints();
        return i !== null && i < pts.length ? pts[i] : null;
    });

    protected setWindow(w: TrendWindow): void {
        this.activeWindow.set(w);
        this.hoveredIndex.set(null);
    }

    protected onPointerMove(event: PointerEvent, svgEl: Element): void {
        const pts = this.svgPoints();
        if (pts.length === 0) return;
        const rect = svgEl.getBoundingClientRect();
        const svgX = ((event.clientX - rect.left) / rect.width) * VW;
        let nearest = 0;
        let minDist = Math.abs(pts[0].x - svgX);
        for (let i = 1; i < pts.length; i++) {
            const d = Math.abs(pts[i].x - svgX);
            if (d < minDist) {
                minDist = d;
                nearest = i;
            }
        }
        this.hoveredIndex.set(nearest);
    }

    protected onPointerLeave(): void {
        this.hoveredIndex.set(null);
    }

    private computePoints(map: ReadonlyMap<string, DailyActivity>, win: TrendWindow): TrendPoint[] {
        const today = formatLocalYmd(new Date());
        const cutoff = win === 'all' ? null : this.cutoffDate(win);
        const pts: TrendPoint[] = [];
        for (const [date, row] of map) {
            if (date > today || (cutoff && date < cutoff) || !row.practiceRatingBest) continue;
            let nailed = 0;
            let partial = 0;
            let didntKnow = 0;
            for (const r of Object.values(row.practiceRatingBest)) {
                if (r === 'nailed') nailed++;
                else if (r === 'partial') partial++;
                else didntKnow++;
            }
            const total = nailed + partial + didntKnow;
            if (total === 0) continue;
            pts.push({
                date,
                accuracyPct: Math.round((nailed / total) * 100),
                confidencePct: Math.round(((nailed + 0.5 * partial) / total) * 100)
            });
        }
        return pts.sort((a, b) => a.date.localeCompare(b.date));
    }

    private cutoffDate(win: '7d' | '30d'): string {
        const dt = new Date();
        dt.setDate(dt.getDate() - (win === '7d' ? 6 : 29));
        return formatLocalYmd(dt);
    }

    private pickLabelIndices(n: number, max: number): number[] {
        if (n <= max) return Array.from({ length: n }, (_, i) => i);
        const step = (n - 1) / (max - 1);
        return Array.from({ length: max }, (_, i) => Math.round(i * step));
    }

    private shortDate(ymd: string): string {
        const parts = ymd.split('-');
        return `${parts[2]}/${parts[1]}`;
    }
}
