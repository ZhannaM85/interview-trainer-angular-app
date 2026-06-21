import { buildStudyGuideSections, filterStudyGuideSectionsByDifficulty, filterStudyGuideSectionsBySearch, filterStudyGuideSectionsExcludingTopicIds } from './study-guide-grouping';
import type { Question } from '../../shared/models/question.model';

function makeQuestion(
    id: number,
    category: 'javascript' | 'angular',
    subtopic: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    overrides: Partial<{ question: string; answer: string }> = {}
): Question {
    return {
        id,
        question: overrides.question ?? `Q${id}`,
        answer: overrides.answer ?? '',
        weakAnswer: '',
        technicalAnswer: '',
        interviewAnswer: '',
        codeExample: '',
        readMoreLinks: [],
        subtopic,
        category,
        difficulty
    };
}

describe('filterStudyGuideSectionsBySearch', () => {
    const questions: Question[] = [
        makeQuestion(1, 'javascript', 'closures', 'beginner', { question: 'What is a closure?', answer: 'A function retaining its scope.' }),
        makeQuestion(2, 'javascript', 'closures', 'intermediate', { question: 'Closure use cases', answer: 'Data encapsulation.' }),
        makeQuestion(3, 'angular', 'signals', 'beginner', { question: 'What are Angular signals?', answer: 'Reactive primitives.' }),
        makeQuestion(4, 'angular', 'pipes', 'beginner', { question: 'Built-in pipes', answer: 'DatePipe, CurrencyPipe.' })
    ];

    const sections = buildStudyGuideSections(questions);

    it('returns all sections when query is empty', () => {
        expect(filterStudyGuideSectionsBySearch(sections, '')).toStrictEqual(sections);
    });

    it('matches by question text (case-insensitive)', () => {
        const result = filterStudyGuideSectionsBySearch(sections, 'closure');
        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('javascript');
        expect(result[0].subtopics[0].questions.map((q) => q.id)).toEqual([1, 2]);
    });

    it('matches by answer text', () => {
        const result = filterStudyGuideSectionsBySearch(sections, 'reactive');
        expect(result).toHaveLength(1);
        expect(result[0].subtopics[0].questions[0].id).toBe(3);
    });

    it('matches by subtopic name and includes all questions in that subtopic', () => {
        const result = filterStudyGuideSectionsBySearch(sections, 'signals');
        expect(result).toHaveLength(1);
        expect(result[0].subtopics[0].subtopic).toBe('signals');
        expect(result[0].subtopics[0].questions).toHaveLength(1);
    });

    it('drops subtopics with no matching questions', () => {
        const result = filterStudyGuideSectionsBySearch(sections, 'datepipe');
        expect(result).toHaveLength(1);
        expect(result[0].subtopics).toHaveLength(1);
        expect(result[0].subtopics[0].subtopic).toBe('pipes');
    });

    it('drops categories with no matches', () => {
        const result = filterStudyGuideSectionsBySearch(sections, 'reactive');
        const categories = result.map((c) => c.category);
        expect(categories).not.toContain('javascript');
    });

    it('returns empty array when nothing matches', () => {
        expect(filterStudyGuideSectionsBySearch(sections, 'xyznotfound')).toHaveLength(0);
    });
});

describe('filterStudyGuideSectionsByDifficulty', () => {
    const questions: Question[] = [
        makeQuestion(1, 'javascript', 'closures', 'beginner'),
        makeQuestion(2, 'javascript', 'closures', 'intermediate'),
        makeQuestion(3, 'javascript', 'closures', 'advanced'),
        makeQuestion(4, 'angular', 'signals', 'beginner'),
        makeQuestion(5, 'angular', 'signals', 'advanced')
    ];

    const sections = buildStudyGuideSections(questions);

    it('returns only questions matching the given difficulty', () => {
        const result = filterStudyGuideSectionsByDifficulty(sections, 'beginner');
        expect(result.length).toBe(2);
        for (const cat of result) {
            for (const sub of cat.subtopics) {
                expect(sub.questions.every((q) => q.difficulty === 'beginner')).toBe(true);
            }
        }
    });

    it('drops subtopics that have no questions for the given difficulty', () => {
        const result = filterStudyGuideSectionsByDifficulty(sections, 'intermediate');
        expect(result.length).toBe(1);
        expect(result[0].category).toBe('javascript');
        expect(result[0].subtopics[0].questions).toHaveLength(1);
        expect(result[0].subtopics[0].questions[0].id).toBe(2);
    });

    it('drops categories that have no matching questions', () => {
        const jsOnly: Question[] = [makeQuestion(1, 'javascript', 'closures', 'advanced')];
        const jsSections = buildStudyGuideSections(jsOnly);
        const result = filterStudyGuideSectionsByDifficulty(jsSections, 'beginner');
        expect(result).toHaveLength(0);
    });

    it('returns all matching questions across multiple subtopics', () => {
        const multi: Question[] = [
            makeQuestion(1, 'javascript', 'closures', 'advanced'),
            makeQuestion(2, 'javascript', 'promises', 'advanced'),
            makeQuestion(3, 'javascript', 'promises', 'beginner')
        ];
        const multiSections = buildStudyGuideSections(multi);
        const result = filterStudyGuideSectionsByDifficulty(multiSections, 'advanced');
        expect(result).toHaveLength(1);
        const subs = result[0].subtopics;
        expect(subs).toHaveLength(2);
        expect(subs.every((s) => s.questions.every((q) => q.difficulty === 'advanced'))).toBe(true);
    });
});

describe('filterStudyGuideSectionsExcludingTopicIds', () => {
    const questions: Question[] = [
        makeQuestion(1, 'javascript', 'closures', 'beginner'),
        makeQuestion(2, 'javascript', 'promises', 'intermediate'),
        makeQuestion(3, 'angular', 'signals', 'beginner'),
        makeQuestion(4, 'angular', 'pipes', 'advanced')
    ];

    const sections = buildStudyGuideSections(questions);

    it('returns all sections when excludeSet is empty', () => {
        const result = filterStudyGuideSectionsExcludingTopicIds(sections, new Set());
        expect(result).toHaveLength(2);
        expect(result[0].subtopics).toHaveLength(2);
        expect(result[1].subtopics).toHaveLength(2);
    });

    it('excludes subtopics matching the given topic IDs', () => {
        const result = filterStudyGuideSectionsExcludingTopicIds(sections, new Set(['javascript:closures']));
        expect(result).toHaveLength(2);
        const jsSubs = result.find((c) => c.category === 'javascript')!.subtopics;
        expect(jsSubs).toHaveLength(1);
        expect(jsSubs[0].subtopic).toBe('promises');
    });

    it('drops entire category when all its subtopics are excluded', () => {
        const result = filterStudyGuideSectionsExcludingTopicIds(
            sections,
            new Set(['angular:signals', 'angular:pipes'])
        );
        expect(result).toHaveLength(1);
        expect(result[0].category).toBe('javascript');
    });

    it('returns empty array when all topics are excluded', () => {
        const result = filterStudyGuideSectionsExcludingTopicIds(
            sections,
            new Set(['javascript:closures', 'javascript:promises', 'angular:signals', 'angular:pipes'])
        );
        expect(result).toHaveLength(0);
    });

    it('ignores topic IDs not present in sections', () => {
        const result = filterStudyGuideSectionsExcludingTopicIds(
            sections,
            new Set(['rxjs:observables'])
        );
        expect(result).toHaveLength(2);
        expect(result[0].subtopics).toHaveLength(2);
        expect(result[1].subtopics).toHaveLength(2);
    });
});
