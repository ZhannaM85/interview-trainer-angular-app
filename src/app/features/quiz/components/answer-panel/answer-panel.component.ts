import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { Question } from '../../../../shared/models/question.model';

@Component({
    selector: 'app-answer-panel',
    imports: [],
    templateUrl: './answer-panel.component.html',
    styleUrl: './answer-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnswerPanelComponent {
    readonly question = input.required<Question>();
}
