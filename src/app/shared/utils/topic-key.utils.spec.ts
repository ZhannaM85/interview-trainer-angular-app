import { topicIdFromQuestion, topicIdFromParts } from './topic-key.utils';
import type { Question, QuestionCategory } from '../models/question.model';

describe('topicIdFromQuestion', () => {
    it('should produce category:subtopic from a question object', () => {
        const q = { category: 'angular' as QuestionCategory, subtopic: 'signals' };
        expect(topicIdFromQuestion(q)).toBe('angular:signals');
    });

    it('should work with javascript category', () => {
        const q = { category: 'javascript' as QuestionCategory, subtopic: 'closures' };
        expect(topicIdFromQuestion(q)).toBe('javascript:closures');
    });

    it('should work with rxjs category', () => {
        const q = { category: 'rxjs' as QuestionCategory, subtopic: 'operators' };
        expect(topicIdFromQuestion(q)).toBe('rxjs:operators');
    });

    it('should work with custom category', () => {
        const q = { category: 'custom' as QuestionCategory, subtopic: 'my-topic' };
        expect(topicIdFromQuestion(q)).toBe('custom:my-topic');
    });

    it('should work with sociology category', () => {
        const q = { category: 'sociology' as QuestionCategory, subtopic: 'culture' };
        expect(topicIdFromQuestion(q)).toBe('sociology:culture');
    });

    it('should handle subtopics with spaces', () => {
        const q = { category: 'angular' as QuestionCategory, subtopic: 'dependency injection' };
        expect(topicIdFromQuestion(q)).toBe('angular:dependency injection');
    });
});

describe('topicIdFromParts', () => {
    it('should produce category:subtopic from separate arguments', () => {
        expect(topicIdFromParts('angular', 'signals')).toBe('angular:signals');
    });

    it('should work with every category', () => {
        expect(topicIdFromParts('javascript', 'promises')).toBe('javascript:promises');
        expect(topicIdFromParts('rxjs', 'subjects')).toBe('rxjs:subjects');
        expect(topicIdFromParts('custom', 'test')).toBe('custom:test');
        expect(topicIdFromParts('sociology', 'norms')).toBe('sociology:norms');
    });

    it('should handle empty subtopic', () => {
        expect(topicIdFromParts('angular', '')).toBe('angular:');
    });
});
