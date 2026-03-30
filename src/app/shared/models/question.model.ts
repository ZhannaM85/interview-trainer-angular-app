export type QuestionCategory = 'javascript' | 'angular' | 'rxjs';

export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Question {
    id: number;
    question: string;
    answer: string;
    explanation?: string;
    example?: string;
    category: QuestionCategory;
    difficulty: QuestionDifficulty;
}
