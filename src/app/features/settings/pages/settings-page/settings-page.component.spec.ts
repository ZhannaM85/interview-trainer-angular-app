import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateService, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { SettingsPageComponent } from './settings-page.component';
import { AiApiKeyService } from '../../../../core/services/ai-api-key.service';

const TRANSLATIONS: TranslationObject = {
    settings: {
        title: 'Settings',
        aiApiKeyHeading: 'AI provider',
        aiApiKeyLabel: 'API key',
        aiApiKeyPlaceholder: 'sk-ant-…',
        aiApiKeyHint: 'Key stored locally.',
        aiApiKeyReveal: 'Show key',
        aiApiKeyHide: 'Hide key',
        aiApiKeySave: 'Save',
        aiApiKeyClear: 'Clear',
        aiApiKeySaved: 'Key saved.',
        aiApiKeyCleared: 'Key cleared.',
        aiApiKeyFormatError: 'Invalid format — keys start with sk-ant-',
        aiApiKeySecurityWarning: 'Key stored locally.'
    }
};

class StubLoader implements TranslateLoader {
    getTranslation(): Observable<TranslationObject> {
        return of(TRANSLATIONS);
    }
}

function setup(): { fixture: ComponentFixture<SettingsPageComponent>; service: AiApiKeyService } {
    TestBed.configureTestingModule({
        imports: [SettingsPageComponent],
        providers: [
            ...provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })
        ]
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', TRANSLATIONS);
    translate.use('en');
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    return { fixture, service: TestBed.inject(AiApiKeyService) };
}

describe('SettingsPageComponent — initial state', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('renders the page title', () => {
        const { fixture } = setup();
        expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Settings');
    });

    it('clear button is disabled when no key is stored', () => {
        const { fixture } = setup();
        const clearBtn = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find((b) => b.textContent?.trim() === 'Clear');
        expect(clearBtn?.disabled).toBe(true);
    });

    it('password input type is password by default (key hidden)', () => {
        const { fixture } = setup();
        const input = fixture.nativeElement.querySelector('#settings-api-key') as HTMLInputElement;
        expect(input.type).toBe('password');
    });
});

describe('SettingsPageComponent — save flow', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('saves a valid key and shows saved status', () => {
        vi.useFakeTimers();
        const { fixture, service } = setup();
        const input = fixture.nativeElement.querySelector('#settings-api-key') as HTMLInputElement;
        input.value = 'sk-ant-testkey';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        const saveBtn = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find((b) => b.textContent?.trim() === 'Save');
        saveBtn?.click();
        fixture.detectChanges();

        expect(service.apiKey()).toBe('sk-ant-testkey');
        const status = fixture.nativeElement.querySelector('.settings__status');
        expect(status?.textContent).toContain('Key saved.');

        vi.useRealTimers();
    });

    it('shows format error for an invalid key', () => {
        const { fixture } = setup();
        const input = fixture.nativeElement.querySelector('#settings-api-key') as HTMLInputElement;
        input.value = 'bad-key-format';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        const saveBtn = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find((b) => b.textContent?.trim() === 'Save');
        saveBtn?.click();
        fixture.detectChanges();

        const error = fixture.nativeElement.querySelector('.settings__error');
        expect(error).toBeTruthy();
    });

    it('does not save when key format is invalid', () => {
        const { fixture, service } = setup();
        const input = fixture.nativeElement.querySelector('#settings-api-key') as HTMLInputElement;
        input.value = 'bad-key-format';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        const saveBtn = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find((b) => b.textContent?.trim() === 'Save');
        saveBtn?.click();

        expect(service.apiKey()).toBe('');
    });
});

describe('SettingsPageComponent — clear flow', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('clear button is enabled after a key is saved, and clears it', () => {
        vi.useFakeTimers();
        const { fixture, service } = setup();
        service.save('sk-ant-abc');
        fixture.detectChanges();

        const clearBtn = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find((b) => b.textContent?.trim() === 'Clear');
        expect(clearBtn?.disabled).toBe(false);
        clearBtn?.click();
        fixture.detectChanges();

        expect(service.apiKey()).toBe('');
        const status = fixture.nativeElement.querySelector('.settings__status');
        expect(status?.textContent).toContain('Key cleared.');

        vi.useRealTimers();
    });
});

describe('SettingsPageComponent — show/hide toggle', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('toggles input type between password and text', () => {
        const { fixture } = setup();
        const input = fixture.nativeElement.querySelector('#settings-api-key') as HTMLInputElement;
        expect(input.type).toBe('password');

        const revealBtn = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
            .find((b) => b.textContent?.trim() === 'Show key');
        revealBtn?.click();
        fixture.detectChanges();

        expect(input.type).toBe('text');
    });
});
