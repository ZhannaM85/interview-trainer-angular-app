# Issue Priority Roadmap

Generated 2026-05-06. Based on labels, dependencies, and effort/value assessment.

---

## Bugs — fix before new features

| # | Issue | Notes |
|---|-------|-------|
| ~~[#100](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/100)~~ | ~~Quiz session sometimes starts with only 1 question after picking session length~~ | ✅ Done — [PR #101](https://github.com/ZhannaM85/interview-trainer-angular-app/pull/101) |

---

## Tier 1 — Quick wins (high impact, low risk)

| # | Issue | Why first |
|---|-------|-----------|
| ~~[#58](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/58)~~ | ~~Heatmap contrast in dark mode~~ | ✅ Done — [PR #65](https://github.com/ZhannaM85/interview-trainer-angular-app/pull/65) |
| ~~[#38](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/38)~~ | ~~Undo last quiz rating~~ | ✅ Done — [PR #66](https://github.com/ZhannaM85/interview-trainer-angular-app/pull/66) |
| ~~[#49](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/49)~~ | ~~Randomize question order~~ | ✅ Done |
| ~~[#55](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/55)~~ | ~~Collapsible code examples in study guide~~ | ✅ Done |
| ~~[#54](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/54)~~ | ~~Bulk "Mark all as studied" in plan~~ | ✅ Done |
| ~~[#40](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/40)~~ | ~~Difficulty filter in study guide~~ | ✅ Done — [PR #73](https://github.com/ZhannaM85/interview-trainer-angular-app/pull/73) |
| ~~[#39](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/39)~~ | ~~Full-text search in study guide~~ | ✅ Done |
| ~~[#98](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/98)~~ | ~~Make 'Hardest Questions' items on dashboard navigate to study guide~~ | ✅ Done |

---

## Tier 2 — Data safety (builds user trust)

| # | Issue | Notes |
|---|-------|-------|
| ~~[#42](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/42)~~ | ~~Export/import custom questions~~ | ✅ Done |
| ~~[#43](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/43)~~ | ~~Export full progress data as JSON~~ | ✅ Done |

---

## Tier 3 — Core UX enhancements

| # | Issue | Notes |
|---|-------|-------|
| ~~[#50](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/50)~~ | ~~Session length picker~~ | ✅ Done |
| ~~[#53](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/53)~~ | ~~Carry over unfinished plan topics~~ | ✅ Done |
| ~~[#44](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/44)~~ | ~~Save and resume incomplete session~~ | ✅ Done |
| ~~[#60](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/60)~~ | ~~Resume session nudge on app load~~ | ✅ Done |
| ~~[#102](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/102)~~ | ~~Sort by date on Planning page~~ | ✅ Done |

---

## Tier 4 — Analytics & gamification

| # | Issue | Notes |
|---|-------|-------|
| ~~[#45](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/45)~~ | ~~Accuracy/confidence trend chart~~ | ✅ Done |
| ~~[#46](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/46)~~ | ~~Per-question performance analytics~~ | ✅ Done |
| ~~[#59](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/59)~~ | ~~Accuracy breakdown by difficulty~~ | ✅ Done |
| ~~[#51](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/51)~~ | ~~Daily practice goals~~ | ✅ Done |
| ~~[#41](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/41)~~ | ~~More achievement badges~~ | ✅ Done |
| ~~[#96](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/96)~~ | ~~'Interview Ready' badge + session-end message~~ | ✅ Done |

---

## Tier 5 — Advanced / depends on multiple features

| # | Issue | Notes |
|---|-------|-------|
| ~~[#47](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/47)~~ | ~~SM-2 spaced repetition~~ | ✅ Done |
| [#48](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/48) | Smart daily plan suggestions | Noticeably better after #47 |
| [#52](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/52) | Topic mastery indicator | Noticeably better after #47 |
| [#56](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/56) | Storage usage & purge | Do after #43 (export before purging) |
| [#57](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/57) | Focus management after dismissing banners | Best done last — depends on #44, #48, #53, #60 |

---

## Tier 6 — AI-powered vacancy analysis (implement in order)

New feature: user pastes a job vacancy description → Claude API generates tailored interview Q&A pairs → user reviews and imports them as custom questions.

| # | Issue | Notes |
|---|-------|-------|
| [#90](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/90) | Add AI provider API key settings | **Start here** — prerequisite for all other vacancy issues |
| [#91](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/91) | Add /vacancy page for job description input | UI skeleton; depends on #90 for key-present check |
| [#92](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/92) | Implement AI question generation service | Core logic; calls Claude API; depends on #90 and #91 |
| [#93](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/93) | Add review and import flow for AI-generated questions | Depends on #92 returning data and existing CustomQuestionService |
| [#94](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/94) | Vacancy analysis UX polish (loading, errors, empty states) | Do last — ties together #91, #92, #93 |
