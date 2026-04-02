import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { LOCALE_STORAGE_KEY } from './core/locale.constants';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    private readonly translate = inject(TranslateService);
    private readonly document = inject(DOCUMENT);

    protected readonly currentLang = signal<'en' | 'ru'>('en');

    constructor() {
        this.currentLang.set(this.normalizeLang(this.translate.currentLang));
        this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe((e) => {
            this.currentLang.set(this.normalizeLang(e.lang));
            this.document.documentElement.lang = e.lang;
        });
    }

    protected onLocaleChange(raw: string): void {
        const lang = this.normalizeLang(raw);
        localStorage.setItem(LOCALE_STORAGE_KEY, lang);
        this.translate.use(lang).subscribe();
    }

    private normalizeLang(lang: string | undefined): 'en' | 'ru' {
        return lang === 'ru' ? 'ru' : 'en';
    }
}
