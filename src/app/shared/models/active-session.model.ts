export interface ActiveSessionSnapshot {
    queueIds: number[];
    currentIndex: number;       // 0-based index into queueIds of the question the user was on
    sessionMode: 'quick' | 'standard' | 'deep';
    practiceScope: 'planFocused' | 'full' | 'studiedTopics' | 'freshOnly';
    topicsFocusParam: string;
    sessionNailed: number;
    sessionPartial: number;
    sessionDidntKnow: number;
    sessionBestStreak: number;
    currentStreak: number;
    sessionTotal: number;
    sessionStackTopicIds: string[];
    usingFallbackQueue: boolean;
    savedAt: string;
}
