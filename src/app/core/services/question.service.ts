import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable, combineLatest, distinctUntilChanged, map, merge, of, shareReplay } from 'rxjs';

import { CustomQuestionService } from './custom-question.service';

import type {
    Question,
    QuestionCategory,
    QuestionDifficulty,
    QuestionReadMoreLink
} from '../../shared/models/question.model';

type LocaleCode = 'en' | 'ru';

/** Per-locale strings inside `questions-bilingual.json`. */
interface QuestionLocaleText {
    question: string;
    weakAnswer: string;
    technicalAnswer: string;
    interviewAnswer: string;
}

/** Bilingual title for a read-more link row in JSON. */
interface QuestionReadMoreLinkRow {
    url: string;
    title: Partial<Record<LocaleCode, string>> & { en: string };
}

/** Shape of `questions-bilingual.json`. */
interface QuestionBilingualRow {
    id: number;
    topic: string;
    subtopic: string;
    difficulty: QuestionDifficulty;
    text: Record<LocaleCode, QuestionLocaleText>;
    /** Optional; merged from build script into `questions-bilingual.json`. */
    codeExample?: string;
    /** Optional external articles (https URLs only). */
    readMoreLinks?: QuestionReadMoreLinkRow[];
}

@Injectable({
    providedIn: 'root'
})
export class QuestionService {
    private readonly http = inject(HttpClient);
    private readonly translate = inject(TranslateService);
    private readonly customQuestionService = inject(CustomQuestionService);

    private readonly rawQuestions$ = this.http.get<QuestionBilingualRow[]>('assets/data/questions-bilingual.json').pipe(
        shareReplay(1)
    );

    private readonly activeLocale$: Observable<LocaleCode> = merge(
        of(this.resolveLocale(this.translate.currentLang)),
        this.translate.onLangChange.pipe(map((e) => this.resolveLocale(e.lang)))
    ).pipe(distinctUntilChanged());

    private readonly questions$: Observable<Question[]> = combineLatest([
        this.rawQuestions$,
        this.activeLocale$
    ]).pipe(
        map(([rows, lang]) => [
            ...rows.map((row) => this.mapRowToQuestion(row, lang)),
            ...this.customQuestionService.asQuestions()
        ]),
        shareReplay(1)
    );

    private queue: Question[] = [];
    private index = -1;

    getQuestions(): Observable<Question[]> {
        return this.questions$;
    }

    filterByCategory(questions: Question[], category: QuestionCategory): Question[] {
        return questions.filter((q) => q.category === category);
    }

    filterByDifficulty(questions: Question[], difficulty: QuestionDifficulty): Question[] {
        return questions.filter((q) => q.difficulty === difficulty);
    }

    initializeQueue(questions: Question[]): void {
        this.queue = [...questions];
        this.index = -1;
    }

    getNextQuestion(): Question | null {
        this.index += 1;
        if (this.index >= this.queue.length) {
            return null;
        }
        return this.queue[this.index];
    }

    resetQueue(): void {
        this.queue = [];
        this.index = -1;
    }

    /** Find a question by id from the latest mapped list (same order as `getQuestions()` emissions). */
    getQuestionByIdFromList(questions: Question[], id: number): Question | null {
        return questions.find((q) => q.id === id) ?? null;
    }

    private resolveLocale(lang: string | undefined): LocaleCode {
        return lang === 'ru' ? 'ru' : 'en';
    }

    private mapRowToQuestion(row: QuestionBilingualRow, lang: LocaleCode): Question {
        const t = row.text[lang] ?? row.text.en;
        return {
            id: row.id,
            question: t.question,
            answer: t.interviewAnswer,
            weakAnswer: t.weakAnswer,
            technicalAnswer: t.technicalAnswer,
            interviewAnswer: t.interviewAnswer,
            codeExample: row.codeExample ?? '',
            readMoreLinks: this.mapReadMoreLinks(row.readMoreLinks, lang),
            subtopic: row.subtopic,
            category: this.mapTopicToCategory(row.topic, row.subtopic),
            difficulty: row.difficulty
        };
    }

    private mapReadMoreLinks(rows: QuestionReadMoreLinkRow[] | undefined, lang: LocaleCode): QuestionReadMoreLink[] {
        if (!rows?.length) {
            return [];
        }
        const out: QuestionReadMoreLink[] = [];
        for (const row of rows) {
            const url = typeof row.url === 'string' ? row.url.trim() : '';
            if (!url.startsWith('https://')) {
                continue;
            }
            const titleRaw = row.title?.[lang] ?? row.title?.en ?? '';
            const title = typeof titleRaw === 'string' ? titleRaw.trim() : '';
            if (!title) {
                continue;
            }
            out.push({ url, title });
        }
        return out;
    }

    private mapTopicToCategory(topic: string, subtopic: string): QuestionCategory {
        const t = topic.toLowerCase();
        const s = subtopic.toLowerCase();
        if (t === 'javascript') {
            return 'javascript';
        }
        if (t === 'angular') {
            if (s === 'rxjs' || s === 'observables') {
                return 'rxjs';
            }
            return 'angular';
        }
        return 'javascript';
    }
}
