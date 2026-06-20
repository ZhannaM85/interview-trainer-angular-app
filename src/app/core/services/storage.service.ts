import { Injectable, computed, signal } from '@angular/core';

const STORAGE_PREFIX = 'interview-trainer';
const ESTIMATED_QUOTA_KB = 5120;

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    readonly writeError = signal(false);
    private readonly _tick = signal(0);

    /** Approximate localStorage usage of all interview-trainer:* keys in KB. Reactive. */
    readonly usageKb = computed(() => {
        this._tick();
        let bytes = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_PREFIX)) {
                bytes += key.length + (localStorage.getItem(key)?.length ?? 0);
            }
        }
        return Math.round(bytes / 1024);
    });

    /** True when usage exceeds 80% of the estimated 5 MB browser quota. */
    readonly nearQuota = computed(() => this.usageKb() > ESTIMATED_QUOTA_KB * 0.8);

    get<T>(key: string): T | null {
        try {
            const raw = localStorage.getItem(`${STORAGE_PREFIX}:${key}`);
            if (raw === null) {
                return null;
            }
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    set(key: string, value: unknown): void {
        try {
            localStorage.setItem(`${STORAGE_PREFIX}:${key}`, JSON.stringify(value));
            this._tick.update((t) => t + 1);
        } catch {
            this.writeError.set(true);
        }
    }

    /** Removes all interview-trainer:* keys from localStorage. */
    clearAll(): void {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }
        this._tick.update((t) => t + 1);
    }

    clearWriteError(): void {
        this.writeError.set(false);
    }
}
