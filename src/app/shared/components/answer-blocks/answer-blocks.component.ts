import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { Question } from '../../models/question.model';

@Component({
    selector: 'app-answer-blocks',
    templateUrl: './answer-blocks.component.html',
    styleUrl: './answer-blocks.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnswerBlocksComponent {
    readonly question = input.required<Question>();
    readonly animated = input(false);
}
