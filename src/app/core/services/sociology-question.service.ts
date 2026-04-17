import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, map, shareReplay } from 'rxjs';

import type { SociologyQuestion } from '../../shared/models/sociology-question.model';
import { SociologyCatalogEditService } from './sociology-catalog-edit.service';

@Injectable({
    providedIn: 'root'
})
export class SociologyQuestionService {
    private readonly http = inject(HttpClient);
    private readonly injector = inject(Injector);
    private readonly catalogEdits = inject(SociologyCatalogEditService);

    private readonly base$ = this.http.get<SociologyQuestion[]>('assets/data/sociology-questions.json').pipe(
        shareReplay({ bufferSize: 1, refCount: false })
    );

    private readonly merged$ = combineLatest([
        this.base$,
        toObservable(this.catalogEdits.overridesList, { injector: this.injector })
    ]).pipe(map(([base, _overrides]) => this.catalogEdits.mergeWithBase(base)));

    private queue: SociologyQuestion[] = [];
    private index = -1;

    getQuestions(): Observable<SociologyQuestion[]> {
        return this.merged$;
    }

    initializeQueue(questions: SociologyQuestion[]): void {
        this.queue = [...questions];
        this.index = -1;
    }

    getNextQuestion(): SociologyQuestion | null {
        this.index += 1;
        if (this.index >= this.queue.length) {
            return null;
        }
        return this.queue[this.index];
    }

    resetQueue(): void {
        this.queue = [];
        this.index = -1;
    }

    getQuestionByIdFromList(questions: SociologyQuestion[], id: number): SociologyQuestion | null {
        return questions.find((q) => q.id === id) ?? null;
    }
}
