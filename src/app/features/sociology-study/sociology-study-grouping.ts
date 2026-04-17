import type { SociologyQuestion } from '../../shared/models/sociology-question.model';
import { slugifySociologySegment, sociologyPlanTopicId } from '../../shared/utils/sociology-topic-key.utils';

export interface SociologyStudySubtopicSection {
    subtopic: string;
    anchorId: string;
    questions: SociologyQuestion[];
}

export interface SociologyStudyTopicSection {
    topic: string;
    anchorId: string;
    subtopics: SociologyStudySubtopicSection[];
}

export function buildSociologyStudySections(questions: SociologyQuestion[]): SociologyStudyTopicSection[] {
    const byTopic = new Map<string, SociologyQuestion[]>();
    for (const q of questions) {
        const list = byTopic.get(q.topic) ?? [];
        list.push(q);
        byTopic.set(q.topic, list);
    }

    return [...byTopic.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'ru'))
        .map(([topic, qs]) => {
            const bySub = new Map<string, SociologyQuestion[]>();
            for (const q of qs) {
                const list = bySub.get(q.subtopic) ?? [];
                list.push(q);
                bySub.set(q.subtopic, list);
            }
            const subtopics: SociologyStudySubtopicSection[] = [...bySub.entries()]
                .sort(([a], [b]) => a.localeCompare(b, 'ru'))
                .map(([subtopic, qlist]) => {
                    const sorted = [...qlist].sort((x, y) => x.id - y.id);
                    const topicSlug = slugifySociologySegment(topic);
                    const subSlug = slugifySociologySegment(subtopic);
                    return {
                        subtopic,
                        anchorId: `soc-study-${topicSlug}-${subSlug}`,
                        questions: sorted
                    };
                });
            return {
                topic,
                anchorId: `soc-study-topic-${slugifySociologySegment(topic)}`,
                subtopics
            };
        });
}

export function filterSociologySectionsBySubtopics(
    sections: SociologyStudyTopicSection[],
    subtopics: ReadonlySet<string>
): SociologyStudyTopicSection[] {
    const out: SociologyStudyTopicSection[] = [];
    for (const sec of sections) {
        const subs = sec.subtopics.filter((s) => subtopics.has(s.subtopic));
        if (subs.length > 0) {
            out.push({ ...sec, subtopics: subs });
        }
    }
    return out;
}

/** Keep only subtopics whose plan id is in `ids` (used with `?today=1`). */
export function filterSociologySectionsByPlanTopicIds(
    sections: SociologyStudyTopicSection[],
    ids: ReadonlySet<string>
): SociologyStudyTopicSection[] {
    const out: SociologyStudyTopicSection[] = [];
    for (const sec of sections) {
        const subs = sec.subtopics.filter((s) =>
            ids.has(sociologyPlanTopicId(sec.topic, s.subtopic))
        );
        if (subs.length > 0) {
            out.push({ ...sec, subtopics: subs });
        }
    }
    return out;
}
