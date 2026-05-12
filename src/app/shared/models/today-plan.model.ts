/** Persisted “plan for today” (local calendar day). */
export interface TodayPlanState {
    planDate: string;
    selectedTopicIds: string[];
    studiedTopicIds: string[];
}

/** Persisted carry-over from the previous day's unfinished topics. */
export interface PlanCarryover {
    fromDate: string;
    topicIds: string[];
}
