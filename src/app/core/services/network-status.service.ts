import { Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

/** Tracks browser connectivity so the app shell can show a lightweight offline indicator. */
@Injectable({
    providedIn: 'root'
})
export class NetworkStatusService {
    readonly isOnline = signal(this.readInitialStatus());

    constructor() {
        fromEvent(window, 'online')
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.isOnline.set(true));
        fromEvent(window, 'offline')
            .pipe(takeUntilDestroyed())
            .subscribe(() => this.isOnline.set(false));
    }

    private readInitialStatus(): boolean {
        return typeof navigator === 'undefined' ? true : navigator.onLine;
    }
}
