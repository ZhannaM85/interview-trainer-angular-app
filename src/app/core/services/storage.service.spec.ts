import { TestBed } from '@angular/core/testing';

import { StorageService } from './storage.service';

function setup(): StorageService {
    TestBed.configureTestingModule({});
    return TestBed.inject(StorageService);
}

describe('StorageService — usageKb', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('returns 0 when no interview-trainer keys exist', () => {
        const svc = setup();
        expect(svc.usageKb()).toBe(0);
    });

    it('increases after set()', () => {
        const svc = setup();
        const before = svc.usageKb();
        svc.set('test-key', { data: 'x'.repeat(500) });
        expect(svc.usageKb()).toBeGreaterThan(before);
    });

    it('ignores keys that do not start with the app prefix', () => {
        localStorage.setItem('other-app:key', 'value');
        const svc = setup();
        expect(svc.usageKb()).toBe(0);
    });
});

describe('StorageService — nearQuota', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('is false when storage is nearly empty', () => {
        const svc = setup();
        expect(svc.nearQuota()).toBe(false);
    });
});

describe('StorageService — clearAll', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('removes all interview-trainer:* keys and keys are gone from localStorage', () => {
        const svc = setup();
        svc.set('key-a', 'x'.repeat(1000));
        svc.set('key-b', 'x'.repeat(1000));
        expect(svc.usageKb()).toBeGreaterThan(0);
        svc.clearAll();
        expect(svc.usageKb()).toBe(0);
        expect(localStorage.getItem('interview-trainer:key-a')).toBeNull();
        expect(localStorage.getItem('interview-trainer:key-b')).toBeNull();
    });

    it('does not remove keys from other apps', () => {
        localStorage.setItem('other-app:key', 'value');
        const svc = setup();
        svc.clearAll();
        expect(localStorage.getItem('other-app:key')).toBe('value');
    });
});

describe('StorageService — get / set', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('returns null for a missing key', () => {
        const svc = setup();
        expect(svc.get('missing')).toBeNull();
    });

    it('round-trips a stored value', () => {
        const svc = setup();
        svc.set('obj', { x: 1 });
        expect(svc.get('obj')).toEqual({ x: 1 });
    });
});
