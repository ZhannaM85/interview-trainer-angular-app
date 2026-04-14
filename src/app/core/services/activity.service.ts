import { Injectable, inject, signal } from '@angular/core';

import type { DailyActivity } from '../../shared/models/activity.model';
import type { SelfRating } from '../../shared/models/self-rating.model';
import { formatLocalYmd } from '../../shared/utils/local-date.utils';
import { StorageService } from './storage.service';

const RATING_RANK: Record<SelfRating, number> = { didntKnow: 0, partial: 1, nailed: 2 };

export interface PracticeRatingBreakdown {
    nailed: number;
    partial: number;
    didntKnow: number;
}

function mergeBetterRating(prev: SelfRating | undefined, next: SelfRating): SelfRating {
    if (prev === undefined) {
        return next;
    }
    return RATING_RANK[next] > RATING_RANK[prev] ? next : prev;
}

function normalizePracticeRatingBest(raw: unknown): Partial<Record<string, SelfRating>> | undefined {
    if (typeof raw !== 'object' || raw === null) {
        return undefined;
    }
    const out: Partial<Record<string, SelfRating>> = {};
    for (const [k, v] of Object.entries(raw)) {
        if (v === 'nailed' || v === 'partial' || v === 'didntKnow') {
            out[k] = v;
        }
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

function countPracticeRatingBreakdown(
    best: Partial<Record<string, SelfRating>> | undefined
): PracticeRatingBreakdown {
    const out: PracticeRatingBreakdown = { nailed: 0, partial: 0, didntKnow: 0 };
    if (!best) {
        return out;
    }
    for (const r of Object.values(best)) {
        if (r === 'nailed') {
            out.nailed += 1;
        } else if (r === 'partial') {
            out.partial += 1;
        } else if (r === 'didntKnow') {
            out.didntKnow += 1;
        }
    }
    return out;
}

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

    /**
     * Sum of `activeSeconds` across all stored days (lifetime approximate).
     * Initialized once from stored data; updated incrementally in addActiveSeconds()
     * to avoid iterating all records on every flush tick.
     */
    private readonly _totalActiveSeconds = (() => {
        let t = 0;
        for (const row of this.byDate().values()) {
            t += Math.max(0, row.activeSeconds ?? 0);
        }
        return signal(t);
    })();

    readonly totalActiveSeconds = this._totalActiveSeconds.asReadonly();

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

    /**
     * Records a practice self-rating for today. Same question later the same day only upgrades
     * (nailed beats partial beats didn't know).
     */
    recordPracticeRating(questionId: number, rating: SelfRating): void {
        const key = String(questionId);
        this.updateDay(formatLocalYmd(new Date()), (row) => {
            const prev = row.practiceRatingBest?.[key];
            const merged = mergeBetterRating(prev, rating);
            return {
                ...row,
                practiceRatingBest: { ...(row.practiceRatingBest ?? {}), [key]: merged }
            };
        });
    }

    /** Active seconds accumulated on the current local calendar day. */
    todayActiveSeconds(): number {
        const row = this.byDate().get(formatLocalYmd(new Date()));
        return Math.max(0, row?.activeSeconds ?? 0);
    }

    /** Best-rating counts for the current local calendar day. */
    todayPracticeRatingBreakdown(): PracticeRatingBreakdown {
        const row = this.byDate().get(formatLocalYmd(new Date()));
        return countPracticeRatingBreakdown(row?.practiceRatingBest);
    }

    /** Sum of per-day best-per-question counts over all stored days. */
    aggregatePracticeRatingBreakdown(): PracticeRatingBreakdown {
        const sum: PracticeRatingBreakdown = { nailed: 0, partial: 0, didntKnow: 0 };
        for (const row of this.byDate().values()) {
            const c = countPracticeRatingBreakdown(row.practiceRatingBest);
            sum.nailed += c.nailed;
            sum.partial += c.partial;
            sum.didntKnow += c.didntKnow;
        }
        return sum;
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
        this._totalActiveSeconds.update((t) => t + delta);
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
            const practiceRatingBest = normalizePracticeRatingBest(
                (row as DailyActivity).practiceRatingBest
            );
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
                    : [],
                ...(practiceRatingBest ? { practiceRatingBest } : {})
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
