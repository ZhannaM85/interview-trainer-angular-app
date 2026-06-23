import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    TranslateLoader,
    TranslateService,
    provideTranslateService,
    type TranslationObject
} from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { QuizTimerComponent } from './quiz-timer.component';

class StubLoader implements TranslateLoader {
    getTranslation(_lang: string): Observable<TranslationObject> {
        return of({
            quizTimer: {
                aria: 'Timer: {{time}}'
            }
        } satisfies TranslationObject);
    }
}

describe('QuizTimerComponent', () => {
    let fixture: ComponentFixture<QuizTimerComponent>;
    let component: QuizTimerComponent;

    beforeEach(() => jest.useFakeTimers());

    afterEach(() => {
        jest.useRealTimers();
        TestBed.resetTestingModule();
    });

    function setup(resetKey = 1, durationSeconds = 30): void {
        TestBed.configureTestingModule({
            imports: [QuizTimerComponent],
            providers: [provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })]
        });
        TestBed.inject(TranslateService).use('en');
        fixture = TestBed.createComponent(QuizTimerComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('resetKey', resetKey);
        fixture.componentRef.setInput('durationSeconds', durationSeconds);
        fixture.detectChanges();
    }

    it('should create', () => {
        setup();
        expect(component).toBeTruthy();
    });

    it('renders a timer element with role="timer"', () => {
        setup();
        const timer = fixture.nativeElement.querySelector('[role="timer"]');
        expect(timer).toBeTruthy();
    });

    it('displays formatted time initially', () => {
        setup(1, 30);
        const value: HTMLElement = fixture.nativeElement.querySelector('.quiz-timer__value');
        expect(value.textContent).toContain('00:30');
    });

    it('displays formatted time for durations over 60 seconds', () => {
        setup(1, 90);
        const value: HTMLElement = fixture.nativeElement.querySelector('.quiz-timer__value');
        expect(value.textContent).toContain('01:30');
    });

    it('counts down after one second', () => {
        setup(1, 10);
        jest.advanceTimersByTime(1000);
        fixture.detectChanges();
        const value: HTMLElement = fixture.nativeElement.querySelector('.quiz-timer__value');
        expect(value.textContent).toContain('00:09');
    });

    it('emits expired when timer reaches zero', () => {
        setup(1, 3);
        let expired = false;
        component.expired.subscribe(() => (expired = true));
        jest.advanceTimersByTime(3000);
        expect(expired).toBe(true);
    });

    it('does not emit expired before countdown completes', () => {
        setup(1, 5);
        let expired = false;
        component.expired.subscribe(() => (expired = true));
        jest.advanceTimersByTime(2000);
        expect(expired).toBe(false);
    });

    it('resets countdown when resetKey changes', () => {
        setup(1, 5);
        jest.advanceTimersByTime(3000);
        fixture.detectChanges();
        const valueBefore: HTMLElement = fixture.nativeElement.querySelector('.quiz-timer__value');
        expect(valueBefore.textContent).toContain('00:02');

        fixture.componentRef.setInput('resetKey', 2);
        fixture.detectChanges();
        const valueAfter: HTMLElement = fixture.nativeElement.querySelector('.quiz-timer__value');
        expect(valueAfter.textContent).toContain('00:05');
    });

    it('applies ok urgency class when time is above 33%', () => {
        setup(1, 30);
        const timer: HTMLElement = fixture.nativeElement.querySelector('.quiz-timer');
        expect(timer.classList.contains('quiz-timer--ok')).toBe(true);
    });

    it('applies warn urgency class when time is at or below 33%', () => {
        setup(1, 30);
        // remaining = 9 → 9 <= 30*0.33 (9.9) and 9 > 5
        jest.advanceTimersByTime(21000);
        fixture.detectChanges();
        const timer: HTMLElement = fixture.nativeElement.querySelector('.quiz-timer');
        expect(timer.classList.contains('quiz-timer--warn')).toBe(true);
    });

    it('applies critical urgency class when time is at or below 5 seconds', () => {
        setup(1, 10);
        jest.advanceTimersByTime(6000);
        fixture.detectChanges();
        const timer: HTMLElement = fixture.nativeElement.querySelector('.quiz-timer');
        expect(timer.classList.contains('quiz-timer--critical')).toBe(true);
    });

    it('clears interval on destroy', () => {
        setup(1, 60);
        const clearSpy = jest.spyOn(globalThis, 'clearInterval');
        fixture.destroy();
        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();
    });

    it('enforces minimum duration of 1 second', () => {
        setup(1, 0);
        const value: HTMLElement = fixture.nativeElement.querySelector('.quiz-timer__value');
        expect(value.textContent).toContain('00:01');
    });
});
