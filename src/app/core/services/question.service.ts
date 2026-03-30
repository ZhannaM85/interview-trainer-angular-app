import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

import type { Question, QuestionCategory, QuestionDifficulty } from '../../shared/models/question.model';

/** Shape of `questions-updated.json` (interview-oriented fields). */
interface QuestionUpdatedRow {
    id: number;
    topic: string;
    subtopic: string;
    question: string;
    weakAnswer: string;
    technicalAnswer: string;
    interviewAnswer: string;
    difficulty: QuestionDifficulty;
}

@Injectable({
    providedIn: 'root'
})
export class QuestionService {
    private readonly http = inject(HttpClient);

    private readonly questions$: Observable<Question[]> = this.http
        .get<QuestionUpdatedRow[]>('assets/data/questions-updated.json')
        .pipe(
            map((rows) => rows.map((row) => this.mapUpdatedRowToQuestion(row))),
            shareReplay(1)
        );

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

    private mapUpdatedRowToQuestion(row: QuestionUpdatedRow): Question {
        return {
            id: row.id,
            question: row.question,
            answer: row.interviewAnswer,
            weakAnswer: row.weakAnswer,
            technicalAnswer: row.technicalAnswer,
            interviewAnswer: row.interviewAnswer,
            subtopic: row.subtopic,
            category: this.mapTopicToCategory(row.topic, row.subtopic),
            difficulty: row.difficulty
        };
    }

    private mapTopicToCategory(topic: string, subtopic: string): QuestionCategory {
        const t = topic.toLowerCase();
        const s = subtopic.toLowerCase();
        if (t === 'javascript') {
            return 'javascript';
        }
        if (t === 'angular') {
            if (s === 'rxjs' || s === 'observables') {
                return 'rxjs';
            }
            return 'angular';
        }
        return 'javascript';
    }
}
