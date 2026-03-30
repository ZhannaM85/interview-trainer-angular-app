import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
    selector: 'app-feedback-buttons',
    imports: [],
    templateUrl: './feedback-buttons.component.html',
    styleUrl: './feedback-buttons.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedbackButtonsComponent {
    readonly answered = output<boolean>();
}
