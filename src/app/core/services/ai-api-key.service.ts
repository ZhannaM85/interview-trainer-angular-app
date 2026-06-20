import { Injectable, inject, signal } from '@angular/core';

import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AiApiKeyService {
    private readonly storage = inject(StorageService);
    private static readonly KEY = 'ai-api-key';

    private readonly _apiKey = signal<string>(
        this.storage.get<string>(AiApiKeyService.KEY) ?? ''
    );

    readonly apiKey = this._apiKey.asReadonly();

    save(key: string): void {
        const trimmed = key.trim();
        this._apiKey.set(trimmed);
        if (trimmed) {
            this.storage.set(AiApiKeyService.KEY, trimmed);
        } else {
            this.storage.remove(AiApiKeyService.KEY);
        }
    }

    clear(): void {
        this._apiKey.set('');
        this.storage.remove(AiApiKeyService.KEY);
    }

    isValidFormat(key: string): boolean {
        const trimmed = key.trim();
        return trimmed === '' || trimmed.startsWith('sk-ant-');
    }
}
