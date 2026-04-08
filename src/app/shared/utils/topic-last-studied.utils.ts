import type { DailyActivity } from '../models/activity.model';
import type { Progress } from '../models/progress.model';
import type { Question } from '../models/question.model';
import { topicIdFromParts } from './topic-key.utils';

/** Shown next to a topic on the Plan page (last read / practice touch). */
export type TopicLastStudiedHint =
    | { kind: 'none' }
    | { kind: 'today' }
    | { kind: 'past'; dateStr: string };

function isSameLocalCalendarDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function parseLocalYmdToDate(ymd: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
    if (!m) {
        return null;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * For each topic id, the latest calendar day it appeared in `coveredTopicIds`
 * (mark studied or answering in Practice).
 */
export function lastCoveredYmdByTopic(activityMap: ReadonlyMap<string, DailyActivity>): Map<string, string> {
    const dates = [...activityMap.keys()].sort((a, b) => a.localeCompare(b));
    const result = new Map<string, string>();
    for (const date of dates) {
        const row = activityMap.get(date);
        for (const tid of row?.coveredTopicIds ?? []) {
            if (typeof tid === 'string' && tid.trim()) {
                result.set(tid.trim(), date);
            }
        }
    }
    return result;
}

/** Latest `lastAnswered` ISO string per topic from practice progress. */
export function lastPracticeIsoByTopic(questions: Question[], progress: Progress[]): Map<string, string> {
    const qById = new Map(questions.map((q) => [q.id, q] as const));
    const byTopic = new Map<string, string>();
    for (const row of progress) {
        if (!row.lastAnswered) {
            continue;
        }
        const q = qById.get(row.questionId);
        if (!q) {
            continue;
        }
        const tid = topicIdFromParts(q.category, q.subtopic);
        const prev = byTopic.get(tid);
        if (!prev || row.lastAnswered > prev) {
            byTopic.set(tid, row.lastAnswered);
        }
    }
    return byTopic;
}

function mergeLastEngagement(ymd: string | undefined, iso: string | undefined): Date | null {
    let best: Date | null = null;
    if (ymd) {
        const d = parseLocalYmdToDate(ymd);
        if (d) {
            best = d;
        }
    }
    if (iso) {
        const d = new Date(iso);
        if (!Number.isNaN(d.getTime())) {
            if (!best || d > best) {
                best = d;
            }
        }
    }
    return best;
}

function formatShortStudyDate(d: Date, lang: 'ru-RU' | 'en-GB'): string {
    const now = new Date();
    const opts: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short'
    };
    if (d.getFullYear() !== now.getFullYear()) {
        opts.year = 'numeric';
    }
    return d.toLocaleDateString(lang, opts);
}

/** One hint per topic that appears in the question catalog. */
export function buildTopicLastStudiedHintMap(
    questions: Question[],
    activityMap: ReadonlyMap<string, DailyActivity>,
    progress: Progress[],
    translateLang: string
): ReadonlyMap<string, TopicLastStudiedHint> {
    const covered = lastCoveredYmdByTopic(activityMap);
    const practice = lastPracticeIsoByTopic(questions, progress);
    const lang: 'ru-RU' | 'en-GB' = translateLang?.toLowerCase().startsWith('ru') ? 'ru-RU' : 'en-GB';

    const topicIds = new Set<string>();
    for (const q of questions) {
        topicIds.add(topicIdFromParts(q.category, q.subtopic));
    }

    const result = new Map<string, TopicLastStudiedHint>();
    for (const tid of topicIds) {
        const d = mergeLastEngagement(covered.get(tid), practice.get(tid));
        if (!d) {
            result.set(tid, { kind: 'none' });
            continue;
        }
        const now = new Date();
        if (isSameLocalCalendarDay(d, now)) {
            result.set(tid, { kind: 'today' });
        } else {
            result.set(tid, { kind: 'past', dateStr: formatShortStudyDate(d, lang) });
        }
    }
    return result;
}
