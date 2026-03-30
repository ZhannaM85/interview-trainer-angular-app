import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ProgressBarComponent } from '../../../../shared/components/progress-bar/progress-bar.component';

@Component({
    selector: 'app-interview-feedback',
    imports: [ProgressBarComponent],
    templateUrl: './interview-feedback.component.html',
    styleUrl: './interview-feedback.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewFeedbackComponent {
    readonly headline = input.required<string>();
    readonly scoreDelta = input.required<number>();
    readonly weakArea = input.required<string>();
    readonly nextReviewLabel = input.required<string>();
    /** Optional session progress 0–100 for thin bar. */
    readonly sessionProgressPct = input<number | null>(null);
    readonly next = output<void>();
}
