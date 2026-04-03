/** Persisted “plan for today” (local calendar day). */
export interface TodayPlanState {
    planDate: string;
    selectedTopicIds: string[];
    studiedTopicIds: string[];
}
