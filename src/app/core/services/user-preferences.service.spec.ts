import { TestBed } from '@angular/core/testing';

import { StorageService } from './storage.service';
import { UserPreferencesService } from './user-preferences.service';

function setup() {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(UserPreferencesService);
    const storage = TestBed.inject(StorageService);
    return { service, storage };
}

describe('UserPreferencesService', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('defaults dailyGoal to 10 when no stored value', () => {
        const { service } = setup();
        expect(service.dailyGoal()).toBe(10);
    });

    it('loads dailyGoal from localStorage if present', () => {
        localStorage.setItem('interview-trainer:user-preferences', JSON.stringify({ dailyGoal: 20 }));
        const { service } = setup();
        expect(service.dailyGoal()).toBe(20);
    });

    it('setDailyGoal updates the signal', () => {
        const { service } = setup();
        service.setDailyGoal(15);
        expect(service.dailyGoal()).toBe(15);
    });

    it('setDailyGoal persists the new value to localStorage', () => {
        const { service, storage } = setup();
        service.setDailyGoal(25);
        const stored = storage.get<{ dailyGoal: number }>('user-preferences');
        expect(stored?.dailyGoal).toBe(25);
    });

    it('clamps goal to minimum of 1', () => {
        const { service } = setup();
        service.setDailyGoal(0);
        expect(service.dailyGoal()).toBe(1);
    });

    it('clamps goal to maximum of 200', () => {
        const { service } = setup();
        service.setDailyGoal(999);
        expect(service.dailyGoal()).toBe(200);
    });

    it('rounds non-integer values', () => {
        const { service } = setup();
        service.setDailyGoal(7.6);
        expect(service.dailyGoal()).toBe(8);
    });

    it('ignores NaN', () => {
        const { service } = setup();
        service.setDailyGoal(NaN);
        expect(service.dailyGoal()).toBe(10);
    });

    it('goal can be changed multiple times without resetting to default', () => {
        const { service } = setup();
        service.setDailyGoal(5);
        service.setDailyGoal(12);
        expect(service.dailyGoal()).toBe(12);
    });
});
