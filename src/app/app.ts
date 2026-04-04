import { DOCUMENT } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter, fromEvent } from 'rxjs';

import { LOCALE_STORAGE_KEY } from './core/locale.constants';
import { ThemeService } from './core/services/theme.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    private readonly translate = inject(TranslateService);
    private readonly document = inject(DOCUMENT);
    private readonly router = inject(Router);
    protected readonly themeService = inject(ThemeService);

    protected readonly currentLang = signal<'en' | 'ru'>('en');
    protected readonly navMenuOpen = signal(false);

    constructor() {
        this.currentLang.set(this.normalizeLang(this.translate.currentLang));
        this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe((e) => {
            this.currentLang.set(this.normalizeLang(e.lang));
            this.document.documentElement.lang = e.lang;
        });

        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => this.navMenuOpen.set(false));

        fromEvent(window, 'resize')
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                if (window.matchMedia('(min-width: 768px)').matches) {
                    this.navMenuOpen.set(false);
                }
            });
    }

    @HostListener('document:keydown.escape')
    protected onEscapeCloseMenu(): void {
        if (this.navMenuOpen()) {
            this.navMenuOpen.set(false);
        }
    }

    protected toggleNavMenu(): void {
        this.navMenuOpen.update((open) => !open);
    }

    protected closeNavMenu(): void {
        this.navMenuOpen.set(false);
    }

    protected onLocaleChange(raw: string): void {
        const lang = this.normalizeLang(raw);
        localStorage.setItem(LOCALE_STORAGE_KEY, lang);
        this.translate.use(lang).subscribe();
    }

    protected onThemeToggle(): void {
        this.themeService.toggleTheme();
    }

    private normalizeLang(lang: string | undefined): 'en' | 'ru' {
        return lang === 'ru' ? 'ru' : 'en';
    }
}
