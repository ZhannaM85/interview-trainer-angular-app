import { DOCUMENT } from '@angular/common';
import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter, fromEvent, map, merge, of } from 'rxjs';

import { LOCALE_STORAGE_KEY } from './core/locale.constants';
import { ActiveTimeService } from './core/services/active-time.service';
import { ActivityService } from './core/services/activity.service';
import { CustomQuestionService } from './core/services/custom-question.service';
import { QuestionService } from './core/services/question.service';
import { StorageService } from './core/services/storage.service';
import { ThemeService } from './core/services/theme.service';
import { formatLocalYmd } from './shared/utils/local-date.utils';

/** Interview routes where the “topics to revisit” banner is relevant (not home, About, etc.). */
const INTERVIEW_RETRY_BANNER_PATHS = new Set([
    '/quiz',
    '/study',
    '/plan',
    '/dashboard',
    '/my-questions'
]);

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
    private readonly customQuestionService = inject(CustomQuestionService);
    protected readonly storageService = inject(StorageService);

    protected readonly customQuestionCount = computed(() => this.customQuestionService.questions().length);
    private readonly allQuestions = toSignal(this.questionService.getQuestions(), { initialValue: [] });

    protected readonly currentLang = signal<'en' | 'ru'>('en');
    protected readonly navMenuOpen = signal(false);
    protected readonly retryBannerDismissed = signal(false);

    /** Path without query/hash; updates on navigation (for gating JS-only UI such as the retry banner). */
    private readonly locationPath = toSignal(
        merge(of(null), this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))).pipe(
            map(() => this.pathOnly(this.router.url))
        ),
        { initialValue: this.pathOnly(this.router.url) }
    );

    /**
     * Topic IDs (category:subtopic) where the best rating on any past day was didntKnow or
     * partial AND the topic has not yet been covered today. A topic is considered covered when
     * the user answers any of its questions in the Quiz OR marks it as studied in the Study
     * Guide (both paths write to `coveredTopicIds`). The banner disappears automatically as
     * topics are worked through.
     */
    protected readonly retryTopicIds = computed(() => {
        const activityMap = this.activityService.activityMap();
        const todayYmd = formatLocalYmd(new Date());
        const failedQIds = new Set<number>();

        for (const [dateKey, row] of activityMap) {
            if (dateKey >= todayYmd || !row.practiceRatingBest) {
                continue;
            }
            for (const [qIdStr, rating] of Object.entries(row.practiceRatingBest)) {
                if (rating === 'didntKnow' || rating === 'partial') {
                    failedQIds.add(Number(qIdStr));
                }
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
        const todayRow = activityMap.get(todayYmd);
        const todayCovered = new Set(todayRow?.coveredTopicIds ?? []);
        return [...topicIds].filter((tid) => !todayCovered.has(tid));
    });

    /**
     * Interview-prep topics only: not on sociology, not on the subject picker or About—only
     * on practice/study/plan/progress/my-questions where revisiting topics is actionable.
     */
    protected readonly showRetryBanner = computed(() => {
        const p = this.locationPath();
        if (p.startsWith('/sociology')) {
            return false;
        }
        if (!INTERVIEW_RETRY_BANNER_PATHS.has(p)) {
            return false;
        }
        return !this.retryBannerDismissed() && this.retryTopicIds().length > 0;
    });

    /** Main nav: interview block hidden while browsing sociology routes. */
    protected readonly showInterviewNavSection = computed(() => !this.locationPath().startsWith('/sociology'));

    /**
     * Main nav: sociology block on the home picker, sociology routes, and About
     * (shared page) so users coming from sociology still see sociology links.
     * Hidden on other interview-prep pages.
     */
    protected readonly showSociologyNavSection = computed(() => {
        const p = this.locationPath();
        return p === '/' || p === '/about' || p.startsWith('/sociology');
    });

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

    private pathOnly(url: string): string {
        const noQuery = url.split('?')[0];
        if (noQuery.includes('#')) {
            const afterHash = noQuery.split('#').pop() ?? '';
            if (!afterHash) {
                return '/';
            }
            return afterHash.startsWith('/') ? afterHash : `/${afterHash}`;
        }
        return noQuery || '/';
    }
}
