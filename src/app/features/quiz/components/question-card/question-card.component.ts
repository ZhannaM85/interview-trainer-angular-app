import {
    ChangeDetectionStrategy,
    Component,
    effect,
    input,
    output,
    signal
} from '@angular/core';

import type { Question } from '../../../../shared/models/question.model';
import { AnswerPanelComponent } from '../answer-panel/answer-panel.component';

@Component({
    selector: 'app-question-card',
    imports: [AnswerPanelComponent],
    templateUrl: './question-card.component.html',
    styleUrl: './question-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuestionCardComponent {
    readonly question = input.required<Question>();
    readonly flippedChange = output<boolean>();

    protected readonly flipped = signal(false);

    constructor() {
        effect(() => {
            this.question();
            this.flipped.set(false);
            this.flippedChange.emit(false);
        });
    }

    protected toggleFlip(): void {
        this.flipped.update((v) => !v);
        this.flippedChange.emit(this.flipped());
    }
}
