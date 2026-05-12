import { TestBed } from '@angular/core/testing';

import { formatLocalYmd } from '../../shared/utils/local-date.utils';
import { TodayPlanService } from './today-plan.service';

function yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatLocalYmd(d);
}

function twoDaysAgoStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return formatLocalYmd(d);
}

function setTodayPlan(planDate: string, selectedTopicIds: string[], studiedTopicIds: string[]): void {
    localStorage.setItem(
        'interview-trainer:today-plan',
        JSON.stringify({ planDate, selectedTopicIds, studiedTopicIds })
    );
}

function setCarryover(fromDate: string, topicIds: string[]): void {
    localStorage.setItem(
        'interview-trainer:plan-carryover',
        JSON.stringify({ fromDate, topicIds })
    );
}

function getCarryoverRaw(): unknown {
    const raw = localStorage.getItem('interview-trainer:plan-carryover');
    return raw ? JSON.parse(raw) : null;
}

function setup(): TodayPlanService {
    TestBed.configureTestingModule({});
    return TestBed.inject(TodayPlanService);
}

describe('TodayPlanService — carryover detection', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.clear();
    });

    it('carryoverPending() is null when there is no prior plan', () => {
        const svc = setup();
        expect(svc.carryoverPending()).toBeNull();
    });

    it('carryoverPending() is null when plan is from today', () => {
        setTodayPlan(formatLocalYmd(new Date()), ['javascript:closures'], []);
        const svc = setup();
        expect(svc.carryoverPending()).toBeNull();
    });

    it('carryoverPending() is null when all selected topics were studied', () => {
        setTodayPlan(yesterdayStr(), ['javascript:closures'], ['javascript:closures']);
        const svc = setup();
        expect(svc.carryoverPending()).toBeNull();
    });

    it('carryoverPending() returns unfinished topics from yesterday', () => {
        setTodayPlan(yesterdayStr(), ['javascript:closures', 'angular:signals'], ['angular:signals']);
        const svc = setup();
        const carryover = svc.carryoverPending();
        expect(carryover).not.toBeNull();
        expect(carryover!.topicIds).toEqual(['javascript:closures']);
        expect(carryover!.fromDate).toBe(yesterdayStr());
    });

    it('carryoverPending() is null when plan is from 2+ days ago', () => {
        setTodayPlan(twoDaysAgoStr(), ['javascript:closures'], []);
        const svc = setup();
        expect(svc.carryoverPending()).toBeNull();
    });

    it('resets today plan to empty when rolling over', () => {
        setTodayPlan(yesterdayStr(), ['javascript:closures'], []);
        const svc = setup();
        expect(svc.selectedTopicIds()).toEqual([]);
        expect(svc.studiedTopicIds()).toEqual([]);
    });

    it('reads previously saved carryover on subsequent loads without rollover', () => {
        setCarryover(yesterdayStr(), ['javascript:closures', 'angular:signals']);
        // Plan is already today's (no rollover), but carryover was saved from a previous load
        setTodayPlan(formatLocalYmd(new Date()), [], []);
        const svc = setup();
        const carryover = svc.carryoverPending();
        expect(carryover).not.toBeNull();
        expect(carryover!.topicIds).toEqual(['javascript:closures', 'angular:signals']);
    });

    it('discards carryover older than yesterday', () => {
        setCarryover(twoDaysAgoStr(), ['javascript:closures']);
        const svc = setup();
        expect(svc.carryoverPending()).toBeNull();
    });
});

describe('TodayPlanService — acceptCarryover', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.clear();
    });

    it('adds carryover topics to today plan and clears carryoverPending', () => {
        setTodayPlan(yesterdayStr(), ['javascript:closures', 'angular:signals'], []);
        const svc = setup();
        expect(svc.carryoverPending()).not.toBeNull();

        svc.acceptCarryover();

        expect(svc.carryoverPending()).toBeNull();
        expect(svc.selectedTopicIds()).toContain('javascript:closures');
        expect(svc.selectedTopicIds()).toContain('angular:signals');
    });

    it('does not add duplicate topics when accepting', () => {
        setTodayPlan(yesterdayStr(), ['javascript:closures'], []);
        const svc = setup();
        svc.toggleTopicSelected('javascript:closures');
        svc.acceptCarryover();

        const ids = svc.selectedTopicIds();
        expect(ids.filter((id) => id === 'javascript:closures')).toHaveLength(1);
    });

    it('clears the carryover from storage after accepting', () => {
        setTodayPlan(yesterdayStr(), ['javascript:closures'], []);
        const svc = setup();
        svc.acceptCarryover();
        expect(getCarryoverRaw()).toBeNull();
    });

    it('does nothing if carryoverPending is null', () => {
        const svc = setup();
        svc.acceptCarryover();
        expect(svc.selectedTopicIds()).toEqual([]);
    });
});

describe('TodayPlanService — dismissCarryover', () => {
    afterEach(() => {
        TestBed.resetTestingModule();
        localStorage.clear();
    });

    it('clears carryoverPending without modifying today plan', () => {
        setTodayPlan(yesterdayStr(), ['javascript:closures'], []);
        const svc = setup();
        expect(svc.carryoverPending()).not.toBeNull();

        svc.dismissCarryover();

        expect(svc.carryoverPending()).toBeNull();
        expect(svc.selectedTopicIds()).toEqual([]);
    });

    it('clears the carryover from storage after dismissing', () => {
        setTodayPlan(yesterdayStr(), ['javascript:closures'], []);
        const svc = setup();
        svc.dismissCarryover();
        expect(getCarryoverRaw()).toBeNull();
    });
});
