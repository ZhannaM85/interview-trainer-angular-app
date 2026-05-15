import { Injectable, inject, signal } from '@angular/core';

import type { DailyActivity } from '../../shared/models/activity.model';
import type { Progress } from '../../shared/models/progress.model';
import type { Question } from '../../shared/models/question.model';
import { formatLocalYmd } from '../../shared/utils/local-date.utils';
import { StorageService } from './storage.service';

export type AchievementId =
    | 'first-steps'
    | 'on-a-roll'
    | 'century'
    | 'week-warrior'
    | 'topic-master'
    | 'speed-run'
    | 'no-mercy'
    | 'polyglot'
    | 'come-back'
    | 'goal-getter'
    | 'interview-ready';

export interface EarnedBadge {
    id: AchievementId;
    earnedAt: string; // YYYY-MM-DD
}

export interface SessionAchievementStats {
    total: number;
    nailed: number;
    partial: number;
    didntKnow: number;
    durationMs: number;
}

interface AchievementStore {
    earned: EarnedBadge[];
    langSwitched: boolean;
}

const ACHIEVEMENT_KEY = 'achievements';
const SPEED_RUN_MIN_QUESTIONS = 10;
const SPEED_RUN_MAX_MS = 3 * 60 * 1000; // 3 minutes

@Injectable({
    providedIn: 'root'
})
export class AchievementService {
    private readonly storage = inject(StorageService);

    private store = this.loadStore();
    private readonly _earned = signal<EarnedBadge[]>([...this.store.earned]);

    readonly earnedBadges = this._earned.asReadonly();

    /** Called by app.ts when the user explicitly switches UI language. */
    recordLanguageSwitched(): void {
        if (this.store.langSwitched) {
            return;
        }
        this.store.langSwitched = true;
        this.persist();
    }

    /**
     * Checks all lifetime achievements and grants any newly satisfied ones.
     * Called by the dashboard on load and when reactive data changes.
     */
    checkAndGrantLifetime(params: {
        totalAnswered: number;
        questions: Question[];
        progress: Progress[];
        activityMap: ReadonlyMap<string, DailyActivity>;
        currentStreakDays: number;
        bestStreakDays: number;
        dailyGoal: number;
        todayAnswered: number;
    }): void {
        const today = formatLocalYmd(new Date());
        const {
            totalAnswered,
            questions,
            progress,
            activityMap,
            currentStreakDays,
            bestStreakDays,
            dailyGoal,
            todayAnswered
        } = params;

        if (totalAnswered >= 1) {
            this.grant('first-steps', today);
        }
        if (totalAnswered >= 100) {
            this.grant('century', today);
        }
        if (currentStreakDays >= 7 || bestStreakDays >= 7) {
            this.grant('week-warrior', today);
        }
        if (todayAnswered >= dailyGoal && todayAnswered > 0) {
            this.grant('goal-getter', today);
        }
        if (this.store.langSwitched && totalAnswered >= 1) {
            this.grant('polyglot', today);
        }
        if (this.checkTopicMaster(questions, progress)) {
            this.grant('topic-master', today);
        }
        if (this.checkComeBack(activityMap, today)) {
            this.grant('come-back', today);
        }
    }

    /**
     * Checks session-based achievements at the end of a quiz session.
     * Called by the quiz page when a session completes.
     * Returns true when the 'interview-ready' threshold was met this session.
     */
    checkAndGrantSession(stats: SessionAchievementStats): boolean {
        const today = formatLocalYmd(new Date());
        const { total, nailed, didntKnow, durationMs } = stats;

        if (total >= 10) {
            this.grant('on-a-roll', today);
        }
        if (total >= SPEED_RUN_MIN_QUESTIONS && durationMs <= SPEED_RUN_MAX_MS) {
            this.grant('speed-run', today);
        }
        if (total >= 10 && didntKnow === 0) {
            this.grant('no-mercy', today);
        }
        const interviewReady = total >= 10 && nailed / total >= 0.8;
        if (interviewReady) {
            this.grant('interview-ready', today);
        }
        return interviewReady;
    }

    private grant(id: AchievementId, earnedAt: string): void {
        if (this.store.earned.some((b) => b.id === id)) {
            return;
        }
        const badge: EarnedBadge = { id, earnedAt };
        this.store.earned = [...this.store.earned, badge];
        this._earned.set([...this.store.earned]);
        this.persist();
    }

    /** True when every question in at least one subtopic has been nailed at least once. */
    private checkTopicMaster(questions: Question[], progress: Progress[]): boolean {
        if (questions.length === 0 || progress.length === 0) {
            return false;
        }
        const byProgress = new Map(progress.map((p) => [p.questionId, p]));
        const byTopic = new Map<string, number[]>();

        for (const q of questions) {
            const topicKey = `${q.category}:${q.subtopic}`;
            const ids = byTopic.get(topicKey) ?? [];
            ids.push(q.id);
            byTopic.set(topicKey, ids);
        }

        for (const [, ids] of byTopic) {
            if (ids.length === 0) {
                continue;
            }
            const allNailed = ids.every((id) => (byProgress.get(id)?.nailedCount ?? 0) > 0);
            if (allNailed) {
                return true;
            }
        }
        return false;
    }

    /**
     * True when: today has practice activity AND the most recent prior activity day
     * is 3+ calendar days before today.
     */
    private checkComeBack(activityMap: ReadonlyMap<string, DailyActivity>, today: string): boolean {
        const todayRow = activityMap.get(today);
        if (!todayRow || (todayRow.questionsAnswered ?? 0) === 0) {
            return false;
        }
        const priorDays = [...activityMap.keys()]
            .filter((d) => d < today && this.dayHasActivity(activityMap.get(d)))
            .sort((a, b) => b.localeCompare(a));
        if (priorDays.length === 0) {
            return false;
        }
        const lastActiveDay = priorDays[0];
        const gapMs = this.ymdToDate(today).getTime() - this.ymdToDate(lastActiveDay).getTime();
        const gapDays = Math.round(gapMs / 86_400_000);
        return gapDays >= 3;
    }

    private dayHasActivity(row: DailyActivity | undefined): boolean {
        if (!row) return false;
        return (row.questionsAnswered ?? 0) > 0 || (row.topicsStudied ?? 0) > 0;
    }

    private ymdToDate(ymd: string): Date {
        const [y, m, d] = ymd.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    private persist(): void {
        this.storage.set(ACHIEVEMENT_KEY, this.store);
    }

    private loadStore(): AchievementStore {
        const raw = this.storage.get<unknown>(ACHIEVEMENT_KEY);
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
            const obj = raw as Record<string, unknown>;
            const earned = this.parseEarned(obj['earned']);
            const langSwitched = obj['langSwitched'] === true;
            return { earned, langSwitched };
        }
        return { earned: [], langSwitched: false };
    }

    private parseEarned(raw: unknown): EarnedBadge[] {
        if (!Array.isArray(raw)) {
            return [];
        }
        const validIds = new Set<string>([
            'first-steps', 'on-a-roll', 'century', 'week-warrior',
            'topic-master', 'speed-run', 'no-mercy', 'polyglot',
            'come-back', 'goal-getter', 'interview-ready'
        ]);
        const result: EarnedBadge[] = [];
        for (const item of raw) {
            if (
                typeof item === 'object' &&
                item !== null &&
                typeof (item as EarnedBadge).id === 'string' &&
                validIds.has((item as EarnedBadge).id) &&
                typeof (item as EarnedBadge).earnedAt === 'string'
            ) {
                result.push({ id: (item as EarnedBadge).id, earnedAt: (item as EarnedBadge).earnedAt });
            }
        }
        return result;
    }
}
