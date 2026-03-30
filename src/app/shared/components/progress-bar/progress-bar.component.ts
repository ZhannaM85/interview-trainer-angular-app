import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'app-progress-bar',
    imports: [],
    templateUrl: './progress-bar.component.html',
    styleUrl: './progress-bar.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressBarComponent {
    readonly value = input(0);
    readonly max = input(100);
    readonly label = input<string | null>(null);

    protected percent(): number {
        const max = this.max();
        if (max <= 0) {
            return 0;
        }
        return Math.min(100, Math.max(0, (this.value() / max) * 100));
    }
}
