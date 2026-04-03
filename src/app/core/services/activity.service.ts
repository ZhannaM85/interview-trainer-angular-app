import { Injectable, inject, signal } from '@angular/core';

import type { DailyActivity } from '../../shared/models/activity.model';
import { formatLocalYmd } from '../../shared/utils/local-date.utils';
import { StorageService } from './storage.service';

const ACTIVITY_KEY = 'activity-by-day';
const MAX_STORED_DAYS = 400;

@Injectable({
    providedIn: 'root'
})
export class ActivityService {
    private readonly storage = inject(StorageService);

    /** Date → activity (normalized keys `YYYY-MM-DD`). */
    private readonly byDate = signal<ReadonlyMap<string, DailyActivity>>(this.loadMap());

    readonly activityMap = this.byDate.asReadonly();

    bumpQuestionsAnswered(delta = 1): void {
        if (delta <= 0) {
            return;
        }
        this.updateDay(formatLocalYmd(new Date()), (row) => ({
            ...row,
            questionsAnswered: row.questionsAnswered + delta
        }));
    }

    bumpTopicsStudied(delta = 1): void {
        if (delta <= 0) {
            return;
        }
        this.updateDay(formatLocalYmd(new Date()), (row) => ({
            ...row,
            topicsStudied: row.topicsStudied + delta
        }));
    }

    private updateDay(date: string, fn: (row: DailyActivity) => DailyActivity): void {
        const map = new Map(this.byDate());
        const prev = map.get(date) ?? { date, questionsAnswered: 0, topicsStudied: 0 };
        map.set(date, fn(prev));
        this.persist(map);
        this.byDate.set(map);
    }

    private persist(map: Map<string, DailyActivity>): void {
        const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
        const trimmed =
            sorted.length > MAX_STORED_DAYS
                ? sorted.slice(sorted.length - MAX_STORED_DAYS)
                : sorted;
        this.storage.set(
            ACTIVITY_KEY,
            trimmed.map(([, v]) => v)
        );
    }

    private loadMap(): Map<string, DailyActivity> {
        const raw = this.storage.get<unknown>(ACTIVITY_KEY);
        const map = new Map<string, DailyActivity>();
        if (!Array.isArray(raw)) {
            return map;
        }
        for (const row of raw) {
            if (!this.isDailyActivity(row)) {
                continue;
            }
            map.set(row.date, {
                date: row.date,
                questionsAnswered: Math.max(0, row.questionsAnswered),
                topicsStudied: Math.max(0, row.topicsStudied)
            });
        }
        return map;
    }

    private isDailyActivity(row: unknown): row is DailyActivity {
        return (
            typeof row === 'object' &&
            row !== null &&
            'date' in row &&
            typeof (row as DailyActivity).date === 'string' &&
            'questionsAnswered' in row &&
            typeof (row as DailyActivity).questionsAnswered === 'number' &&
            'topicsStudied' in row &&
            typeof (row as DailyActivity).topicsStudied === 'number'
        );
    }
}
