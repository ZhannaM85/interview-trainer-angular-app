import { DestroyRef, DOCUMENT, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, fromEvent } from 'rxjs';

import { ActivityService } from './activity.service';

/** Routes where foreground tab time counts as “learning” time. */
const LEARNING_PATHS = new Set(['/quiz', '/study', '/plan']);

/** Persist batched seconds at most this often to limit localStorage writes. */
const FLUSH_INTERVAL_SEC = 5;

@Injectable({
    providedIn: 'root'
})
export class ActiveTimeService {
    private readonly document = inject(DOCUMENT);
    private readonly router = inject(Router);
    private readonly activityService = inject(ActivityService);
    private readonly destroyRef = inject(DestroyRef);

    private pendingSeconds = 0;
    private intervalId: ReturnType<typeof setInterval> | null = null;

    constructor() {
        const doc = this.document;

        fromEvent(doc, 'visibilitychange')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (doc.visibilityState === 'hidden') {
                    this.flush();
                }
            });

        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.flush());

        this.intervalId = setInterval(() => this.tick(), 1000);

        this.destroyRef.onDestroy(() => {
            if (this.intervalId !== null) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.flush();
        });
    }

    private tick(): void {
        if (!this.shouldCountActiveTime()) {
            return;
        }
        this.pendingSeconds += 1;
        if (this.pendingSeconds >= FLUSH_INTERVAL_SEC) {
            this.flush();
        }
    }

    private shouldCountActiveTime(): boolean {
        if (this.document.visibilityState !== 'visible') {
            return false;
        }
        const path = this.learningPathOnly(this.router.url);
        return LEARNING_PATHS.has(path);
    }

    private learningPathOnly(url: string): string {
        const path = url.split('?')[0].split('#')[0];
        return path || '/';
    }

    private flush(): void {
        if (this.pendingSeconds <= 0) {
            return;
        }
        const delta = this.pendingSeconds;
        this.pendingSeconds = 0;
        this.activityService.addActiveSeconds(delta);
    }
}
