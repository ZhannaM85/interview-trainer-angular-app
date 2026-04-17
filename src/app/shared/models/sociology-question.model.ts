export interface SociologyQuestion {
    id: number;
    topic: string;
    subtopic: string;
    type: 'single' | 'multi';
    question: string;
    options: string[];
    /** Indices into options[] that are correct answers. */
    correctIndices: number[];
    explanation?: string;
}
