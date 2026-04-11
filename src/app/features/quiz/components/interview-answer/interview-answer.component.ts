import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { Question } from '../../../../shared/models/question.model';
import { AnswerBlocksComponent } from '../../../../shared/components/answer-blocks/answer-blocks.component';
import { SplitQuestionCodePipe } from '../../../../shared/pipes/split-question-code.pipe';

@Component({
    selector: 'app-interview-answer',
    imports: [AnswerBlocksComponent, SplitQuestionCodePipe, TranslatePipe],
    templateUrl: './interview-answer.component.html',
    styleUrl: './interview-answer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewAnswerComponent {
    readonly question = input.required<Question>();
}
