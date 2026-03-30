/** Per-question practice history; supports legacy correct/incorrect counts from storage migration. */
export interface Progress {
    questionId: number;
    nailedCount: number;
    partialCount: number;
    didntKnowCount: number;
    lastAnswered: string;
    nextReview: string;
}

/** Legacy shape before three-way self-rating. */
export interface LegacyProgress {
    questionId: number;
    correctCount: number;
    incorrectCount: number;
    lastAnswered: string;
    nextReview: string;
}
