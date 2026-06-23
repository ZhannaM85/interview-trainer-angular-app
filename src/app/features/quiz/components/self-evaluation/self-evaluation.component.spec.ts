import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    TranslateLoader,
    TranslateService,
    provideTranslateService,
    type TranslationObject
} from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { SelfEvaluationComponent } from './self-evaluation.component';
import type { SelfRating } from '../../../../shared/models/self-rating.model';

class StubLoader implements TranslateLoader {
    getTranslation(_lang: string): Observable<TranslationObject> {
        return of({
            selfEval: {
                ariaLabel: 'Rate yourself',
                didntKnow: "Didn't know",
                partial: 'Partially knew',
                nailed: 'Nailed it'
            }
        } satisfies TranslationObject);
    }
}

describe('SelfEvaluationComponent', () => {
    let fixture: ComponentFixture<SelfEvaluationComponent>;
    let component: SelfEvaluationComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [SelfEvaluationComponent],
            providers: [provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })]
        });
        TestBed.inject(TranslateService).use('en');
        fixture = TestBed.createComponent(SelfEvaluationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => TestBed.resetTestingModule());

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('renders three rating buttons', () => {
        const buttons = fixture.nativeElement.querySelectorAll('.self-eval__btn');
        expect(buttons.length).toBe(3);
    });

    it('renders a group with aria-label', () => {
        const group: HTMLElement = fixture.nativeElement.querySelector('[role="group"]');
        expect(group).toBeTruthy();
        expect(group.getAttribute('aria-label')).toBe('Rate yourself');
    });

    it('emits "didntKnow" when the first button is clicked', () => {
        let emitted: SelfRating | undefined;
        component.rated.subscribe((val: SelfRating) => (emitted = val));
        const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.self-eval__btn--no');
        btn.click();
        expect(emitted).toBe('didntKnow');
    });

    it('emits "partial" when the second button is clicked', () => {
        let emitted: SelfRating | undefined;
        component.rated.subscribe((val: SelfRating) => (emitted = val));
        const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.self-eval__btn--partial');
        btn.click();
        expect(emitted).toBe('partial');
    });

    it('emits "nailed" when the third button is clicked', () => {
        let emitted: SelfRating | undefined;
        component.rated.subscribe((val: SelfRating) => (emitted = val));
        const btn: HTMLButtonElement = fixture.nativeElement.querySelector('.self-eval__btn--yes');
        btn.click();
        expect(emitted).toBe('nailed');
    });

    it('displays translated labels in the buttons', () => {
        const noBtn: HTMLElement = fixture.nativeElement.querySelector('.self-eval__btn--no');
        const partialBtn: HTMLElement = fixture.nativeElement.querySelector('.self-eval__btn--partial');
        const yesBtn: HTMLElement = fixture.nativeElement.querySelector('.self-eval__btn--yes');
        expect(noBtn.textContent).toContain("Didn't know");
        expect(partialBtn.textContent).toContain('Partially knew');
        expect(yesBtn.textContent).toContain('Nailed it');
    });
});
