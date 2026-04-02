import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { Question } from '../../models/question.model';

@Component({
    selector: 'app-answer-blocks',
    imports: [TranslatePipe],
    templateUrl: './answer-blocks.component.html',
    styleUrl: './answer-blocks.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnswerBlocksComponent {
    readonly question = input.required<Question>();
    readonly animated = input(false);
}
