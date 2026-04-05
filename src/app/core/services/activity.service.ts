import { computed, Injectable, inject, signal } from '@angular/core';

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

    /** Sum of `activeSeconds` across all stored days (lifetime approximate). */
    readonly totalActiveSeconds = computed(() => {
        let t = 0;
        for (const row of this.byDate().values()) {
            t += Math.max(0, row.activeSeconds ?? 0);
        }
        return t;
    });

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

    /** Adds foreground learning time for the current local calendar day. */
    addActiveSeconds(delta: number): void {
        if (delta <= 0) {
            return;
        }
        this.updateDay(formatLocalYmd(new Date()), (row) => ({
            ...row,
            activeSeconds: Math.max(0, row.activeSeconds ?? 0) + delta
        }));
    }

    /** Records a `category:subtopic` touched on this calendar day (deduped). */
    addCoveredTopic(topicId: string): void {
        const trimmed = topicId.trim();
        if (!trimmed) {
            return;
        }
        this.updateDay(formatLocalYmd(new Date()), (row) => ({
            ...row,
            coveredTopicIds: this.mergeTopicIds(row.coveredTopicIds, [trimmed])
        }));
    }

    private mergeTopicIds(existing: string[] | undefined, add: string[]): string[] {
        const s = new Set([...(existing ?? []), ...add]);
        return [...s].sort((a, b) => a.localeCompare(b));
    }

    private updateDay(date: string, fn: (row: DailyActivity) => DailyActivity): void {
        const map = new Map(this.byDate());
        const prev =
            map.get(date) ??
            ({
                date,
                questionsAnswered: 0,
                topicsStudied: 0,
                coveredTopicIds: [],
                activeSeconds: 0
            } satisfies DailyActivity);
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
            const activeSeconds =
                'activeSeconds' in row && typeof (row as DailyActivity).activeSeconds === 'number'
                    ? Math.max(0, (row as DailyActivity).activeSeconds!)
                    : 0;
            map.set(row.date, {
                date: row.date,
                questionsAnswered: Math.max(0, row.questionsAnswered),
                topicsStudied: Math.max(0, row.topicsStudied),
                activeSeconds,
                coveredTopicIds: Array.isArray((row as DailyActivity).coveredTopicIds)
                    ? [
                          ...new Set(
                              (row as DailyActivity).coveredTopicIds!.filter(
                                  (x): x is string => typeof x === 'string'
                              )
                          )
                      ].sort((a, b) => a.localeCompare(b))
                    : []
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
