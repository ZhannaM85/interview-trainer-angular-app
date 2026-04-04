import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

import { THEME_STORAGE_KEY, type ThemeId } from '../theme.constants';

const META_THEME_COLOR_DARK = '#0f172a';
const META_THEME_COLOR_LIGHT = '#f8fafc';

function readStoredTheme(): ThemeId | null {
    try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        if (raw === 'light' || raw === 'dark') {
            return raw;
        }
    } catch {
        /* ignore */
    }
    return null;
}

function readThemeFromAttribute(doc: Document): ThemeId | null {
    const raw = doc.documentElement.getAttribute('data-theme');
    return raw === 'light' || raw === 'dark' ? raw : null;
}

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private readonly document = inject(DOCUMENT);

    /** Resolved theme applied to `document.documentElement`. */
    readonly theme = signal<ThemeId>(this.initialTheme());

    constructor() {
        this.applyToDom(this.theme());
    }

    setTheme(next: ThemeId): void {
        if (this.theme() === next) {
            return;
        }
        this.theme.set(next);
        this.applyToDom(next);
        try {
            localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {
            /* ignore */
        }
    }

    toggleTheme(): void {
        this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
    }

    private initialTheme(): ThemeId {
        return readThemeFromAttribute(this.document) ?? readStoredTheme() ?? 'dark';
    }

    private applyToDom(t: ThemeId): void {
        const root = this.document.documentElement;
        root.setAttribute('data-theme', t);
        root.style.colorScheme = t === 'light' ? 'light' : 'dark';

        const meta = this.document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', t === 'light' ? META_THEME_COLOR_LIGHT : META_THEME_COLOR_DARK);
        }
    }
}
