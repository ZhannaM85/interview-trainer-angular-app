import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    effect,
    inject,
    input,
    output,
    signal
} from '@angular/core';

@Component({
    selector: 'app-quiz-timer',
    templateUrl: './quiz-timer.component.html',
    styleUrl: './quiz-timer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizTimerComponent {
    private readonly destroyRef = inject(DestroyRef);

    /** Resets countdown when this value changes. */
    readonly resetKey = input.required<number>();
    readonly durationSeconds = input(30);
    readonly expired = output<void>();

    protected readonly remaining = signal(0);
    private timerId: ReturnType<typeof setInterval> | null = null;

    constructor() {
        const dr = this.destroyRef;
        effect(() => {
            this.resetKey();
            this.durationSeconds();
            this.start();
        });
        dr.onDestroy(() => this.stop());
    }

    private start(): void {
        this.stop();
        const total = Math.max(1, this.durationSeconds());
        this.remaining.set(total);
        this.timerId = setInterval(() => {
            this.remaining.update((r) => r - 1);
            if (this.remaining() <= 0) {
                this.stop();
                this.expired.emit();
            }
        }, 1000);
    }

    private stop(): void {
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    protected formattedTime(): string {
        const r = Math.max(0, this.remaining());
        const m = Math.floor(r / 60);
        const s = r % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    protected urgencyClass(): string {
        const r = this.remaining();
        const total = this.durationSeconds();
        if (r <= 5) {
            return 'quiz-timer--critical';
        }
        if (r <= total * 0.33) {
            return 'quiz-timer--warn';
        }
        return 'quiz-timer--ok';
    }
}
