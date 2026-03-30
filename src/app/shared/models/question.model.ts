export type QuestionCategory = 'javascript' | 'angular' | 'rxjs';

export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Question {
    id: number;
    question: string;
    /** Primary interview-ready answer (legacy; same as interviewAnswer when from JSON). */
    answer: string;
    weakAnswer: string;
    technicalAnswer: string;
    interviewAnswer: string;
    subtopic: string;
    category: QuestionCategory;
    difficulty: QuestionDifficulty;
}
