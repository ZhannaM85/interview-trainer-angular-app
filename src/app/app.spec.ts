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
            }
        } satisfies TranslationObject);
    }
}

describe('App', () => {
    beforeEach(async () => {
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
});
