import { Injectable, signal } from '@angular/core';

const STORAGE_PREFIX = 'interview-trainer';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    readonly writeError = signal(false);

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
        } catch {
            this.writeError.set(true);
        }
    }

    clearWriteError(): void {
        this.writeError.set(false);
    }
}
