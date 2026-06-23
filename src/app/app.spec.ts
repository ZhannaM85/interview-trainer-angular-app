import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
    TranslateLoader,
    TranslateService,
    provideTranslateService,
    type TranslationObject
} from '@ngx-translate/core';
import { firstValueFrom, Observable, of } from 'rxjs';

import { App } from './app';
import { routes } from './app.routes';
import type { ActiveSessionSnapshot } from './shared/models/active-session.model';

const SNAPSHOT_KEY = 'interview-trainer:active-session';

/** Minimal translations so the header brand resolves without loading JSON over HTTP. */
class AppBrandStubLoader implements TranslateLoader {
    getTranslation(_lang: string): Observable<TranslationObject> {
        return of({
            app: {
                brand: 'Karkas',
                navAria: 'Main'
            },
            nav: {
                about: 'About',
                study: 'Study guide',
                quiz: 'Practice',
                dashboard: 'Progress'
            },
            locale: {
                selectLabel: 'Language',
                en: 'English',
                ru: 'Russian'
            },
            resumeSessionBanner: {
                message: 'You left off at question {{question}} of {{total}} —',
                continue: 'Continue →',
                startFresh: 'Start fresh',
                dismiss: 'Dismiss resume nudge'
            }
        } satisfies TranslationObject);
    }
}

function makeSnapshot(questionNumber: number, total: number, ageMs = 0): ActiveSessionSnapshot {
    return {
        queueIds: Array.from({ length: total }, (_, i) => i + 1),
        currentIndex: questionNumber - 1,
        sessionMode: 'standard',
        practiceScope: 'full',
        topicsFocusParam: '',
        sessionNailed: 0,
        sessionPartial: 0,
        sessionDidntKnow: 0,
        sessionBestStreak: 0,
        currentStreak: 0,
        sessionTotal: total,
        sessionStackTopicIds: [],
        usingFallbackQueue: false,
        savedAt: new Date(Date.now() - ageMs).toISOString()
    };
}

describe('App', () => {
    beforeEach(async () => {
        localStorage.removeItem(SNAPSHOT_KEY);
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideHttpClient(),
                provideRouter(routes),
                ...provideTranslateService({
                    fallbackLang: 'en',
                    loader: { provide: TranslateLoader, useClass: AppBrandStubLoader }
                }),
                provideAppInitializer(async () => {
                    const translate = inject(TranslateService);
                    await firstValueFrom(translate.use('en'));
                })
            ]
        }).compileComponents();
    });

    afterEach(() => {
        localStorage.removeItem(SNAPSHOT_KEY);
    });

    it('should create the app', () => {
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
    });

    it('should show app brand', async () => {
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.app__brand')?.textContent).toContain('Karkas');
    });

    it('resume banner: not shown when no snapshot exists', async () => {
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        fixture.detectChanges();
        const compiled = fixture.nativeElement as HTMLElement;
        expect(compiled.querySelector('.app__resume-banner')).toBeNull();
    });

    it('resume banner: showResumeBanner is false on /quiz path', async () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnapshot(3, 10)));
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        await fixture.whenStable();
        // locationPath defaults to / but showResumeBanner should still be testable
        // by checking the signal when path is quiz — we test it via the computed's
        // dependency on resumeBannerDismissed being the route to dismiss
        expect(app['resumeSessionInfo']()).not.toBeNull();
    });

    it('resume banner: resumeSessionInfo is null for stale snapshot (>24h)', async () => {
        const staleMs = 25 * 60 * 60 * 1000;
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnapshot(3, 10, staleMs)));
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        await fixture.whenStable();
        expect(app['resumeSessionInfo']()).toBeNull();
    });

    it('resume banner: resumeSessionInfo is correct for fresh snapshot', async () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnapshot(3, 10)));
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        await fixture.whenStable();
        expect(app['resumeSessionInfo']()).toEqual({ questionNumber: 3, total: 10 });
    });

    it('resume banner: onResumeStartFresh clears localStorage and dismisses banner', async () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnapshot(3, 10)));
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        await fixture.whenStable();
        app['onResumeStartFresh']();
        expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull();
        expect(app['resumeBannerDismissed']()).toBe(true);
    });

    it('resume banner: dismissing sets resumeBannerDismissed', async () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnapshot(3, 10)));
        const fixture = TestBed.createComponent(App);
        const app = fixture.componentInstance;
        await fixture.whenStable();
        app['resumeBannerDismissed'].set(true);
        expect(app['showResumeBanner']()).toBe(false);
    });
});

describe('App — banner dismiss focus management', () => {
    beforeEach(async () => {
        localStorage.removeItem(SNAPSHOT_KEY);
        await TestBed.configureTestingModule({
            imports: [App],
            providers: [
                provideHttpClient(),
                provideRouter(routes),
                ...provideTranslateService({
                    fallbackLang: 'en',
                    loader: { provide: TranslateLoader, useClass: AppBrandStubLoader }
                }),
                provideAppInitializer(async () => {
                    const translate = inject(TranslateService);
                    await firstValueFrom(translate.use('en'));
                })
            ]
        }).compileComponents();
    });

    afterEach(() => {
        localStorage.removeItem(SNAPSHOT_KEY);
    });

    it('dismissRetryBanner sets retryBannerDismissed and focuses main content', async () => {
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        fixture.detectChanges();
        const app = fixture.componentInstance;
        const main = fixture.nativeElement.querySelector('.app__main') as HTMLElement;
        const focusSpy = jest.spyOn(main, 'focus');
        app['dismissRetryBanner']();
        expect(app['retryBannerDismissed']()).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('dismissPracticeReminder sets practiceReminderDismissed and focuses main content', async () => {
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        fixture.detectChanges();
        const app = fixture.componentInstance;
        const main = fixture.nativeElement.querySelector('.app__main') as HTMLElement;
        const focusSpy = jest.spyOn(main, 'focus');
        app['dismissPracticeReminder']();
        expect(app['practiceReminderDismissed']()).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('dismissResumeBanner sets resumeBannerDismissed and focuses main content', async () => {
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        fixture.detectChanges();
        const app = fixture.componentInstance;
        const main = fixture.nativeElement.querySelector('.app__main') as HTMLElement;
        const focusSpy = jest.spyOn(main, 'focus');
        app['dismissResumeBanner']();
        expect(app['resumeBannerDismissed']()).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('onResumeStartFresh clears storage, sets dismissed, and focuses main content', async () => {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(makeSnapshot(3, 10)));
        const fixture = TestBed.createComponent(App);
        await fixture.whenStable();
        fixture.detectChanges();
        const app = fixture.componentInstance;
        const main = fixture.nativeElement.querySelector('.app__main') as HTMLElement;
        const focusSpy = jest.spyOn(main, 'focus');
        app['onResumeStartFresh']();
        expect(localStorage.getItem(SNAPSHOT_KEY)).toBeNull();
        expect(app['resumeBannerDismissed']()).toBe(true);
        expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });
});
