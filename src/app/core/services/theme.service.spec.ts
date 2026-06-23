import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';
import { THEME_STORAGE_KEY } from '../theme.constants';

function setup(opts?: { storedTheme?: string; dataThemeAttr?: string }): ThemeService {
    if (opts?.storedTheme) {
        localStorage.setItem(THEME_STORAGE_KEY, opts.storedTheme);
    }
    TestBed.configureTestingModule({});
    if (opts?.dataThemeAttr) {
        const doc = TestBed.inject(DOCUMENT);
        doc.documentElement.setAttribute('data-theme', opts.dataThemeAttr);
    }
    return TestBed.inject(ThemeService);
}

describe('ThemeService', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        const doc = TestBed.inject(DOCUMENT);
        doc.documentElement.removeAttribute('data-theme');
        doc.documentElement.style.colorScheme = '';
        TestBed.resetTestingModule();
    });

    describe('initial theme resolution', () => {
        it('defaults to dark when no stored theme and no data-theme attribute', () => {
            const svc = setup();
            expect(svc.theme()).toBe('dark');
        });

        it('reads from data-theme attribute when present', () => {
            const svc = setup({ dataThemeAttr: 'light' });
            expect(svc.theme()).toBe('light');
        });

        it('reads from localStorage when no data-theme attribute is set', () => {
            const svc = setup({ storedTheme: 'light' });
            expect(svc.theme()).toBe('light');
        });

        it('prefers data-theme attribute over localStorage', () => {
            const svc = setup({ storedTheme: 'light', dataThemeAttr: 'dark' });
            expect(svc.theme()).toBe('dark');
        });

        it('ignores invalid localStorage value and defaults to dark', () => {
            const svc = setup({ storedTheme: 'blue' });
            expect(svc.theme()).toBe('dark');
        });
    });

    describe('setTheme', () => {
        it('updates the theme signal', () => {
            const svc = setup();
            svc.setTheme('light');
            expect(svc.theme()).toBe('light');
        });

        it('persists to localStorage', () => {
            const svc = setup();
            svc.setTheme('light');
            expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
        });

        it('applies data-theme attribute to documentElement', () => {
            const svc = setup();
            const doc = TestBed.inject(DOCUMENT);
            svc.setTheme('light');
            expect(doc.documentElement.getAttribute('data-theme')).toBe('light');
        });

        it('sets colorScheme on documentElement', () => {
            const svc = setup();
            const doc = TestBed.inject(DOCUMENT);
            svc.setTheme('light');
            expect(doc.documentElement.style.colorScheme).toBe('light');
            svc.setTheme('dark');
            expect(doc.documentElement.style.colorScheme).toBe('dark');
        });

        it('is a no-op when theme is already the same', () => {
            const svc = setup();
            expect(svc.theme()).toBe('dark');
            const themeBefore = svc.theme();
            svc.setTheme('dark');
            expect(svc.theme()).toBe(themeBefore);
            expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
        });

        it('updates meta theme-color when the meta tag exists', () => {
            const svc = setup();
            const doc = TestBed.inject(DOCUMENT);
            const meta = doc.createElement('meta');
            meta.setAttribute('name', 'theme-color');
            meta.setAttribute('content', '');
            doc.head.appendChild(meta);

            svc.setTheme('light');
            expect(meta.getAttribute('content')).toBe('#f8fafc');
            svc.setTheme('dark');
            expect(meta.getAttribute('content')).toBe('#0f172a');

            doc.head.removeChild(meta);
        });
    });

    describe('toggleTheme', () => {
        it('switches from dark to light', () => {
            const svc = setup();
            expect(svc.theme()).toBe('dark');
            svc.toggleTheme();
            expect(svc.theme()).toBe('light');
        });

        it('switches from light to dark', () => {
            const svc = setup({ storedTheme: 'light' });
            expect(svc.theme()).toBe('light');
            svc.toggleTheme();
            expect(svc.theme()).toBe('dark');
        });

        it('persists toggled theme to localStorage', () => {
            const svc = setup();
            svc.toggleTheme();
            expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
            svc.toggleTheme();
            expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
        });
    });
});
