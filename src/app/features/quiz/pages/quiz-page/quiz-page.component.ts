import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { take } from 'rxjs';

import { ProgressService } from '../../../../core/services/progress.service';
import { QuestionService } from '../../../../core/services/question.service';
import type { Question } from '../../../../shared/models/question.model';
import { FeedbackButtonsComponent } from '../../components/feedback-buttons/feedback-buttons.component';
import { QuestionCardComponent } from '../../components/question-card/question-card.component';

@Component({
    selector: 'app-quiz-page',
    imports: [QuestionCardComponent, FeedbackButtonsComponent],
    templateUrl: './quiz-page.component.html',
    styleUrl: './quiz-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizPageComponent {
    private readonly questionService = inject(QuestionService);
    private readonly progressService = inject(ProgressService);

    protected readonly currentQuestion = signal<Question | null>(null);
    protected readonly flipped = signal(false);
    protected readonly sessionComplete = signal(false);
    protected readonly loadError = signal(false);
    protected readonly loading = signal(true);
    protected readonly usingFallbackQueue = signal(false);

    constructor() {
        this.loadQuiz();
    }

    protected onFlippedChange(isFlipped: boolean): void {
        this.flipped.set(isFlipped);
    }

    protected onAnswered(correct: boolean): void {
        const q = this.currentQuestion();
        if (!q) {
            return;
        }
        this.progressService.recordAnswer(q.id, correct);
        this.flipped.set(false);
        this.advanceToNextQuestion();
    }

    protected restartSession(): void {
        this.loadQuiz();
    }

    private loadQuiz(): void {
        this.loading.set(true);
        this.loadError.set(false);
        this.sessionComplete.set(false);
        this.currentQuestion.set(null);
        this.questionService
            .getQuestions()
            .pipe(take(1))
            .subscribe({
                next: (all) => {
                    const due = this.progressService.getDueQuestionsSync(all);
                    const useFallback = due.length === 0;
                    this.usingFallbackQueue.set(useFallback);
                    const queue = useFallback ? all : due;
                    this.questionService.initializeQueue(queue);
                    this.loading.set(false);
                    this.advanceToNextQuestion();
                },
                error: () => {
                    this.loadError.set(true);
                    this.loading.set(false);
                }
            });
    }

    private advanceToNextQuestion(): void {
        const next = this.questionService.getNextQuestion();
        this.currentQuestion.set(next);
        if (!next) {
            this.sessionComplete.set(true);
        }
    }
}
