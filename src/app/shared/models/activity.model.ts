import type { SelfRating } from './self-rating.model';

/** Per-calendar-day aggregates for the activity heatmap. */
export interface DailyActivity {
    date: string;
    questionsAnswered: number;
    topicsStudied: number;
    /** Unique `category:subtopic` ids touched that day (practice + mark studied). */
    coveredTopicIds: string[];
    /**
     * Seconds with Practice, Study guide, or Plan in the foreground (tab visible).
     * Omitted in legacy stored rows; treat as 0.
     */
    activeSeconds?: number;
    /**
     * Best self-rating per question that day (`questionId` string key).
     * Retaking the same question the same day only upgrades (nailed > partial > didn't know).
     */
    practiceRatingBest?: Partial<Record<string, SelfRating>>;
}
