# Architecture

Karkas is a browser-only Angular 21 single-page application with no backend: every piece of
persistent state lives in `localStorage` behind `StorageService` (key prefix
`interview-trainer:`). The app is bilingual (EN/RU via `@ngx-translate`), uses hash-based
routing (`withHashLocation()`), ships as a PWA (Angular service worker), and hosts two subject
areas — the original interview-prep trainer (JavaScript/Angular/RxJS + user questions) and a
sociology multiple-choice trainer — behind a subject-selector home page. The app deploys to
GitHub Pages via `.github/workflows/deploy-pages.yml`, with per-environment configuration in
`src/environments/` (see [deployment.md](deployment.md)); a Netlify pipeline introduced in
issue #74 was later removed in favour of Pages.

All components are standalone with `ChangeDetectionStrategy.OnPush`; state is held in
signals, services are injected with `inject()`, and Observables are bridged with `toSignal()`.

## Module Reference

### src/main.ts

**Why it exists:** Standalone-API entry point — the app has no NgModules, so bootstrapping is a single `bootstrapApplication` call wiring the root component to the provider configuration.

| Export | Purpose |
|--------|---------|
| *(none)* | Side-effect module: calls `bootstrapApplication(App, appConfig)`. |

### src/app/app.config.ts

**Why it exists:** Central provider configuration for the standalone bootstrap; it is the one place where cross-cutting platform concerns (router, HTTP, i18n loading, service worker) are wired, keeping `main.ts` and components free of setup logic.

| Export | Purpose |
|--------|---------|
| `appConfig: ApplicationConfig` | Providers: hash-location router with in-memory scrolling, `provideHttpClient`, ngx-translate with a `<base href>`-aware HTTP loader (works both at `/` and on subpath deploys), an app initializer that resolves the startup locale (saved → browser → `en`), and the Angular service worker (production only). |

### src/app/app.routes.ts

**Why it exists:** Single route table so every feature stays lazy-loaded — each route uses `loadComponent`, which keeps the initial bundle to the shell plus the subject selector.

| Export | Purpose |
|--------|---------|
| `routes: Routes` | `/` (subject selector), `/quiz`, `/dashboard`, `/study`, `/plan`, `/about`, `/my-questions`, and the `/sociology/{quiz,study,plan,dashboard}` subtree; wildcard redirects home. |

### src/app/app.ts

**Why it exists:** Root shell component — it owns everything that must exist regardless of route: navigation (including which subject's nav block is visible), language and theme switching, and the cross-page banners (retry topics, practice reminder, resume session, offline / PWA update indicators).

| Export | Purpose |
|--------|---------|
| `App` | Root component. Computes `retryTopicIds` (topics whose best past-day rating was `didntKnow`/`partial` and that are not yet covered today), gates banners by current path, persists locale changes, and reads the saved quiz-session snapshot for the resume nudge. |

### src/app/core/locale.constants.ts

**Why it exists:** The locale key is read both before Angular DI is fully up (app initializer) and by components, so it lives in a dependency-free constants module.

| Export | Purpose |
|--------|---------|
| `LOCALE_STORAGE_KEY` | `localStorage` key (`interview-trainer-locale`) holding the active language. |

### src/app/core/theme.constants.ts

**Why it exists:** Shared by the pre-boot theme snippet in `index.html` and `ThemeService`, so the theme key/type cannot drift between the two.

| Export | Purpose |
|--------|---------|
| `THEME_STORAGE_KEY` | `localStorage` key (`interview-trainer-theme`). |
| `ThemeId` | `'light' \| 'dark'` union used everywhere a theme is passed around. |

### src/app/core/services/storage.service.ts

**Why it exists:** Single choke point for `localStorage` so every other service shares one key namespace (`interview-trainer:<key>`), one JSON (de)serialization path, and one place to observe storage usage.

| Export | Purpose |
|--------|---------|
| `StorageService` | Typed `get`/`set`/`remove` over prefixed keys plus a usage estimate against the ~5 MB quota for the storage-pressure UI. |

### src/app/core/services/question.service.ts

**Why it exists:** Decouples the rest of the app from how questions are sourced: it loads the bilingual catalog (`assets/data/questions-bilingual.json`), maps rows to the active locale (re-mapping live on `onLangChange`), and merges in user-created custom questions so consumers see one uniform `Question[]`.

| Export | Purpose |
|--------|---------|
| `QuestionService` | `getQuestions(): Observable<Question[]>` (built-in + custom, locale-mapped) and the in-session quiz queue management. |

### src/app/core/services/progress.service.ts

**Why it exists:** Owns the spaced-repetition model: it is the only module that knows how self-ratings translate into review scheduling, so the algorithm (SM-2) can evolve without touching quiz UI code. Storage key `progress`; legacy rows are normalized on load.

| Export | Purpose |
|--------|---------|
| `sm2(...)` | Pure SM-2 step: given prior ease/repetitions/interval and a rating score, returns the next scheduling state. |
| `SCORE_BY_RATING` | Maps `SelfRating` → SM-2 quality score. |
| `MASTERY_MIN_REPETITIONS` | Repetition threshold (5) for considering a question mastered. |
| `isQuestionMastered(p)` | Whether a single `Progress` row meets the mastery bar. |
| `isTopicMastered(...)` | Whether every question of a topic is mastered. |
| `ProgressService` | Records ratings, computes `nextReview`, exposes `getDueQuestionsSync()` and progress signals. |

### src/app/core/services/activity.service.ts

**Why it exists:** Per-day activity ledger (storage key `activity-by-day`, capped at 400 days) that dashboard charts, streaks, and the retry banner all read; centralizing writes keeps "what counts as activity" consistent across quiz, study, and plan.

| Export | Purpose |
|--------|---------|
| `PracticeRatingBreakdown` | Counts of nailed/partial/didntKnow for a day. |
| `ActivityService` | Records questions answered, topics covered, active seconds, and per-question best rating per day; exposes `activityMap()` / `practicedToday()` signals. |

### src/app/core/services/active-time.service.ts

**Why it exists:** Measuring real engagement needs one global observer of route + tab visibility; this service counts foreground seconds only on practice-relevant routes (interview `/quiz`, `/study`, `/plan` and their sociology counterparts) and batches writes (flush every 5 s) to limit `localStorage` churn.

| Export | Purpose |
|--------|---------|
| `ActiveTimeService` | Instantiated once from the root component; flushes accumulated seconds to the matching activity service on interval, navigation, or tab hide. |

### src/app/core/services/today-plan.service.ts

**Why it exists:** The daily study checklist has calendar semantics (auto-reset on day rollover, carry-over of unfinished topics) that must be enforced in one place rather than per page. Storage key `today-plan`.

| Export | Purpose |
|--------|---------|
| `TodayPlanService` | Manages `selectedTopicIds`/`studiedTopicIds` for today, resets on date change, and exposes plan state as signals. |

### src/app/core/services/plan-suggestion.service.ts

**Why it exists:** Encapsulates the heuristic for "what should I study today" (weak or stale topics, max 5 suggestions, 7-day staleness window) so the Plan page stays presentation-only.

| Export | Purpose |
|--------|---------|
| `PlanSuggestionService` | Ranks topics from questions + progress + activity history into today's suggested topic IDs. |

### src/app/core/services/custom-question.service.ts

**Why it exists:** User-created questions live in a different shape (`CustomQuestion`) and lifecycle (CRUD, storage key `custom-questions`) than the read-only built-in catalog; this service owns that lifecycle and adapts rows into the common `Question` interface.

| Export | Purpose |
|--------|---------|
| `CustomQuestionService` | Signal-based CRUD; `questions()` signal of raw rows and `asQuestions` computed signal converting to `Question` (category `custom`). |

### src/app/core/services/achievement.service.ts

**Why it exists:** Gamification state (earned badges) spans multiple features — quiz sessions, language switching, streaks — so badge rules and their persistence (storage key `achievements`) are collected in one service instead of scattered across pages.

| Export | Purpose |
|--------|---------|
| `AchievementId` | Union of all badge identifiers. |
| `EarnedBadge` | A badge id plus the ISO date it was earned. |
| `SessionAchievementStats` | Per-session inputs (question count, duration, ratings, language switch) used to evaluate session badges. |
| `AchievementService` | Evaluates and persists badges (e.g. speed run: ≥10 questions in ≤3 min); exposes earned badges as a signal. |

### src/app/core/services/data-export.service.ts

**Why it exists:** With no backend, the user's only backup path is a file export; this service defines the backup format and the import/merge rules so all `localStorage` state can round-trip safely.

| Export | Purpose |
|--------|---------|
| `AppBackup` | Versioned JSON envelope of progress, activity, custom questions, plan, and preferences with `exportedAt`. |
| `BackupDiff` | Counts summarizing what an import would change, shown before applying. |
| `DataExportService` | Serializes state to a downloadable backup and validates/applies imported backups. |

### src/app/core/services/user-preferences.service.ts

**Why it exists:** Small typed home for user-tunable settings (currently the daily practice goal, clamped to 1–200) so validation and persistence aren't reimplemented by each consumer.

| Export | Purpose |
|--------|---------|
| `UserPreferencesService` | Signal-backed `dailyGoal` with clamping and `localStorage` persistence. |

### src/app/core/services/theme.service.ts

**Why it exists:** Theme must be applied to `<html data-theme>` before Angular renders (to avoid flash) and then kept in sync with user toggles; this service reconciles the pre-boot attribute, the saved preference, and the OS preference.

| Export | Purpose |
|--------|---------|
| `ThemeService` | `theme` signal, `toggleTheme()`, persistence under `THEME_STORAGE_KEY`. |

### src/app/core/services/network-status.service.ts

**Why it exists:** The PWA works offline, so the shell needs a reactive connectivity source to show the offline indicator without each component listening to window events.

| Export | Purpose |
|--------|---------|
| `NetworkStatusService` | `online` signal driven by browser `online`/`offline` events. |

### src/app/core/services/pwa-update.service.ts

**Why it exists:** Service-worker updates should never silently reload the app mid-session; this service surfaces newly activated versions so the user reloads on their own terms (the SW only caches network responses, never `localStorage`).

| Export | Purpose |
|--------|---------|
| `PwaUpdateService` | Listens to `SwUpdate` version events and exposes an update-available signal plus a reload action. |

### src/app/core/services/sociology-question.service.ts

**Why it exists:** Sociology questions come from their own catalog asset and can be edited by the user; this service merges the built-in catalog with `SociologyCatalogEditService` overlays so consumers get one effective question list.

| Export | Purpose |
|--------|---------|
| `SociologyQuestionService` | `Observable<SociologyQuestion[]>` of the merged catalog (shared/replayed). |

### src/app/core/services/sociology-catalog-edit.service.ts

**Why it exists:** Users can add/edit/delete sociology questions, but the built-in catalog asset is read-only — so edits are stored as an overlay (storage key `sociology-catalog-edits`) validated through `validateSociologyQuestion` and applied on top of the catalog.

| Export | Purpose |
|--------|---------|
| `SociologyCatalogEditService` | Signal-based CRUD for catalog overrides, additions, and deletions with validation. |

### src/app/core/services/sociology-progress.service.ts

**Why it exists:** Sociology practice is multiple-choice with graded outcomes rather than self-rating, so it needs its own progress model and store (storage key `sociology-progress`, pruned past 400 days) separate from the interview-prep SM-2 data.

| Export | Purpose |
|--------|---------|
| `SociologyAnswerOutcome` | `'correct' \| 'partial' \| 'wrong'` outcome of an MCQ answer. |
| `SociologyProgressService` | Records outcomes per question and exposes progress for the sociology dashboard/quiz. |

### src/app/core/services/sociology-activity.service.ts

**Why it exists:** Keeps sociology per-day stats (storage key `sociology-activity-by-day`, 400-day cap) isolated from the interview-prep `activity-by-day` ledger so each subject's dashboard and streaks stay independent.

| Export | Purpose |
|--------|---------|
| `SociologyActivityService` | Records sociology questions answered, topics covered, and active seconds per day. |

### src/app/shared/models/question.model.ts

**Why it exists:** Canonical question shape shared by the catalog loader, custom questions adapter, quiz, and study guide — the contract every question source must map into.

| Export | Purpose |
|--------|---------|
| `QuestionCategory` | `'javascript' \| 'angular' \| 'rxjs' \| 'custom' \| 'sociology'`. |
| `QuestionDifficulty` | `'beginner' \| 'intermediate' \| 'advanced'`. |
| `QuestionReadMoreLink` | External article link (label + https URL). |
| `Question` | Full question row: prompt, weak/technical/interview answers, code example, links, subtopic, category, difficulty. |

### src/app/shared/models/progress.model.ts

**Why it exists:** Persistent spaced-repetition record per question; keeps the current SM-2 shape and the legacy shape side by side so old stored data can be normalized on load.

| Export | Purpose |
|--------|---------|
| `Progress` | Rating counts, `lastAnswered`, `nextReview`, plus SM-2 state (`easeFactor`, `repetitionCount`, `intervalDays`). |
| `LegacyProgress` | Pre-SM-2 stored shape (`correctCount`-based), converted on read. |

### src/app/shared/models/activity.model.ts

**Why it exists:** The per-day activity row persisted by `ActivityService` and consumed by dashboard charts and banner logic.

| Export | Purpose |
|--------|---------|
| `DailyActivity` | `{ date, questionsAnswered, topicsStudied, activeSeconds, coveredTopicIds, practiceRatingBest? }`; `practiceRatingBest` maps question id → best `SelfRating` that day. |

### src/app/shared/models/today-plan.model.ts

**Why it exists:** Persistent shape of the daily plan so `TodayPlanService` and the Plan page agree on what survives a day rollover.

| Export | Purpose |
|--------|---------|
| `TodayPlanState` | `{ planDate, selectedTopicIds, studiedTopicIds }` (topic IDs are `category:subtopic`). |
| `PlanCarryover` | Topics carried over from an unfinished previous day's plan. |

### src/app/shared/models/custom-question.model.ts

**Why it exists:** Storage shape for user-created questions — deliberately smaller than `Question` (single answer, no code example) because users author simple Q&A cards.

| Export | Purpose |
|--------|---------|
| `CustomQuestion` | `{ id, question, answer, subtopic, difficulty, createdAt }`. |

### src/app/shared/models/self-rating.model.ts

**Why it exists:** The three-way self-evaluation vocabulary used by quiz, progress, and activity must be a single union type to keep scoring maps exhaustive.

| Export | Purpose |
|--------|---------|
| `SelfRating` | `'didntKnow' \| 'partial' \| 'nailed'`. |

### src/app/shared/models/active-session.model.ts

**Why it exists:** Snapshot format for an in-flight quiz session (storage key `active-session`) so the root shell can offer "resume where you left off" after a reload or tab close.

| Export | Purpose |
|--------|---------|
| `ActiveSessionSnapshot` | Queue question IDs, current index, session total, and `savedAt` (snapshots older than 24 h are ignored). |

### src/app/shared/models/sociology-question.model.ts

**Why it exists:** Sociology questions are multiple-choice with topic/subtopic taxonomy — structurally different from interview `Question`, so they get their own model.

| Export | Purpose |
|--------|---------|
| `SociologyQuestion` | MCQ row: prompt, options, correct option indices, topic, subtopic. |

### src/app/shared/models/sociology-progress.model.ts

**Why it exists:** Persistent per-question record for sociology practice, kept separate from interview `Progress` because outcomes are graded, not self-rated.

| Export | Purpose |
|--------|---------|
| `SociologyProgress` | Outcome counts and last-answered metadata per sociology question. |

### src/app/shared/utils/topic-key.utils.ts

**Why it exists:** Topics are identified everywhere by the compound string `category:subtopic` (e.g. `angular:signals`); these helpers are the only sanctioned way to build those IDs so the format can't drift.

| Export | Purpose |
|--------|---------|
| `topicIdFromQuestion(q)` | Topic ID from a question's category/subtopic. |
| `topicIdFromParts(category, subtopic)` | Topic ID from explicit parts. |

### src/app/shared/utils/sociology-topic-key.utils.ts

**Why it exists:** Sociology topics share the plan/checklist machinery with interview topics, so their IDs need a distinguishable, URL-safe encoding (`sociology:` prefix + slugified segments).

| Export | Purpose |
|--------|---------|
| `SOCIOLOGY_PLAN_TOPIC_PREFIX` | `'sociology:'` marker prefix. |
| `slugifySociologySegment(s)` | URL/ID-safe slug for a topic/subtopic label. |
| `sociologyPlanTopicId(topic, subtopic)` | Builds a prefixed plan topic ID. |
| `isSociologyPlanTopicId(id)` | Distinguishes sociology from interview topic IDs. |
| `sociologyPlanTopicIdDisplayLabel(planTopicId)` | Human-readable label back from an ID. |

### src/app/shared/utils/local-date.utils.ts

**Why it exists:** All day-based logic (activity ledger, plan rollover, streaks) must agree on what "today" means in the user's local timezone; this is the single date-to-`YYYY-MM-DD` formatter.

| Export | Purpose |
|--------|---------|
| `formatLocalYmd(date)` | Local-timezone `YYYY-MM-DD` string. |

### src/app/shared/utils/question-text.utils.ts

**Why it exists:** Some question prompts embed a code block in their text; splitting prose from code is shared logic between the quiz question view and the pipe that formats prompts.

| Export | Purpose |
|--------|---------|
| `splitQuestionPromptAndCode(text)` | Returns `{ lead, code }` — prose lead-in plus optional code block. |

### src/app/shared/utils/topic-last-studied.utils.ts

**Why it exists:** "When did I last touch this topic?" is answered from two different histories (study coverage in activity rows, practice timestamps in progress rows) for two subjects; these pure functions merge those sources into per-topic hints the Plan pages display.

| Export | Purpose |
|--------|---------|
| `TopicLastStudiedHint` | Discriminated hint: studied date, practiced date, or never. |
| `lastCoveredYmdByTopic(activityMap)` | Last study-coverage date per topic from the activity ledger. |
| `lastPracticeIsoByTopic(questions, progress)` | Last practice timestamp per interview topic. |
| `lastSociologyPracticeIsoByTopic(...)` | Sociology equivalent of the above. |
| `buildTopicLastStudiedDateMap(...)` | Merged topic → date map (interview). |
| `buildTopicLastStudiedHintMap(...)` | Merged topic → `TopicLastStudiedHint` map (interview). |
| `buildSociologyTopicLastStudiedHintMap(...)` | Merged hint map for sociology plan topics. |

### src/app/shared/utils/sociology-answer.utils.ts

**Why it exists:** Grading a multi-select MCQ (full / partial / wrong credit) is pure logic used by both the sociology quiz and its tests, so it lives outside any component.

| Export | Purpose |
|--------|---------|
| `SociologyOutcome` | `'correct' \| 'partial' \| 'wrong'`. |
| `evaluateSociologySelection(...)` | Compares selected option indices against correct ones and returns the outcome. |

### src/app/shared/utils/sociology-question-validate.utils.ts

**Why it exists:** User-edited sociology questions must satisfy MCQ invariants (non-empty prompt/options, valid correct-answer indices); validation is shared by the editor sheet and the catalog-edit service.

| Export | Purpose |
|--------|---------|
| `SociologyQuestionValidationCode` | Union of validation error codes (mapped to i18n messages). |
| `validateSociologyQuestion(q)` | Returns the first violated code or `null` when valid. |

### src/app/shared/pipes/split-question-code.pipe.ts

**Why it exists:** Templates need the prompt/code split declaratively; the pipe wraps `splitQuestionPromptAndCode` so change detection memoizes the parse.

| Export | Purpose |
|--------|---------|
| `QuestionPromptCodeParts` | `{ lead, code }` result shape for templates. |
| `SplitQuestionCodePipe` | Pure pipe performing the split. |

### src/app/shared/pipes/search-highlight.pipe.ts

**Why it exists:** Study-guide search needs to highlight matched substrings safely (escaped HTML with `<mark>` around matches) — sanitization logic that belongs in one pipe, not in templates.

| Export | Purpose |
|--------|---------|
| `SearchHighlightPipe` | Wraps case-insensitive matches of the query in highlight markup. |

### src/app/shared/components/answer-blocks/answer-blocks.component.ts

**Why it exists:** The weak/technical/interview answer presentation is used by both the quiz answer phase and the study guide; custom questions render a single block instead of three, and that branching lives here once.

| Export | Purpose |
|--------|---------|
| `AnswerBlocksComponent` | Renders a question's answer block(s), code example, and read-more links. |

### src/app/shared/components/progress-bar/progress-bar.component.ts

**Why it exists:** Small reusable determinate progress bar (session progress, dashboard stats) with consistent styling and a11y attributes.

| Export | Purpose |
|--------|---------|
| `ProgressBarComponent` | Renders a value/max progress bar. |

### src/app/features/subject-selector/pages/subject-selector-page/subject-selector-page.component.ts

**Why it exists:** Home page (`/`) letting the user choose between the two subject areas; keeps subject-specific navigation out of the shell until a subject is picked.

| Export | Purpose |
|--------|---------|
| `SubjectSelectorPageComponent` | Cards linking into interview prep and sociology sections. |

### src/app/features/quiz/pages/quiz-page/quiz-page.component.ts

**Why it exists:** Orchestrates the interview practice session — the three-phase state machine, session sizing, plan-focused vs. full scope (with the fallback dialog when focused topics have no due items), timing, and session persistence for resume. Child components stay presentational.

| Export | Purpose |
|--------|---------|
| `QuizPhase` | `'question' \| 'answer' \| 'feedback'` state machine phases. |
| `SessionMode` | `'quick' \| 'standard' \| 'deep'` session length presets. |
| `FeedbackSnapshot` | Data shown in the feedback phase for the just-rated question. |
| `SessionProgressCounts` | Per-rating tallies for the session summary. |
| `QuizPageComponent` | The session orchestrator described above. |

### src/app/features/quiz/components/interview-question/interview-question.component.ts

**Why it exists:** Presentational question phase — renders the prompt (with optional code block) without knowing session state.

| Export | Purpose |
|--------|---------|
| `InterviewQuestionComponent` | Displays the current question prompt. |

### src/app/features/quiz/components/interview-answer/interview-answer.component.ts

**Why it exists:** Presentational answer phase — shows the reference answers so the user can compare before self-rating.

| Export | Purpose |
|--------|---------|
| `InterviewAnswerComponent` | Displays the answer blocks for the current question. |

### src/app/features/quiz/components/self-evaluation/self-evaluation.component.ts

**Why it exists:** The rating input is its own component so the three-way choice (didn't know / partial / nailed) has one accessible implementation.

| Export | Purpose |
|--------|---------|
| `SelfEvaluationComponent` | Emits the chosen `SelfRating`. |

### src/app/features/quiz/components/interview-feedback/interview-feedback.component.ts

**Why it exists:** Presentational feedback phase — confirms the rating and shows scheduling consequences before advancing.

| Export | Purpose |
|--------|---------|
| `InterviewFeedbackComponent` | Displays feedback for the just-answered question. |

### src/app/features/quiz/components/quiz-timer/quiz-timer.component.ts

**Why it exists:** Per-question countdown/elapsed display isolated from the page so timer ticks don't dirty the whole quiz view.

| Export | Purpose |
|--------|---------|
| `QuizTimerComponent` | Renders elapsed/remaining time for the current question. |

### src/app/features/study/study-guide-grouping.ts

**Why it exists:** Pure grouping/filtering layer between the flat question list and the study page's category → subtopic outline; keeping it component-free makes ordering rules (`javascript → angular → rxjs → custom`) and every filter unit-testable.

| Export | Purpose |
|--------|---------|
| `StudySubtopicSection` / `StudyCategorySection` | Grouped view models for the outline. |
| `slugifySubtopic(subtopic)` | Anchor-safe slug for deep links. |
| `buildStudyGuideSections(questions)` | Groups questions into ordered sections. |
| `filterStudyGuideSectionsByTopicIds(...)` | Keep only given topic IDs (used by `?topics=` retry links). |
| `filterStudyGuideSectionsExcludingTopicIds(...)` | Inverse filter. |
| `filterStudyGuideSectionsWithoutPractice(...)` | Only topics never practiced. |
| `filterStudyGuideSectionsByDifficulty(...)` | Difficulty filter. |
| `filterStudyGuideSectionsBySearch(...)` | Text search filter. |

### src/app/features/study/pages/study-guide-page/study-guide-page.component.ts

**Why it exists:** The study surface: renders the grouped outline, wires the URL params (`?today=1`, `?topics=...`), search/difficulty filters, and "mark topic studied" actions that feed the plan and activity services.

| Export | Purpose |
|--------|---------|
| `StudyGuidePageComponent` | Study guide page at `/study`. |

### src/app/features/plan/pages/plan-page/plan-page.component.ts

**Why it exists:** UI for composing today's topic checklist — combines the full topic catalog, last-studied hints, and `PlanSuggestionService` output on top of `TodayPlanService` state.

| Export | Purpose |
|--------|---------|
| `PlanSortMode` | `'default' \| 'oldest-first' \| 'newest-first'` topic ordering. |
| `PlanPageComponent` | Plan page at `/plan`. |

### src/app/features/dashboard/pages/dashboard-page/dashboard-page.component.ts

**Why it exists:** Aggregates progress + activity into the stats view models (streaks, accuracy, weak topics, hardest questions) in one place; also hosts data export/import via `DataExportService`.

| Export | Purpose |
|--------|---------|
| `HardestQuestion` | Question ranked by failure rate. |
| `WeakTopic` | Topic with poor best ratings. |
| `TopicStrengthEntry` | Per-topic mastery breakdown. |
| `DifficultyAccuracyEntry` | Accuracy grouped by difficulty. |
| `DashboardStats` | Combined stats view model. |
| `DashboardPageComponent` | Dashboard page at `/dashboard`. |

### src/app/features/dashboard/components/trend-chart/trend-chart.component.ts

**Why it exists:** Renders the questions-per-day trend as inline SVG with a selectable window; extracted so chart geometry is testable apart from dashboard data assembly.

| Export | Purpose |
|--------|---------|
| `TrendWindow` | `'7d' \| '30d' \| 'all'` window selector. |
| `TrendPoint` | One date/value pair. |
| `TrendChartComponent` | SVG line/area chart of activity. |

### src/app/features/dashboard/components/activity-heatmap/activity-heatmap.component.ts

**Why it exists:** GitHub-style calendar heatmap of daily activity with a per-day detail popover; cell bucketing and layout are isolated from the dashboard page.

| Export | Purpose |
|--------|---------|
| `HeatmapCell` | One day cell (date, intensity bucket). |
| `HeatmapDayDetail` | Detail shown for a selected day. |
| `ActivityHeatmapComponent` | The heatmap grid. |

### src/app/features/my-questions/pages/my-questions-page/my-questions-page.component.ts

**Why it exists:** CRUD surface for user questions on top of `CustomQuestionService` — form validation, edit-in-place, and delete confirmation live here, keeping the service UI-free.

| Export | Purpose |
|--------|---------|
| `MyQuestionsPageComponent` | `/my-questions` page (add/edit/delete + list). |

### src/app/features/about/pages/about-page/about-page.component.ts

**Why it exists:** Static informational page; exists as a lazy route target so the shell nav has a home for app info in both subjects.

| Export | Purpose |
|--------|---------|
| `AboutPageComponent` | Static `/about` content. |

### src/app/features/sociology-study/sociology-study-grouping.ts

**Why it exists:** Sociology counterpart of the study grouping layer — pure functions building topic → subtopic sections from the MCQ catalog and filtering by subtopics or plan topic IDs.

| Export | Purpose |
|--------|---------|
| `SociologyStudySubtopicSection` / `SociologyStudyTopicSection` | Grouped view models. |
| `buildSociologyStudySections(questions)` | Groups the catalog into ordered sections. |
| `filterSociologySectionsBySubtopics(...)` | Subtopic filter. |
| `filterSociologySectionsByPlanTopicIds(...)` | Filter by `sociology:`-prefixed plan topic IDs. |

### src/app/features/sociology-study/pages/sociology-study-page/sociology-study-page.component.ts

**Why it exists:** Sociology study surface: grouped browsing of the MCQ catalog plus entry points into the question editor sheet for catalog edits.

| Export | Purpose |
|--------|---------|
| `SociologyStudyPageComponent` | `/sociology/study` page. |

### src/app/features/sociology-study/components/sociology-question-editor-sheet/sociology-question-editor-sheet.component.ts

**Why it exists:** Modal sheet for creating/editing a sociology question; owns form state and surfaces `validateSociologyQuestion` errors before handing the row to `SociologyCatalogEditService`.

| Export | Purpose |
|--------|---------|
| `SociologyQuestionEditorSheetComponent` | Add/edit sheet for MCQ rows. |

### src/app/features/sociology-quiz/pages/sociology-quiz-page/sociology-quiz-page.component.ts

**Why it exists:** Drives the sociology MCQ session — a two-phase machine (no self-rating; grading comes from `evaluateSociologySelection`) recording outcomes to the sociology progress/activity services.

| Export | Purpose |
|--------|---------|
| `SociologyQuizPhase` | `'question' \| 'feedback'` phases. |
| `SociologyQuizPageComponent` | `/sociology/quiz` page. |

### src/app/features/sociology-plan/pages/sociology-plan-page/sociology-plan-page.component.ts

**Why it exists:** Sociology daily checklist built on the shared `TodayPlanService`, using `sociology:`-prefixed topic IDs and sociology last-studied hints.

| Export | Purpose |
|--------|---------|
| `SociologyPlanPageComponent` | `/sociology/plan` page. |

### src/app/features/sociology-dashboard/pages/sociology-dashboard-page/sociology-dashboard-page.component.ts

**Why it exists:** Aggregates sociology progress/activity into subject-specific stats, mirroring the interview dashboard but over MCQ outcomes.

| Export | Purpose |
|--------|---------|
| `SociologyWeakSubtopic` | Subtopic ranked by wrong/partial outcomes. |
| `SociologyDashboardStats` | Combined stats view model. |
| `SociologyDashboardPageComponent` | `/sociology/dashboard` page. |

### src/environments/environment.ts

**Why it exists:** Default (production) build-time configuration; introduced with the dedicated-hosting move (#74) so environment-specific values are compiled in rather than sniffed at runtime. Application code imports only this path — other configurations replace the file via `fileReplacements` in `angular.json`.

| Export | Purpose |
|--------|---------|
| `environment` | `{ production: true, envName: 'production', apiBaseUrl: '/api' }`; `apiBaseUrl` is reserved for the future backend (issue #75) and points at same-origin `/api`, which the host will proxy. |

### src/environments/environment.development.ts

**Why it exists:** Development-build replacement for `environment.ts` (used by `ng serve`), pointing the future API base at a local server.

| Export | Purpose |
|--------|---------|
| `environment` | `{ production: false, envName: 'development', apiBaseUrl: 'http://localhost:3000/api' }`. |

### src/environments/environment.staging.ts

**Why it exists:** Production-like configuration for pre-release builds (`npm run build:staging`) so they are distinguishable from production. Currently has no hosted deploy target; kept for local production-like builds and any future staging host.

| Export | Purpose |
|--------|---------|
| `environment` | `{ production: false, envName: 'staging', apiBaseUrl: '/api' }`. |

### .github/workflows/deploy-pages.yml

**Why it exists:** The CI/CD pipeline — builds the app and publishes it to GitHub Pages on every push to `master`. (A dedicated Netlify pipeline, `deploy-hosting.yml` + `netlify.toml`, was introduced in issue #74 and later removed in favour of Pages; see [deployment.md](deployment.md).)

| Definition | Purpose |
|------------|---------|
| `on: push (master)` / `workflow_dispatch` | Production build → upload Pages artifact → `actions/deploy-pages`. |
| `--base-href /<repo-name>/` build flag | Pages serves from a repo subpath, so the app's base URL must match. |
| `404.html` copy step | Copies `index.html` to `404.html` so path-style deep links fall back to the SPA. |
| `Generate build.txt` step | Emits name/version/dependencies/timestamp into `dist/karkas/browser/build.txt` for deploy verification. |
| Permissions `pages: write`, `id-token: write` | Deploys with the built-in `GITHUB_TOKEN` — no repository secrets required. |
