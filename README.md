# Karkas

![Karkas — interview prep](docs/karkas-github-hero.png)

**Karkas** (*Russian: "frame"*) is a browser-based interview prep app. It combines a **study guide**, **spaced-repetition practice**, and **progress tracking** so you can turn technical knowledge into clear, confident answers. All data stays in your browser — no backend, no account required.

## Features

### Interview prep (JavaScript · Angular · RxJS)
- **Study guide** — questions grouped by category and subtopic, with code examples and external links
- **Quiz** — timed self-rating practice with spaced repetition (nailed +3 days, partial +2 days, didn't know +1 day); due questions are shuffled each session
- **Daily plan** — pick subtopics to focus on today; plan auto-resets at midnight
- **Dashboard** — activity heatmap, lifetime stats, and per-rating breakdown
- **My Questions** — add, edit, and delete your own custom questions; count badge on the nav link shows how many you have
- **Retry banner** — surfaces topics you struggled with recently so you can review them

### Sociology track
- Separate question bank, quiz, study guide, plan, and dashboard

### App-wide
- Light / dark theme
- English / Russian (bilingual via `@ngx-translate`)
- localStorage persistence — no data leaves the browser
- Storage quota warning if the browser's storage limit is reached
- Progress records older than 400 days are automatically pruned to keep storage lean

## Development

```bash
npm install
npm start          # dev server → http://localhost:4200
ng build           # production build → dist/karkas/browser/
ng test            # unit tests (Vitest)
npm run e2e        # Playwright e2e (requires npm start running first)
npm run e2e:ui     # Playwright interactive UI mode
```

Run a single test file:
```bash
ng test --include="**/progress.service.spec.ts"
```

After a fresh clone, install Playwright browsers before running e2e:
```bash
npx playwright install chromium
```

## Data pipeline

Regenerate `src/assets/data/questions-bilingual.json`:
```bash
npm run data:code-examples      # merge code examples
npm run data:read-more-links    # merge external article links
npm run data:i18n-questions     # apply Russian translations
```

## Tech stack

| | |
|---|---|
| Framework | Angular 21 (standalone components, signals, OnPush) |
| Styling | SCSS with CSS custom properties |
| i18n | @ngx-translate |
| Tests | Vitest (unit) · Playwright (e2e) |
| Routing | Hash-based (`withHashLocation`) for GitHub Pages |
| Persistence | localStorage via `StorageService` (prefix `interview-trainer:`) |
