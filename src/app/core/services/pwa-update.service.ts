import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Surfaces newly activated service worker versions so the user can reload on their own terms.
 * The service worker only caches network responses — it never touches localStorage — so
 * activating an update cannot corrupt saved progress.
 */
@Injectable({
    providedIn: 'root'
})
export class PwaUpdateService {
    private readonly swUpdate = inject(SwUpdate, { optional: true });

    readonly updateReady = signal(false);

    constructor() {
        if (!this.swUpdate?.isEnabled) {
            return;
        }
        this.swUpdate.versionUpdates
            .pipe(
                filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'),
                takeUntilDestroyed()
            )
            .subscribe(() => this.updateReady.set(true));
    }

    activateUpdate(): void {
        if (!this.swUpdate?.isEnabled) {
            return;
        }
        void this.swUpdate.activateUpdate().then(() => {
            window.location.reload();
        });
    }
}
