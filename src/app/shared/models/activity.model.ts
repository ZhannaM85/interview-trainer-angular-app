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
}
