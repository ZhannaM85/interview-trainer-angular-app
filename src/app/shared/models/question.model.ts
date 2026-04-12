export type QuestionCategory = 'javascript' | 'angular' | 'rxjs' | 'custom';

export type QuestionDifficulty = 'beginner' | 'intermediate' | 'advanced';

/** Resolved external “read more” link for the active locale. */
export interface QuestionReadMoreLink {
    url: string;
    title: string;
}

export interface Question {
    id: number;
    question: string;
    /** Primary interview-ready answer (legacy; same as interviewAnswer when from JSON). */
    answer: string;
    weakAnswer: string;
    technicalAnswer: string;
    interviewAnswer: string;
    /** Illustrative code shown below the answer blocks (language-agnostic). */
    codeExample: string;
    /** Optional curated article links (https only). */
    readMoreLinks: QuestionReadMoreLink[];
    subtopic: string;
    category: QuestionCategory;
    difficulty: QuestionDifficulty;
}
