import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { AiApiKeyService } from '../../../../core/services/ai-api-key.service';

@Component({
    selector: 'app-settings-page',
    imports: [TranslatePipe],
    templateUrl: './settings-page.component.html',
    styleUrl: './settings-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {
    private readonly aiApiKeyService = inject(AiApiKeyService);

    protected readonly inputValue = signal<string>(this.aiApiKeyService.apiKey());
    protected readonly showKey = signal(false);
    protected readonly submitted = signal(false);
    protected readonly saveStatus = signal<'saved' | 'cleared' | null>(null);
    private statusTimer: ReturnType<typeof setTimeout> | null = null;

    protected readonly hasKey = computed(() => this.aiApiKeyService.apiKey().length > 0);

    protected readonly formatError = computed(
        () => this.submitted() && !this.aiApiKeyService.isValidFormat(this.inputValue())
    );

    protected onInput(event: Event): void {
        this.inputValue.set((event.target as HTMLInputElement).value);
        this.submitted.set(false);
    }

    protected onSave(): void {
        this.submitted.set(true);
        if (!this.aiApiKeyService.isValidFormat(this.inputValue())) {
            return;
        }
        this.aiApiKeyService.save(this.inputValue());
        this.setStatus('saved');
    }

    protected onClear(): void {
        this.aiApiKeyService.clear();
        this.inputValue.set('');
        this.submitted.set(false);
        this.setStatus('cleared');
    }

    protected onToggleVisibility(): void {
        this.showKey.update((v) => !v);
    }

    private setStatus(status: 'saved' | 'cleared'): void {
        if (this.statusTimer !== null) clearTimeout(this.statusTimer);
        this.saveStatus.set(status);
        this.statusTimer = setTimeout(() => this.saveStatus.set(null), 3000);
    }
}
