import { Injectable, inject, signal } from '@angular/core';

import { StorageService } from './storage.service';

const PREFS_KEY = 'user-preferences';
const DEFAULT_DAILY_GOAL = 10;
const MIN_DAILY_GOAL = 1;
const MAX_DAILY_GOAL = 200;

interface UserPreferences {
    dailyGoal: number;
}

@Injectable({
    providedIn: 'root'
})
export class UserPreferencesService {
    private readonly storage = inject(StorageService);

    private readonly _dailyGoal = signal<number>(this.loadDailyGoal());
    readonly dailyGoal = this._dailyGoal.asReadonly();

    setDailyGoal(n: number): void {
        const clamped = Math.max(MIN_DAILY_GOAL, Math.min(MAX_DAILY_GOAL, Math.round(n)));
        if (!Number.isFinite(clamped)) {
            return;
        }
        this._dailyGoal.set(clamped);
        this.persist();
    }

    private loadDailyGoal(): number {
        const raw = this.storage.get<UserPreferences>(PREFS_KEY);
        if (raw && typeof raw.dailyGoal === 'number' && Number.isFinite(raw.dailyGoal)) {
            return Math.max(MIN_DAILY_GOAL, Math.min(MAX_DAILY_GOAL, Math.round(raw.dailyGoal)));
        }
        return DEFAULT_DAILY_GOAL;
    }

    private persist(): void {
        this.storage.set(PREFS_KEY, { dailyGoal: this._dailyGoal() } satisfies UserPreferences);
    }
}
