import { Injectable, computed, inject, signal } from '@angular/core';

import type { CustomQuestion } from '../../shared/models/custom-question.model';
import type { Question, QuestionDifficulty } from '../../shared/models/question.model';
import { StorageService } from './storage.service';

const VALID_DIFFICULTIES: QuestionDifficulty[] = ['beginner', 'intermediate', 'advanced'];

function isValidCustomQuestion(item: unknown): item is CustomQuestion {
    if (!item || typeof item !== 'object') return false;
    const q = item as Record<string, unknown>;
    return (
        typeof q['id'] === 'number' &&
        typeof q['question'] === 'string' && q['question'].trim().length > 0 &&
        typeof q['answer'] === 'string' && q['answer'].trim().length > 0 &&
        typeof q['subtopic'] === 'string' && q['subtopic'].trim().length > 0 &&
        VALID_DIFFICULTIES.includes(q['difficulty'] as QuestionDifficulty) &&
        typeof q['createdAt'] === 'string'
    );
}

function toQuestion(cq: CustomQuestion): Question {
    return {
        id: cq.id,
        question: cq.question,
        answer: cq.answer,
        weakAnswer: cq.answer,
        technicalAnswer: cq.answer,
        interviewAnswer: cq.answer,
        codeExample: '',
        readMoreLinks: [],
        subtopic: cq.subtopic,
        category: 'custom',
        difficulty: cq.difficulty
    };
}

@Injectable({ providedIn: 'root' })
export class CustomQuestionService {
    private readonly storage = inject(StorageService);
    private static readonly KEY = 'custom-questions';

    private readonly _questions = signal<CustomQuestion[]>(
        this.storage.get<CustomQuestion[]>(CustomQuestionService.KEY) ?? []
    );

    readonly questions = this._questions.asReadonly();

    readonly asQuestions = computed(() => this._questions().map(toQuestion));

    add(draft: { question: string; answer: string; subtopic: string; difficulty: QuestionDifficulty }): void {
        const newQ: CustomQuestion = {
            id: Date.now(),
            question: draft.question.trim(),
            answer: draft.answer.trim(),
            subtopic: draft.subtopic.trim(),
            difficulty: draft.difficulty,
            createdAt: new Date().toISOString()
        };
        this._questions.update((list) => [...list, newQ]);
        this.persist();
    }

    update(id: number, patch: { question: string; answer: string; subtopic: string; difficulty: QuestionDifficulty }): void {
        this._questions.update((list) =>
            list.map((q) =>
                q.id === id
                    ? {
                          ...q,
                          question: patch.question.trim(),
                          answer: patch.answer.trim(),
                          subtopic: patch.subtopic.trim(),
                          difficulty: patch.difficulty
                      }
                    : q
            )
        );
        this.persist();
    }

    delete(id: number): void {
        this._questions.update((list) => list.filter((q) => q.id !== id));
        this.persist();
    }

    importFrom(incoming: unknown[]): { added: number; skipped: number } {
        const valid = incoming.filter(isValidCustomQuestion);
        const existingIds = new Set(this._questions().map((q) => q.id));
        const toAdd = valid.filter((q) => !existingIds.has(q.id));
        if (toAdd.length > 0) {
            this._questions.update((list) => [...list, ...toAdd]);
            this.persist();
        }
        return { added: toAdd.length, skipped: incoming.length - toAdd.length };
    }

    private persist(): void {
        this.storage.set(CustomQuestionService.KEY, this._questions());
    }
}
