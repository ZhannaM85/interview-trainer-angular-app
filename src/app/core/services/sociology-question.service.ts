import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import type { SociologyQuestion } from '../../shared/models/sociology-question.model';

@Injectable({
    providedIn: 'root'
})
export class SociologyQuestionService {
    private readonly http = inject(HttpClient);

    private readonly questions$ = this.http
        .get<SociologyQuestion[]>('assets/data/sociology-questions.json')
        .pipe(shareReplay(1));

    private queue: SociologyQuestion[] = [];
    private index = -1;

    getQuestions(): Observable<SociologyQuestion[]> {
        return this.questions$;
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
