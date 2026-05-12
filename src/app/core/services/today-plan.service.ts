import { Injectable, computed, inject, signal } from '@angular/core';

import type { PlanCarryover, TodayPlanState } from '../../shared/models/today-plan.model';
import { formatLocalYmd } from '../../shared/utils/local-date.utils';
import { isSociologyPlanTopicId } from '../../shared/utils/sociology-topic-key.utils';
import { ActivityService } from './activity.service';
import { SociologyActivityService } from './sociology-activity.service';
import { StorageService } from './storage.service';

const TODAY_PLAN_KEY = 'today-plan';
const CARRYOVER_KEY = 'plan-carryover';

function emptyStateForToday(): TodayPlanState {
    return {
        planDate: formatLocalYmd(new Date()),
        selectedTopicIds: [],
        studiedTopicIds: []
    };
}

function uniquePush(list: string[], id: string): string[] {
    if (list.includes(id)) {
        return list;
    }
    return [...list, id];
}

function withoutId(list: string[], id: string): string[] {
    return list.filter((x) => x !== id);
}

@Injectable({
    providedIn: 'root'
})
export class TodayPlanService {
    private readonly storage = inject(StorageService);
    private readonly activityService = inject(ActivityService);
    private readonly sociologyActivityService = inject(SociologyActivityService);

    // loadInitial() may write to CARRYOVER_KEY when a rollover is detected
    private readonly state = signal<TodayPlanState>(this.loadInitial());
    // loadCarryover() reads from CARRYOVER_KEY after loadInitial() has potentially written it
    readonly carryoverPending = signal<PlanCarryover | null>(this.loadCarryover());

    /** Resolved state after day rollover. */
    readonly plan = this.state.asReadonly();

    readonly selectedTopicIds = computed(() => this.state().selectedTopicIds);

    readonly studiedTopicIds = computed(() => this.state().studiedTopicIds);

    readonly hasSelection = computed(() => this.state().selectedTopicIds.length > 0);

    readonly hasStudiedTopics = computed(() => this.state().studiedTopicIds.length > 0);

    /** Selected but not yet marked studied. */
    readonly topicsRemainingToStudy = computed(() => {
        const s = this.state();
        const studied = new Set(s.studiedTopicIds);
        return s.selectedTopicIds.filter((id) => !studied.has(id));
    });

    isSelected(topicId: string): boolean {
        return this.state().selectedTopicIds.includes(topicId);
    }

    isStudied(topicId: string): boolean {
        return this.state().studiedTopicIds.includes(topicId);
    }

    toggleTopicSelected(topicId: string): void {
        this.ensureCurrentDay();
        const s = this.state();
        let selected = s.selectedTopicIds;
        let studied = s.studiedTopicIds;
        if (selected.includes(topicId)) {
            selected = withoutId(selected, topicId);
        } else {
            selected = uniquePush(selected, topicId);
            // Re-adding a previously studied topic means the user wants to study it again today.
            studied = withoutId(studied, topicId);
        }
        this.save({ ...s, selectedTopicIds: selected, studiedTopicIds: studied });
    }

    /** Call on feature pages so an open tab past midnight rolls the plan forward. */
    syncCalendarDay(): void {
        this.ensureCurrentDay();
    }

    markStudied(topicId: string): void {
        this.ensureCurrentDay();
        const s = this.state();
        const wasStudied = s.studiedTopicIds.includes(topicId);
        const nextSelected = withoutId(s.selectedTopicIds, topicId);
        const nextStudied = wasStudied ? s.studiedTopicIds : uniquePush(s.studiedTopicIds, topicId);
        this.save({
            ...s,
            selectedTopicIds: nextSelected,
            studiedTopicIds: nextStudied
        });
        if (!wasStudied) {
            const act = isSociologyPlanTopicId(topicId) ? this.sociologyActivityService : this.activityService;
            act.bumpTopicsStudied(1);
            act.addCoveredTopic(topicId);
        }
    }

    clearStudied(topicId: string): void {
        this.ensureCurrentDay();
        const s = this.state();
        if (!s.studiedTopicIds.includes(topicId) && !s.selectedTopicIds.includes(topicId)) {
            return;
        }
        this.save({
            ...s,
            selectedTopicIds: withoutId(s.selectedTopicIds, topicId),
            studiedTopicIds: withoutId(s.studiedTopicIds, topicId)
        });
    }

    /** Add yesterday's unfinished topics to today's plan and clear the carryover prompt. */
    acceptCarryover(): void {
        const carryover = this.carryoverPending();
        if (!carryover) return;
        this.ensureCurrentDay();
        const s = this.state();
        const selectedSet = new Set(s.selectedTopicIds);
        const newIds = carryover.topicIds.filter((id) => !selectedSet.has(id));
        if (newIds.length > 0) {
            this.save({ ...s, selectedTopicIds: [...s.selectedTopicIds, ...newIds] });
        }
        this.storage.set(CARRYOVER_KEY, null);
        this.carryoverPending.set(null);
    }

    /** Dismiss the carryover prompt without adding topics. */
    dismissCarryover(): void {
        this.storage.set(CARRYOVER_KEY, null);
        this.carryoverPending.set(null);
    }

    private ensureCurrentDay(): void {
        const today = formatLocalYmd(new Date());
        const s = this.state();
        if (s.planDate !== today) {
            this.save(emptyStateForToday());
        }
    }

    private save(next: TodayPlanState): void {
        this.storage.set(TODAY_PLAN_KEY, next);
        this.state.set(next);
    }

    private loadInitial(): TodayPlanState {
        const today = formatLocalYmd(new Date());
        const raw = this.storage.get<unknown>(TODAY_PLAN_KEY);
        if (!this.isPersistedShape(raw)) {
            return emptyStateForToday();
        }
        if (raw.planDate !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const studiedSet = new Set(raw.studiedTopicIds);
            const unfinished = raw.selectedTopicIds.filter((id) => !studiedSet.has(id));
            if (unfinished.length > 0 && raw.planDate === formatLocalYmd(yesterday)) {
                this.storage.set(CARRYOVER_KEY, { fromDate: raw.planDate, topicIds: unfinished } satisfies PlanCarryover);
            }
            const fresh = emptyStateForToday();
            this.storage.set(TODAY_PLAN_KEY, fresh);
            return fresh;
        }
        return {
            planDate: raw.planDate,
            selectedTopicIds: [...new Set(raw.selectedTopicIds)],
            studiedTopicIds: [...new Set(raw.studiedTopicIds)]
        };
    }

    private loadCarryover(): PlanCarryover | null {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatLocalYmd(yesterday);
        const raw = this.storage.get<unknown>(CARRYOVER_KEY);
        if (!this.isCarryoverShape(raw)) return null;
        if (raw.fromDate !== yesterdayStr) {
            // Stale entry (older than yesterday); clear it
            this.storage.set(CARRYOVER_KEY, null);
            return null;
        }
        return raw;
    }

    private isCarryoverShape(raw: unknown): raw is PlanCarryover {
        return (
            typeof raw === 'object' &&
            raw !== null &&
            'fromDate' in raw &&
            typeof (raw as PlanCarryover).fromDate === 'string' &&
            'topicIds' in raw &&
            Array.isArray((raw as PlanCarryover).topicIds)
        );
    }

    private isPersistedShape(raw: unknown): raw is TodayPlanState {
        return (
            typeof raw === 'object' &&
            raw !== null &&
            'planDate' in raw &&
            typeof (raw as TodayPlanState).planDate === 'string' &&
            'selectedTopicIds' in raw &&
            Array.isArray((raw as TodayPlanState).selectedTopicIds) &&
            'studiedTopicIds' in raw &&
            Array.isArray((raw as TodayPlanState).studiedTopicIds)
        );
    }
}
