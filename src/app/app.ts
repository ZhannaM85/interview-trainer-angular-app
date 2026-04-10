import { DOCUMENT } from '@angular/common';
import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter, fromEvent } from 'rxjs';

import { LOCALE_STORAGE_KEY } from './core/locale.constants';
import { ActiveTimeService } from './core/services/active-time.service';
import { ActivityService } from './core/services/activity.service';
import { QuestionService } from './core/services/question.service';
import { ThemeService } from './core/services/theme.service';
import { formatLocalYmd } from './shared/utils/local-date.utils';

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

    private readonly activityService = inject(ActivityService);
    private readonly questionService = inject(QuestionService);
    private readonly allQuestions = toSignal(this.questionService.getQuestions(), { initialValue: [] });

    protected readonly currentLang = signal<'en' | 'ru'>('en');
    protected readonly navMenuOpen = signal(false);
    protected readonly retryBannerDismissed = signal(false);

    /**
     * Topic IDs (category:subtopic) where the best rating yesterday was didntKnow or partial
     * AND the topic has not yet been covered today. A topic is considered covered when the user
     * answers any of its questions in the Quiz OR marks it as studied in the Study Guide
     * (both paths write to `coveredTopicIds`). The banner disappears automatically as topics
     * are worked through.
     */
    protected readonly retryTopicIds = computed(() => {
        const activityMap = this.activityService.activityMap();
        const yesterday = this.yesterdayYmd();
        const yesterdayRow = activityMap.get(yesterday);
        if (!yesterdayRow?.practiceRatingBest) {
            return [];
        }
        const failedQIds = new Set<number>();
        for (const [qIdStr, rating] of Object.entries(yesterdayRow.practiceRatingBest)) {
            if (rating === 'didntKnow' || rating === 'partial') {
                failedQIds.add(Number(qIdStr));
            }
        }
        if (failedQIds.size === 0) {
            return [];
        }
        const topicIds = new Set<string>();
        for (const q of this.allQuestions()) {
            if (failedQIds.has(q.id)) {
                topicIds.add(`${q.category}:${q.subtopic}`);
            }
        }
        if (topicIds.size === 0) {
            return [];
        }
        // Remove topics already covered today via Quiz practice or Study Guide "Mark as studied"
        const todayRow = activityMap.get(formatLocalYmd(new Date()));
        const todayCovered = new Set(todayRow?.coveredTopicIds ?? []);
        return [...topicIds].filter((tid) => !todayCovered.has(tid));
    });

    protected readonly showRetryBanner = computed(
        () => !this.retryBannerDismissed() && this.retryTopicIds().length > 0
    );

    protected retryStudyQueryParams(): Record<string, string> {
        return { topics: this.retryTopicIds().join(',') };
    }

    constructor() {
        inject(ActiveTimeService);
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

    private yesterdayYmd(): string {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return formatLocalYmd(d);
    }
}
