import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
    selector: 'app-interview-feedback',
    imports: [],
    templateUrl: './interview-feedback.component.html',
    styleUrl: './interview-feedback.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewFeedbackComponent {
    readonly headline = input.required<string>();
    readonly scoreDelta = input.required<number>();
    readonly weakArea = input.required<string>();
    readonly nextReviewLabel = input.required<string>();
    readonly next = output<void>();
}
