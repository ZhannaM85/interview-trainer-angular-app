import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    TranslateLoader,
    TranslateService,
    provideTranslateService,
    type TranslationObject
} from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { ProgressBarComponent } from './progress-bar.component';

class StubLoader implements TranslateLoader {
    getTranslation(_lang: string): Observable<TranslationObject> {
        return of({
            progressBar: {
                default: 'Progress'
            }
        } satisfies TranslationObject);
    }
}

describe('ProgressBarComponent', () => {
    let fixture: ComponentFixture<ProgressBarComponent>;
    let component: ProgressBarComponent;

    function setup(value = 0, max = 100, label: string | null = null): void {
        TestBed.configureTestingModule({
            imports: [ProgressBarComponent],
            providers: [provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })]
        });
        TestBed.inject(TranslateService).use('en');
        fixture = TestBed.createComponent(ProgressBarComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('value', value);
        fixture.componentRef.setInput('max', max);
        if (label !== null) {
            fixture.componentRef.setInput('label', label);
        }
        fixture.detectChanges();
    }

    afterEach(() => TestBed.resetTestingModule());

    it('should create', () => {
        setup();
        expect(component).toBeTruthy();
    });

    it('renders progressbar role', () => {
        setup(50, 100);
        const el: HTMLElement = fixture.nativeElement.querySelector('[role="progressbar"]');
        expect(el).toBeTruthy();
    });

    it('sets aria-valuenow to the current value', () => {
        setup(42, 100);
        const el: HTMLElement = fixture.nativeElement.querySelector('[role="progressbar"]');
        expect(el.getAttribute('aria-valuenow')).toBe('42');
    });

    it('sets aria-valuemax to the max value', () => {
        setup(10, 200);
        const el: HTMLElement = fixture.nativeElement.querySelector('[role="progressbar"]');
        expect(el.getAttribute('aria-valuemax')).toBe('200');
    });

    it('sets aria-valuemin to 0', () => {
        setup(10, 100);
        const el: HTMLElement = fixture.nativeElement.querySelector('[role="progressbar"]');
        expect(el.getAttribute('aria-valuemin')).toBe('0');
    });

    it('uses default aria-label from translation when no label input', () => {
        setup(10, 100, null);
        const el: HTMLElement = fixture.nativeElement.querySelector('[role="progressbar"]');
        expect(el.getAttribute('aria-label')).toBe('Progress');
    });

    it('uses custom label when provided', () => {
        setup(10, 100, 'Custom label');
        const el: HTMLElement = fixture.nativeElement.querySelector('[role="progressbar"]');
        expect(el.getAttribute('aria-label')).toBe('Custom label');
    });

    describe('percent()', () => {
        it('computes correct percentage', () => {
            setup(50, 100);
            const fill: HTMLElement = fixture.nativeElement.querySelector('.progress__fill');
            expect(fill.style.width).toBe('50%');
        });

        it('clamps to 100% when value exceeds max', () => {
            setup(150, 100);
            const fill: HTMLElement = fixture.nativeElement.querySelector('.progress__fill');
            expect(fill.style.width).toBe('100%');
        });

        it('clamps to 0% when value is negative', () => {
            setup(-10, 100);
            const fill: HTMLElement = fixture.nativeElement.querySelector('.progress__fill');
            expect(fill.style.width).toBe('0%');
        });

        it('returns 0% when max is 0', () => {
            setup(50, 0);
            const fill: HTMLElement = fixture.nativeElement.querySelector('.progress__fill');
            expect(fill.style.width).toBe('0%');
        });

        it('returns 0% when max is negative', () => {
            setup(50, -10);
            const fill: HTMLElement = fixture.nativeElement.querySelector('.progress__fill');
            expect(fill.style.width).toBe('0%');
        });

        it('handles fractional percentages', () => {
            setup(1, 3);
            const fill: HTMLElement = fixture.nativeElement.querySelector('.progress__fill');
            const width = parseFloat(fill.style.width);
            expect(width).toBeCloseTo(33.33, 1);
        });
    });
});
