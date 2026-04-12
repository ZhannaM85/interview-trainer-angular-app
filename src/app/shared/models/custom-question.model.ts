import type { QuestionDifficulty } from './question.model';

export interface CustomQuestion {
    id: number;
    question: string;
    answer: string;
    /** User-defined label used as the subtopic, e.g. "Promises" */
    subtopic: string;
    difficulty: QuestionDifficulty;
    createdAt: string;
}
