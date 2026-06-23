import {
    SOCIOLOGY_PLAN_TOPIC_PREFIX,
    slugifySociologySegment,
    sociologyPlanTopicId,
    isSociologyPlanTopicId,
    sociologyPlanTopicIdDisplayLabel,
} from './sociology-topic-key.utils';

describe('SOCIOLOGY_PLAN_TOPIC_PREFIX', () => {
    it('should be "sociology:"', () => {
        expect(SOCIOLOGY_PLAN_TOPIC_PREFIX).toBe('sociology:');
    });
});

describe('slugifySociologySegment', () => {
    it('should lowercase the input', () => {
        expect(slugifySociologySegment('Hello')).toBe('hello');
    });

    it('should replace non-alphanumeric characters with hyphens', () => {
        expect(slugifySociologySegment('foo bar/baz')).toBe('foo-bar-baz');
    });

    it('should collapse multiple hyphens into one', () => {
        expect(slugifySociologySegment('a---b')).toBe('a-b');
    });

    it('should strip leading and trailing hyphens', () => {
        expect(slugifySociologySegment('--hello--')).toBe('hello');
    });

    it('should handle Cyrillic characters (preserved by regex)', () => {
        expect(slugifySociologySegment('Общество и культура')).toBe('общество-и-культура');
    });

    it('should return "general" for empty string', () => {
        expect(slugifySociologySegment('')).toBe('general');
    });

    it('should return "general" for whitespace-only string', () => {
        expect(slugifySociologySegment('   ')).toBe('general');
    });

    it('should return "general" when all characters are non-alphanumeric', () => {
        expect(slugifySociologySegment('!@#$%')).toBe('general');
    });

    it('should trim whitespace before processing', () => {
        expect(slugifySociologySegment('  test  ')).toBe('test');
    });
});

describe('sociologyPlanTopicId', () => {
    it('should produce sociology:<topicSlug>:<subtopicSlug>', () => {
        expect(sociologyPlanTopicId('Culture', 'Norms')).toBe('sociology:culture:norms');
    });

    it('should slugify both topic and subtopic', () => {
        expect(sociologyPlanTopicId('Social Groups', 'In groups & Out groups'))
            .toBe('sociology:social-groups:in-groups-out-groups');
    });

    it('should handle Cyrillic topic and subtopic', () => {
        expect(sociologyPlanTopicId('Общество', 'Культура'))
            .toBe('sociology:общество:культура');
    });
});

describe('isSociologyPlanTopicId', () => {
    it('should return true for ids starting with "sociology:"', () => {
        expect(isSociologyPlanTopicId('sociology:culture:norms')).toBe(true);
    });

    it('should return true for just the prefix', () => {
        expect(isSociologyPlanTopicId('sociology:')).toBe(true);
    });

    it('should return false for non-sociology ids', () => {
        expect(isSociologyPlanTopicId('javascript:closures')).toBe(false);
    });

    it('should return false for partial prefix match', () => {
        expect(isSociologyPlanTopicId('sociolog:test')).toBe(false);
    });

    it('should return false for empty string', () => {
        expect(isSociologyPlanTopicId('')).toBe(false);
    });
});

describe('sociologyPlanTopicIdDisplayLabel', () => {
    it('should convert slugs to spaced words joined by em dash', () => {
        expect(sociologyPlanTopicIdDisplayLabel('sociology:social-groups:in-groups'))
            .toBe('social groups — in groups');
    });

    it('should return the input unchanged if it does not start with the prefix', () => {
        expect(sociologyPlanTopicIdDisplayLabel('javascript:closures'))
            .toBe('javascript:closures');
    });

    it('should handle single segment after prefix', () => {
        expect(sociologyPlanTopicIdDisplayLabel('sociology:culture'))
            .toBe('culture');
    });

    it('should handle multiple colon-separated segments', () => {
        expect(sociologyPlanTopicIdDisplayLabel('sociology:a-b:c-d:e-f'))
            .toBe('a b — c d — e f');
    });
});
