import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

import { PwaUpdateService } from './pwa-update.service';

class FakeSwUpdate {
    isEnabled = true;
    versionUpdates = new Subject<VersionEvent>();
    activateUpdate = jest.fn().mockResolvedValue(true);
}

describe('PwaUpdateService', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('updateReady stays false when SwUpdate is not provided (service worker disabled)', () => {
        const svc = TestBed.inject(PwaUpdateService);
        expect(svc.updateReady()).toBe(false);
    });

    it('activateUpdate is a no-op when SwUpdate is not provided', () => {
        const svc = TestBed.inject(PwaUpdateService);
        expect(() => svc.activateUpdate()).not.toThrow();
    });

    it('updateReady becomes true when a VERSION_READY event is emitted', () => {
        const fakeSwUpdate = new FakeSwUpdate();
        TestBed.configureTestingModule({
            providers: [{ provide: SwUpdate, useValue: fakeSwUpdate }]
        });
        const svc = TestBed.inject(PwaUpdateService);

        expect(svc.updateReady()).toBe(false);
        fakeSwUpdate.versionUpdates.next({
            type: 'VERSION_READY',
            currentVersion: { hash: 'a' },
            latestVersion: { hash: 'b' }
        } as VersionEvent);

        expect(svc.updateReady()).toBe(true);
    });

    it('ignores non-VERSION_READY events', () => {
        const fakeSwUpdate = new FakeSwUpdate();
        TestBed.configureTestingModule({
            providers: [{ provide: SwUpdate, useValue: fakeSwUpdate }]
        });
        const svc = TestBed.inject(PwaUpdateService);

        fakeSwUpdate.versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'a' } } as VersionEvent);

        expect(svc.updateReady()).toBe(false);
    });

    it('activateUpdate calls SwUpdate.activateUpdate when enabled', async () => {
        const fakeSwUpdate = new FakeSwUpdate();
        TestBed.configureTestingModule({
            providers: [{ provide: SwUpdate, useValue: fakeSwUpdate }]
        });
        const svc = TestBed.inject(PwaUpdateService);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        svc.activateUpdate();
        await Promise.resolve();
        await Promise.resolve();

        expect(fakeSwUpdate.activateUpdate).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
