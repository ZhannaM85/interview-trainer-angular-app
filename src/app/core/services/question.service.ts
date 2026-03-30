import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import type { Question, QuestionCategory, QuestionDifficulty } from '../../shared/models/question.model';

@Injectable({
    providedIn: 'root'
})
export class QuestionService {
    private readonly http = inject(HttpClient);

    private readonly questions$: Observable<Question[]> = this.http
        .get<Question[]>('assets/data/questions.json')
        .pipe(shareReplay(1));

    private queue: Question[] = [];
    private index = -1;

    getQuestions(): Observable<Question[]> {
        return this.questions$;
    }

    filterByCategory(questions: Question[], category: QuestionCategory): Question[] {
        return questions.filter((q) => q.category === category);
    }

    filterByDifficulty(questions: Question[], difficulty: QuestionDifficulty): Question[] {
        return questions.filter((q) => q.difficulty === difficulty);
    }

    initializeQueue(questions: Question[]): void {
        this.queue = [...questions];
        this.index = -1;
    }

    getNextQuestion(): Question | null {
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
}
