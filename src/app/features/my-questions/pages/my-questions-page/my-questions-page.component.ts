import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { CustomQuestionService } from '../../../../core/services/custom-question.service';
import type { CustomQuestion } from '../../../../shared/models/custom-question.model';
import type { QuestionDifficulty } from '../../../../shared/models/question.model';

@Component({
    selector: 'app-my-questions-page',
    imports: [TranslatePipe],
    templateUrl: './my-questions-page.component.html',
    styleUrl: './my-questions-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MyQuestionsPageComponent {
    protected readonly customQuestionService = inject(CustomQuestionService);
    private readonly translate = inject(TranslateService);

    protected readonly questions = this.customQuestionService.questions;

    protected readonly mode = signal<'add' | 'edit'>('add');
    protected readonly editingId = signal<number | null>(null);
    protected readonly formQuestion = signal('');
    protected readonly formAnswer = signal('');
    protected readonly formSubtopic = signal('');
    protected readonly formDifficulty = signal<QuestionDifficulty>('beginner');
    protected readonly submitted = signal(false);

    protected readonly toast = signal<{ message: string; type: 'success' | 'error' } | null>(null);
    private toastTimer: ReturnType<typeof setTimeout> | null = null;

    protected readonly difficulties: QuestionDifficulty[] = ['beginner', 'intermediate', 'advanced'];

    protected readonly isFormValid = computed(
        () =>
            this.formQuestion().trim().length > 0 &&
            this.formAnswer().trim().length > 0 &&
            this.formSubtopic().trim().length > 0
    );

    protected onSave(): void {
        this.submitted.set(true);
        if (!this.isFormValid()) {
            return;
        }
        const draft = {
            question: this.formQuestion(),
            answer: this.formAnswer(),
            subtopic: this.formSubtopic(),
            difficulty: this.formDifficulty()
        };
        if (this.mode() === 'edit' && this.editingId() !== null) {
            this.customQuestionService.update(this.editingId()!, draft);
        } else {
            this.customQuestionService.add(draft);
        }
        this.resetForm();
    }

    protected onEdit(q: CustomQuestion): void {
        this.mode.set('edit');
        this.editingId.set(q.id);
        this.formQuestion.set(q.question);
        this.formAnswer.set(q.answer);
        this.formSubtopic.set(q.subtopic);
        this.formDifficulty.set(q.difficulty);
        this.submitted.set(false);
    }

    protected onDelete(id: number, questionText: string): void {
        if (window.confirm(`Delete "${questionText}"?`)) {
            this.customQuestionService.delete(id);
            if (this.editingId() === id) {
                this.resetForm();
            }
        }
    }

    protected onCancel(): void {
        this.resetForm();
    }

    protected onExport(): void {
        const data = JSON.stringify(this.customQuestionService.questions(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'my-questions.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    protected onFileChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed: unknown = JSON.parse(reader.result as string);
                if (!Array.isArray(parsed)) throw new Error('not-array');
                const { added, skipped } = this.customQuestionService.importFrom(parsed);
                const msg = this.translate.instant('myQuestions.importSuccess', { added, skipped });
                this.showToast(msg, 'success');
            } catch {
                this.showToast(this.translate.instant('myQuestions.importError'), 'error');
            }
            input.value = '';
        };
        reader.readAsText(file);
    }

    private showToast(message: string, type: 'success' | 'error'): void {
        if (this.toastTimer !== null) clearTimeout(this.toastTimer);
        this.toast.set({ message, type });
        this.toastTimer = setTimeout(() => this.toast.set(null), 4000);
    }

    protected onFormQuestionInput(event: Event): void {
        this.formQuestion.set((event.target as HTMLTextAreaElement).value);
    }

    protected onFormAnswerInput(event: Event): void {
        this.formAnswer.set((event.target as HTMLTextAreaElement).value);
    }

    protected onFormSubtopicInput(event: Event): void {
        this.formSubtopic.set((event.target as HTMLInputElement).value);
    }

    protected onFormDifficultyChange(event: Event): void {
        this.formDifficulty.set((event.target as HTMLSelectElement).value as QuestionDifficulty);
    }

    private resetForm(): void {
        this.mode.set('add');
        this.editingId.set(null);
        this.formQuestion.set('');
        this.formAnswer.set('');
        this.formSubtopic.set('');
        this.formDifficulty.set('beginner');
        this.submitted.set(false);
    }
}
