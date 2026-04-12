import type { Question, QuestionCategory } from '../../shared/models/question.model';
import { topicIdFromParts } from '../../shared/utils/topic-key.utils';

const CATEGORY_ORDER: QuestionCategory[] = ['javascript', 'angular', 'rxjs', 'custom'];

export interface StudySubtopicSection {
    /** Stable machine key (English slug source); use `subtopics.<key>` for display. */
    subtopic: string;
    anchorId: string;
    questions: Question[];
}

export interface StudyCategorySection {
    category: QuestionCategory;
    anchorId: string;
    subtopics: StudySubtopicSection[];
}

export function slugifySubtopic(subtopic: string): string {
    const s = subtopic
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
    return s.length > 0 ? s : 'general';
}

export function buildStudyGuideSections(questions: Question[]): StudyCategorySection[] {
    const byCat = new Map<QuestionCategory, Question[]>();
    for (const q of questions) {
        const list = byCat.get(q.category) ?? [];
        list.push(q);
        byCat.set(q.category, list);
    }

    return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((category) => {
        const qs = byCat.get(category)!;
        const bySub = new Map<string, Question[]>();
        for (const q of qs) {
            const list = bySub.get(q.subtopic) ?? [];
            list.push(q);
            bySub.set(q.subtopic, list);
        }

        const subtopics: StudySubtopicSection[] = [...bySub.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([subtopic, qlist]) => {
                const sorted = [...qlist].sort((x, y) => x.id - y.id);
                const slug = slugifySubtopic(subtopic);
                return {
                    subtopic,
                    anchorId: `study-sub-${category}-${slug}`,
                    questions: sorted
                };
            });

        return {
            category,
            anchorId: `study-cat-${category}`,
            subtopics
        };
    });
}

/** Keep only subtopics whose `category:subtopic` id is in `topicIds`. Drops empty categories. */
export function filterStudyGuideSectionsByTopicIds(
    sections: StudyCategorySection[],
    topicIds: ReadonlySet<string>
): StudyCategorySection[] {
    const out: StudyCategorySection[] = [];
    for (const cat of sections) {
        const subs = cat.subtopics.filter((sub) =>
            topicIds.has(topicIdFromParts(cat.category, sub.subtopic))
        );
        if (subs.length > 0) {
            out.push({ ...cat, subtopics: subs });
        }
    }
    return out;
}

/** Keep only subtopics where no question has been practiced (no attempts in `practicedQuestionIds`). */
export function filterStudyGuideSectionsWithoutPractice(
    sections: StudyCategorySection[],
    practicedQuestionIds: ReadonlySet<number>
): StudyCategorySection[] {
    const out: StudyCategorySection[] = [];
    for (const cat of sections) {
        const subs = cat.subtopics.filter((sub) =>
            sub.questions.every((q) => !practicedQuestionIds.has(q.id))
        );
        if (subs.length > 0) {
            out.push({ ...cat, subtopics: subs });
        }
    }
    return out;
}
