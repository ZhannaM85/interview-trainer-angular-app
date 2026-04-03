/** Per-calendar-day aggregates for the activity heatmap. */
export interface DailyActivity {
    date: string;
    questionsAnswered: number;
    topicsStudied: number;
}
