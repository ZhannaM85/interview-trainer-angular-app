import type { SociologyQuestion } from '../models/sociology-question.model';

export type SociologyQuestionValidationCode =
    | 'EMPTY_QUESTION'
    | 'TOO_FEW_OPTIONS'
    | 'NO_CORRECT'
    | 'CORRECT_OUT_OF_RANGE'
    | 'SINGLE_REQUIRES_ONE_CORRECT'
    | 'EMPTY_OPTION_TEXT';

/**
 * Returns a machine code if invalid, otherwise `null`.
 * Used with i18n keys `sociology.validate.*`.
 */
export function validateSociologyQuestion(q: SociologyQuestion): SociologyQuestionValidationCode | null {
    if (!q.question || !q.question.trim()) {
        return 'EMPTY_QUESTION';
    }
    if (q.options.length < 2) {
        return 'TOO_FEW_OPTIONS';
    }
    for (const opt of q.options) {
        if (!opt || !String(opt).trim()) {
            return 'EMPTY_OPTION_TEXT';
        }
    }
    const uniqCorrect = [...new Set(q.correctIndices)].sort((a, b) => a - b);
    if (uniqCorrect.length < 1) {
        return 'NO_CORRECT';
    }
    for (const i of uniqCorrect) {
        if (!Number.isInteger(i) || i < 0 || i >= q.options.length) {
            return 'CORRECT_OUT_OF_RANGE';
        }
    }
    if (q.type === 'single' && uniqCorrect.length !== 1) {
        return 'SINGLE_REQUIRES_ONE_CORRECT';
    }
    return null;
}
