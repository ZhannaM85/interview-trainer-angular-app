import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { Progress } from '../../shared/models/progress.model';
import type { Question } from '../../shared/models/question.model';
import { QuestionService } from './question.service';
import { StorageService } from './storage.service';

const PROGRESS_KEY = 'progress';

@Injectable({
    providedIn: 'root'
})
export class ProgressService {
    private readonly storage = inject(StorageService);
    private readonly questionService = inject(QuestionService);

    recordAnswer(questionId: number, correct: boolean): void {
        const list = this.getProgress();
        const now = new Date();
        const nextReview = new Date(now);
        if (correct) {
            nextReview.setDate(nextReview.getDate() + 3);
        } else {
            nextReview.setDate(nextReview.getDate() + 1);
        }

        const existing = list.find((p) => p.questionId === questionId);
        if (existing) {
            if (correct) {
                existing.correctCount += 1;
            } else {
                existing.incorrectCount += 1;
            }
            existing.lastAnswered = now.toISOString();
            existing.nextReview = nextReview.toISOString();
        } else {
            list.push({
                questionId,
                correctCount: correct ? 1 : 0,
                incorrectCount: correct ? 0 : 1,
                lastAnswered: now.toISOString(),
                nextReview: nextReview.toISOString()
            });
        }
        this.storage.set(PROGRESS_KEY, list);
    }

    getProgress(): Progress[] {
        return this.storage.get<Progress[]>(PROGRESS_KEY) ?? [];
    }

    getDueQuestions(): Observable<Question[]> {
        return this.questionService.getQuestions().pipe(
            map((questions) => this.getDueQuestionsSync(questions))
        );
    }

    getDueQuestionsSync(questions: Question[]): Question[] {
        return this.filterDueQuestions(questions);
    }

    private filterDueQuestions(questions: Question[]): Question[] {
        const progress = this.getProgress();
        const now = new Date();
        const due = questions.filter((q) => {
            const p = progress.find((x) => x.questionId === q.id);
            if (!p) {
                return true;
            }
            return new Date(p.nextReview) <= now;
        });
        return due.sort((a, b) => a.id - b.id);
    }
}
