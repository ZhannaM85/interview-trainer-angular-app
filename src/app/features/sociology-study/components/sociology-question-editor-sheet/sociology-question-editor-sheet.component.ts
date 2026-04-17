import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    HostListener,
    OnInit,
    computed,
    inject,
    input,
    output,
    signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SociologyCatalogEditService } from '../../../../core/services/sociology-catalog-edit.service';
import type { SociologyQuestion } from '../../../../shared/models/sociology-question.model';
import type { SociologyQuestionValidationCode } from '../../../../shared/utils/sociology-question-validate.utils';

@Component({
    selector: 'app-sociology-question-editor-sheet',
    imports: [ReactiveFormsModule, TranslatePipe],
    templateUrl: './sociology-question-editor-sheet.component.html',
    styleUrl: './sociology-question-editor-sheet.component.scss',
    changeDetection: ChangeDetectionStrategy.Default
})
export class SociologyQuestionEditorSheetComponent implements OnInit {
    readonly question = input.required<SociologyQuestion>();
    readonly dismissed = output<void>();
    readonly saved = output<void>();

    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    private readonly catalogEdits = inject(SociologyCatalogEditService);

    protected readonly titleId = 'soc-q-edit-title';

    protected form!: FormGroup;
    protected readonly saveErrorKey = signal<SociologyQuestionValidationCode | null>(null);

    protected readonly validationMessageKey = computed(() => {
        const e = this.saveErrorKey();
        return e ? `sociology.validate.${e}` : null;
    });

    ngOnInit(): void {
        this.rebuildForm(this.question());
        this.form
            .get('type')!
            .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (this.form.get('type')!.value === 'single') {
                    this.enforceSingleCorrect();
                }
            });
    }

    protected get options(): FormArray {
        return this.form.get('options') as FormArray;
    }

    private rebuildForm(q: SociologyQuestion): void {
        this.saveErrorKey.set(null);
        this.form = this.fb.group({
            question: [q.question, Validators.required],
            explanation: [q.explanation ?? ''],
            type: [q.type],
            options: this.fb.array(
                q.options.map((text: string, i: number) =>
                    this.fb.group({
                        text: [text, Validators.required],
                        correct: [q.correctIndices.includes(i)]
                    })
                )
            )
        });
    }

    protected onToggleCorrect(index: number, checked: boolean): void {
        const type = this.form.get('type')!.value as 'single' | 'multi';
        if (type === 'single' && checked) {
            this.options.controls.forEach((ctrl, j) => {
                (ctrl as FormGroup).get('correct')?.setValue(j === index, { emitEvent: false });
            });
            return;
        }
        (this.options.at(index) as FormGroup).get('correct')?.setValue(checked);
    }

    protected isCorrectChecked(index: number): boolean {
        return !!(this.options.at(index) as FormGroup).get('correct')?.value;
    }

    protected enforceSingleCorrect(): void {
        let first = -1;
        this.options.controls.forEach((ctrl, j) => {
            if ((ctrl as FormGroup).get('correct')?.value) {
                first = first < 0 ? j : first;
            }
        });
        this.options.controls.forEach((ctrl, j) => {
            (ctrl as FormGroup).get('correct')?.setValue(j === first && first >= 0, { emitEvent: false });
        });
        if (first < 0 && this.options.length > 0) {
            (this.options.at(0) as FormGroup).get('correct')?.setValue(true, { emitEvent: false });
        }
    }

    protected addOption(): void {
        this.options.push(
            this.fb.group({
                text: ['', Validators.required],
                correct: [false]
            })
        );
    }

    protected removeOption(index: number): void {
        if (this.options.length <= 2) {
            return;
        }
        this.options.removeAt(index);
        if (this.form.get('type')!.value === 'single') {
            this.enforceSingleCorrect();
        }
    }

    protected submit(): void {
        this.saveErrorKey.set(null);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const q0 = this.question();
        const v = this.form.getRawValue() as {
            question: string;
            explanation: string;
            type: 'single' | 'multi';
            options: { text: string; correct: boolean }[];
        };
        if (v.type === 'single') {
            this.enforceSingleCorrect();
        }
        const v2 = this.form.getRawValue() as typeof v;
        const correctIndices: number[] = [];
        v2.options.forEach((o, i) => {
            if (o.correct) {
                correctIndices.push(i);
            }
        });
        const built: SociologyQuestion = {
            id: q0.id,
            topic: q0.topic,
            subtopic: q0.subtopic,
            type: v2.type,
            question: v2.question.trim(),
            options: v2.options.map((o) => o.text.trim()),
            correctIndices: [...new Set(correctIndices)].sort((a, b) => a - b),
            explanation: v2.explanation?.trim() ? v2.explanation.trim() : undefined
        };
        const err = this.catalogEdits.saveOverride(built);
        if (err) {
            this.saveErrorKey.set(err);
            return;
        }
        this.saved.emit();
    }

    protected resetToBundled(): void {
        this.catalogEdits.removeOverride(this.question().id);
        this.dismissed.emit();
    }

    protected close(): void {
        this.dismissed.emit();
    }

    @HostListener('document:keydown.escape')
    protected onEscape(): void {
        this.close();
    }
}
