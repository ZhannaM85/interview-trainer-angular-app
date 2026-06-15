/** Per-question practice history; supports legacy correct/incorrect counts from storage migration. */
export interface Progress {
    questionId: number;
    nailedCount: number;
    partialCount: number;
    didntKnowCount: number;
    lastAnswered: string;
    nextReview: string;
    /** SM-2 ease factor; defaults to 2.5 for migrated records. */
    easeFactor: number;
    /** SM-2 successful repetition count; resets to 0 on a failed review. */
    repetitionCount: number;
    /** Last scheduled interval in days; used to compute the next SM-2 interval. */
    intervalDays: number;
}

/** Legacy shape before three-way self-rating. */
export interface LegacyProgress {
    questionId: number;
    correctCount: number;
    incorrectCount: number;
    lastAnswered: string;
    nextReview: string;
}
