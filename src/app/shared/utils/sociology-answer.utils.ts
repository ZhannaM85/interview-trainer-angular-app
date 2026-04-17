import type { SociologyQuestion } from '../models/sociology-question.model';

export type SociologyOutcome = 'correct' | 'partial' | 'wrong';

export function evaluateSociologySelection(
    q: SociologyQuestion,
    selectedIndices: readonly number[]
): SociologyOutcome {
    const selected = new Set(selectedIndices);
    const correct = new Set(q.correctIndices);
    if (selected.size === correct.size && [...selected].every((i) => correct.has(i))) {
        return 'correct';
    }
    let overlap = 0;
    for (const i of selected) {
        if (correct.has(i)) {
            overlap += 1;
        }
    }
    if (overlap === 0) {
        return 'wrong';
    }
    return 'partial';
}
