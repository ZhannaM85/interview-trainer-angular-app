import { formatLocalYmd } from './local-date.utils';

describe('formatLocalYmd', () => {
    it('should format a date as YYYY-MM-DD', () => {
        const date = new Date(2024, 0, 15); // Jan 15, 2024
        expect(formatLocalYmd(date)).toBe('2024-01-15');
    });

    it('should zero-pad single-digit month', () => {
        const date = new Date(2024, 2, 5); // Mar 5
        expect(formatLocalYmd(date)).toBe('2024-03-05');
    });

    it('should zero-pad single-digit day', () => {
        const date = new Date(2024, 11, 3); // Dec 3
        expect(formatLocalYmd(date)).toBe('2024-12-03');
    });

    it('should handle double-digit month and day without extra padding', () => {
        const date = new Date(2024, 10, 25); // Nov 25
        expect(formatLocalYmd(date)).toBe('2024-11-25');
    });

    it('should handle the last day of the year', () => {
        const date = new Date(2023, 11, 31); // Dec 31
        expect(formatLocalYmd(date)).toBe('2023-12-31');
    });

    it('should handle the first day of the year', () => {
        const date = new Date(2023, 0, 1); // Jan 1
        expect(formatLocalYmd(date)).toBe('2023-01-01');
    });

    it('should use local date, not UTC', () => {
        // Create a date at midnight local time; getFullYear/getMonth/getDate are local
        const date = new Date(2025, 5, 15, 0, 0, 0);
        expect(formatLocalYmd(date)).toBe('2025-06-15');
    });
});
