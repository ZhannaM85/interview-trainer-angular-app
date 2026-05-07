import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateLoader, provideTranslateService, type TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { QuizPageComponent } from './quiz-page.component';
import { QuestionService } from '../../../../core/services/question.service';

class StubLoader implements TranslateLoader {
    getTranslation(): Observable<TranslationObject> {
        return of({
            quiz: {
                titleHidden: 'Quiz',
                loading: 'Loading…',
                shuffleOn: 'Shuffle: On',
                shuffleOff: 'Shuffle: Off'
            }
        });
    }
}

describe('QuizPageComponent — shuffle toggle', () => {
    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [QuizPageComponent],
            providers: [
                provideHttpClient(),
                provideRouter([]),
                ...provideTranslateService({ loader: { provide: TranslateLoader, useClass: StubLoader } })
            ]
        }).compileComponents();
    });

    afterEach(() => TestBed.resetTestingModule());

    it('exposes shuffleEnabled from QuestionService', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as { shuffleEnabled: () => boolean };
        const questionService = TestBed.inject(QuestionService);
        expect(component.shuffleEnabled()).toBe(questionService.shuffleEnabled());
    });

    it('toggleShuffle delegates to QuestionService', () => {
        const fixture = TestBed.createComponent(QuizPageComponent);
        const component = fixture.componentInstance as unknown as { toggleShuffle: () => void };
        const questionService = TestBed.inject(QuestionService);
        const before = questionService.shuffleEnabled();
        component.toggleShuffle();
        expect(questionService.shuffleEnabled()).toBe(!before);
    });
});
