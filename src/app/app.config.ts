import { DOCUMENT } from '@angular/common';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideTranslateService, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';

import { LOCALE_STORAGE_KEY } from './core/locale.constants';
import { routes } from './app.routes';

function resolveInitialLang(): 'en' | 'ru' {
    try {
        const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (saved === 'ru' || saved === 'en') {
            return saved;
        }
    } catch {
        /* ignore */
    }
    if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ru')) {
        return 'ru';
    }
    return 'en';
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideHttpClient(),
        { provide: TRANSLATE_HTTP_LOADER_CONFIG, useValue: { prefix: '/assets/i18n/', suffix: '.json' } },
        ...provideTranslateService({
            fallbackLang: 'en',
            loader: { provide: TranslateLoader, useClass: TranslateHttpLoader }
        }),
        provideAppInitializer(async () => {
            const translate = inject(TranslateService);
            const doc = inject(DOCUMENT);
            const lang = resolveInitialLang();
            doc.documentElement.lang = lang;
            await firstValueFrom(translate.use(lang));
        }),
        provideRouter(
            routes,
            withInMemoryScrolling({
                anchorScrolling: 'enabled',
                scrollPositionRestoration: 'enabled'
            })
        )
    ]
};
