import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { Question } from '../../../../shared/models/question.model';
import { QuizTimerComponent } from '../quiz-timer/quiz-timer.component';

@Component({
    selector: 'app-interview-question',
    imports: [QuizTimerComponent],
    templateUrl: './interview-question.component.html',
    styleUrl: './interview-question.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewQuestionComponent {
    readonly question = input.required<Question>();
    readonly durationSeconds = input(30);
    readonly answered = output<void>();
    readonly timerExpired = output<void>();

    protected categoryLabel(cat: string): string {
        return cat.charAt(0).toUpperCase() + cat.slice(1);
    }

    protected difficultyLabel(d: string): string {
        return d.charAt(0).toUpperCase() + d.slice(1);
    }
}
