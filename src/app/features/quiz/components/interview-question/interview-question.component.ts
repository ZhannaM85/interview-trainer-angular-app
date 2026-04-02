import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import type { Question } from '../../../../shared/models/question.model';
import { QuizTimerComponent } from '../quiz-timer/quiz-timer.component';

@Component({
    selector: 'app-interview-question',
    imports: [QuizTimerComponent, TranslatePipe],
    templateUrl: './interview-question.component.html',
    styleUrl: './interview-question.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewQuestionComponent {
    readonly question = input.required<Question>();
    readonly durationSeconds = input(30);
    readonly answered = output<void>();
    readonly timerExpired = output<void>();
}
