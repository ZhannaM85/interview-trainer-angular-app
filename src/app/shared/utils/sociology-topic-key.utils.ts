/** Prefix for topic ids in TodayPlan / activity for the sociology track (avoids collision with `javascript:…`). */
export const SOCIOLOGY_PLAN_TOPIC_PREFIX = 'sociology:';

export function slugifySociologySegment(s: string): string {
    const t = s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9а-яё]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
    return t.length > 0 ? t : 'general';
}

/** Stable id for sociology plan / filters: `sociology:<topicSlug>:<subtopicSlug>`. */
export function sociologyPlanTopicId(topic: string, subtopic: string): string {
    return `${SOCIOLOGY_PLAN_TOPIC_PREFIX}${slugifySociologySegment(topic)}:${slugifySociologySegment(subtopic)}`;
}

export function isSociologyPlanTopicId(id: string): boolean {
    return id.startsWith(SOCIOLOGY_PLAN_TOPIC_PREFIX);
}

/** Readable label for `sociology:…` ids in dashboards (slugs → words). */
export function sociologyPlanTopicIdDisplayLabel(planTopicId: string): string {
    if (!planTopicId.startsWith(SOCIOLOGY_PLAN_TOPIC_PREFIX)) {
        return planTopicId;
    }
    const rest = planTopicId.slice(SOCIOLOGY_PLAN_TOPIC_PREFIX.length);
    return rest.split(':').map((seg) => seg.replace(/-/g, ' ')).join(' — ');
}
