# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # dev server at http://localhost:4200
ng build           # production build → dist/karkas/browser/
ng test            # unit tests (Vitest runner via @angular/build)
npm run e2e        # Playwright e2e (reuses existing ng serve; run npm start first locally)
npm run e2e:ui     # Playwright interactive UI mode
```

Run a single unit test file:
```bash
ng test --include="**/progress.service.spec.ts"
```

After a fresh clone, install Playwright browsers before running e2e:
```bash
npx playwright install chromium
```

Data pipeline scripts (regenerate `src/assets/data/questions-bilingual.json`):
```bash
npm run data:code-examples      # merge code examples into bilingual JSON
npm run data:read-more-links    # merge external article links
npm run data:i18n-questions     # apply Russian translations
```

## Architecture

### Overview

Karkas is a browser-only Angular 21 SPA with no backend. All persistent state lives in `localStorage` via `StorageService` (prefix `interview-trainer:`). The app uses hash-based routing (`withHashLocation()`) for GitHub Pages compatibility.

### Routing & Features

All routes lazy-load their page component:

| Path | Feature | Purpose |
|------|---------|---------|
| `/quiz` | quiz | Timed practice with spaced repetition |
| `/study` | study | Study guide grouped by category/subtopic |
| `/plan` | plan | Pick topics to study today |
| `/dashboard` | dashboard | Progress stats and activity charts |
| `/my-questions` | my-questions | CRUD for user-added custom questions |
| `/about` | about | Static info page |

### Services (`src/app/core/services/`)

- **`StorageService`** — thin localStorage wrapper; all other services use this; keys are `interview-trainer:<key>`
- **`QuestionService`** — loads `assets/data/questions-bilingual.json`, maps rows to the active locale, merges custom questions; exposes `getQuestions(): Observable<Question[]>` and manages the in-session queue
- **`ProgressService`** — records self-ratings, computes `nextReview` dates (spaced repetition: nailed +3d, partial +2d, didn't know +1d), exposes `getDueQuestionsSync()`; storage key `progress`
- **`ActivityService`** — tracks per-day stats (questions answered, topics studied, active seconds, per-question best rating); storage key `activity-by-day`; kept up to 400 days
- **`TodayPlanService`** — manages the daily topic checklist (selected/studied topic IDs); auto-resets on calendar day rollover; storage key `today-plan`
- **`ActiveTimeService`** — counts foreground seconds on `/quiz`, `/study`, `/plan` only; flushes to `ActivityService` every 5 s or on navigation/tab hide
- **`CustomQuestionService`** — signal-based CRUD for user questions; storage key `custom-questions`; exposes `asQuestions` computed signal that converts to the `Question` interface
- **`ThemeService`** — light/dark theme, persisted in localStorage

### Data Models (`src/app/shared/models/`)

- **`Question`** — `{ id, question, answer, weakAnswer, technicalAnswer, interviewAnswer, codeExample, readMoreLinks, subtopic, category, difficulty }`; `category: 'javascript' | 'angular' | 'rxjs' | 'custom'`
- **`Progress`** — `{ questionId, nailedCount, partialCount, didntKnowCount, lastAnswered, nextReview }`; has a legacy `LegacyProgress` shape (uses `correctCount`) that is normalized on load
- **`DailyActivity`** — `{ date, questionsAnswered, topicsStudied, activeSeconds, coveredTopicIds, practiceRatingBest? }`; `practiceRatingBest` maps question id → best `SelfRating` that day
- **`TodayPlanState`** — `{ planDate, selectedTopicIds, studiedTopicIds }` (all `string[]` of `category:subtopic` IDs)
- **`CustomQuestion`** — `{ id, question, answer, subtopic, difficulty, createdAt }`

### Topic ID Convention

Topics throughout the codebase use the compound string `category:subtopic` (e.g. `angular:signals`). Utility functions in `src/app/shared/utils/topic-key.utils.ts` (`topicIdFromQuestion`, `topicIdFromParts`) produce these IDs.

### Quiz Flow

`QuizPageComponent` drives a three-phase state machine: `question → answer → feedback`. The service `QuestionService` manages the session queue. Practice scope is either `planFocused` (only questions in today's studied topics) or `full` (entire catalog). When focused topics have no due items, a dialog prompts the user before falling back to all questions in those topics.

### Study Guide

`study-guide-grouping.ts` (in the `study` feature) groups questions into `StudyCategorySection[]` → `StudySubtopicSection[]`. Categories are ordered `javascript → angular → rxjs → custom`. The study page supports URL params: `?today=1` (filter to today's plan topics) and `?topics=cat:sub,cat:sub2` (focus on specific topic IDs, used by the retry banner).

### Retry Banner

The root `App` component computes `retryTopicIds`: topic IDs where the user's best past-day rating was `didntKnow` or `partial` and the topic has not been covered today. The banner links to `/study?topics=...`.

### Bilingualism

`@ngx-translate` with HTTP loader. Translation files: `src/assets/i18n/en.json` and `ru.json`. The active locale is stored under `localStorage` key resolved by `LOCALE_STORAGE_KEY`. `QuestionService` reacts to `translate.onLangChange` and re-maps question text on the fly. The i18n loader resolves the asset base path from `<base href>` to support GitHub Pages subpath deployment.

### Component Conventions

All components are standalone with `ChangeDetectionStrategy.OnPush`. State is managed with `signal()` and `computed()`. Services are injected with `inject()`. Subscriptions use `takeUntilDestroyed()`. Observables are bridged to signals with `toSignal()`.

### Testing Patterns

Unit tests use Angular `TestBed`. Translations are stubbed with a custom `TranslateLoader` that returns a minimal `TranslationObject`. `provideHttpClient()` and `provideRouter(routes)` are standard setup providers. See `src/app/app.spec.ts` for the canonical stub pattern.

E2E tests live in `e2e/` and use Playwright against the running dev server. Locally `reuseExistingServer` is enabled, so start `ng serve` before running `npm run e2e`.
