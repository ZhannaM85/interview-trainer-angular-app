import type { Question, QuestionCategory } from '../models/question.model';

/** Stable id for plan / filtering: `category:subtopic`. */
export function topicIdFromQuestion(q: Pick<Question, 'category' | 'subtopic'>): string {
    return `${q.category}:${q.subtopic}`;
}

export function topicIdFromParts(category: QuestionCategory, subtopic: string): string {
    return `${category}:${subtopic}`;
}
