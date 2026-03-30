import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Question } from '../../../../shared/models/question.model';
import type { SelfRating } from '../../../../shared/models/self-rating.model';
import { SelfEvaluationComponent } from '../self-evaluation/self-evaluation.component';

@Component({
    selector: 'app-interview-answer',
    imports: [SelfEvaluationComponent],
    templateUrl: './interview-answer.component.html',
    styleUrl: './interview-answer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewAnswerComponent {
    readonly question = input.required<Question>();
    readonly rated = output<SelfRating>();
}
