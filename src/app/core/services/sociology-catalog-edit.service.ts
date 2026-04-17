import { Injectable, inject, signal } from '@angular/core';

import type { SociologyQuestion } from '../../shared/models/sociology-question.model';
import {
    validateSociologyQuestion,
    type SociologyQuestionValidationCode
} from '../../shared/utils/sociology-question-validate.utils';
import { StorageService } from './storage.service';

const STORAGE_KEY = 'sociology-catalog-edits';

@Injectable({
    providedIn: 'root'
})
export class SociologyCatalogEditService {
    private readonly storage = inject(StorageService);

    private readonly _overrides = signal<SociologyQuestion[]>(this.load());

    /** Edited snapshots keyed implicitly by `id`; merged on top of bundled JSON. */
    readonly overridesList = this._overrides.asReadonly();

    hasOverrideFor(id: number): boolean {
        return this._overrides().some((q) => q.id === id);
    }

    mergeWithBase(base: SociologyQuestion[]): SociologyQuestion[] {
        const map = new Map(this._overrides().map((q) => [q.id, q]));
        return base.map((q) => map.get(q.id) ?? q);
    }

    /**
     * Replace or insert an edited question. Returns validation code or `null` if saved.
     */
    saveOverride(q: SociologyQuestion): SociologyQuestionValidationCode | null {
        const err = validateSociologyQuestion(q);
        if (err) {
            return err;
        }
        const next = { ...q, options: [...q.options], correctIndices: [...q.correctIndices].sort((a, b) => a - b) };
        this._overrides.update((list) => {
            const rest = list.filter((x) => x.id !== next.id);
            return [...rest, next];
        });
        this.persist();
        return null;
    }

    removeOverride(id: number): void {
        this._overrides.update((list) => list.filter((q) => q.id !== id));
        this.persist();
    }

    clearAll(): void {
        this._overrides.set([]);
        this.persist();
    }

    private persist(): void {
        this.storage.set(STORAGE_KEY, this._overrides());
    }

    private load(): SociologyQuestion[] {
        const raw = this.storage.get<unknown>(STORAGE_KEY);
        if (!Array.isArray(raw)) {
            return [];
        }
        const out: SociologyQuestion[] = [];
        for (const row of raw) {
            const q = row as SociologyQuestion;
            if (validateSociologyQuestion(q) === null) {
                out.push(q);
            }
        }
        return out;
    }
}
