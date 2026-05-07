import { buildStudyGuideSections, filterStudyGuideSectionsByDifficulty } from './study-guide-grouping';
import type { Question } from '../../shared/models/question.model';

function makeQuestion(
    id: number,
    category: 'javascript' | 'angular',
    subtopic: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced'
): Question {
    return {
        id,
        question: `Q${id}`,
        answer: '',
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
