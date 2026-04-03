/** Per-calendar-day aggregates for the activity heatmap. */
export interface DailyActivity {
    date: string;
    questionsAnswered: number;
    topicsStudied: number;
    /** Unique `category:subtopic` ids touched that day (practice + mark studied). */
    coveredTopicIds: string[];
}
