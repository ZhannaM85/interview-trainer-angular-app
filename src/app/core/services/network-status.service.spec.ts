import { TestBed } from '@angular/core/testing';

import { NetworkStatusService } from './network-status.service';

function setNavigatorOnLine(value: boolean): void {
    Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

describe('NetworkStatusService', () => {
    afterEach(() => {
        setNavigatorOnLine(true);
        TestBed.resetTestingModule();
    });

    it('initializes isOnline from navigator.onLine (true)', () => {
        setNavigatorOnLine(true);
        const svc = TestBed.inject(NetworkStatusService);
        expect(svc.isOnline()).toBe(true);
    });

    it('initializes isOnline from navigator.onLine (false)', () => {
        setNavigatorOnLine(false);
        const svc = TestBed.inject(NetworkStatusService);
        expect(svc.isOnline()).toBe(false);
    });

    it('sets isOnline to false on window "offline" event', () => {
        setNavigatorOnLine(true);
        const svc = TestBed.inject(NetworkStatusService);
        window.dispatchEvent(new Event('offline'));
        expect(svc.isOnline()).toBe(false);
    });

    it('sets isOnline to true on window "online" event', () => {
        setNavigatorOnLine(false);
        const svc = TestBed.inject(NetworkStatusService);
        window.dispatchEvent(new Event('online'));
        expect(svc.isOnline()).toBe(true);
    });
});
