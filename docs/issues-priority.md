# Issue Priority Roadmap

Generated 2026-05-06. Based on labels, dependencies, and effort/value assessment.

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

---

## Tier 2 — Data safety (builds user trust)

| # | Issue | Notes |
|---|-------|-------|
| [#42](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/42) | Export/import custom questions | Labeled quick-win, small scope |
| [#43](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/43) | Export full progress data as JSON | Foundation — #56 should come after this |

---

## Tier 3 — Core UX enhancements

| # | Issue | Notes |
|---|-------|-------|
| [#50](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/50) | Session length picker | Standalone, no dependencies |
| [#53](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/53) | Carry over unfinished plan topics | Standalone; #57 depends on it |
| [#44](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/44) | Save and resume incomplete session | **Unlocks #60** — do before it |
| [#60](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/60) | Resume session nudge on app load | Depends on #44 |

---

## Tier 4 — Analytics & gamification

| # | Issue | Notes |
|---|-------|-------|
| [#45](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/45) | Accuracy/confidence trend chart | Existing `ActivityService` data, no model change |
| [#46](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/46) | Per-question performance analytics | Existing `ProgressService` data |
| [#59](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/59) | Accuracy breakdown by difficulty | Pairs well with #46 |
| [#51](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/51) | Daily practice goals | #41 "Goal getter" achievement waits on this |
| [#41](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/41) | More achievement badges | Do after #51 |

---

## Tier 5 — Advanced / depends on multiple features

| # | Issue | Notes |
|---|-------|-------|
| [#47](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/47) | SM-2 spaced repetition | Significant refactor; **unlocks #48 and #52** |
| [#48](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/48) | Smart daily plan suggestions | Noticeably better after #47 |
| [#52](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/52) | Topic mastery indicator | Noticeably better after #47 |
| [#56](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/56) | Storage usage & purge | Do after #43 (export before purging) |
| [#57](https://github.com/ZhannaM85/interview-trainer-angular-app/issues/57) | Focus management after dismissing banners | Best done last — depends on #44, #48, #53, #60 |
