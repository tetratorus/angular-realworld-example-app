# Migration summary: RealWorld "Conduit", Angular → React

All numbers below come from this run (2026-11-12, times in UTC; SGT = UTC+8). Everything ran on one VM against localhost; nothing was deployed.

## What was migrated

|                           |                                                                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source app                | `realworld-apps/angular-realworld-example-app` (formerly `gothinkster/…`), Angular **21.2.12**                                                                                                                                                                         |
| Source size               | **10 route patterns, 8 distinct screens, 18 Angular components**, 6 services, 3 HTTP interceptors, 2 guards (`docs/inventory.md`)                                                                                                                                      |
| Target                    | React 18 + TypeScript + Vite + React Router, plain `fetch` + Context, original Conduit CSS reused (`react-app/`)                                                                                                                                                       |
| Backend                   | Local in-memory RealWorld-spec API with fixed seed data (6 users, 22 articles, 20 tags, 10 comments, 4 follows, 27 favourites). Official RealWorld Hurl suite: **155/155 requests pass** (`mock-api/`)                                                                 |
| Migrated                  | **7 work packages, 9 of 10 route patterns**: home (`/`, `/tag/:tag`), auth (`/login`, `/register`), article (`/article/:slug`), comments (on the article page), editor (`/editor`, `/editor/:slug`), profile (`/profile/:username` + My Posts), settings (`/settings`) |
| Not migrated (on purpose) | Profile → Favorited Posts (`/profile/:username/favorites`), kept for the live demo (`demo/live-task.md`). It was rehearsed once in a separate session (draft PR #8, not merged).                                                                                       |

## Results

| Check                                                                                                                                        | Result                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Side-by-side parity journeys (screenshots + pixelmatch, API calls + payloads, functional observations, React video) on the integrated branch | **41 / 41 journeys pass every check**. Max pixel diff **0.020%** (limit 1%). `evidence/parity-results.md`, per-screen `evidence/<screen>/report.md`                                                             |
| UAT workbook, React, Playwright headed + video + screenshot per step                                                                         | **25 / 25 Pass** (`tests/uat-scenarios-executed.xlsx`)                                                                                                                                                          |
| UAT-001 – UAT-005, React, by hand in Chrome (computer use) with screen recording                                                             | **5 / 5 Pass** (`demo/recordings/uat-001-005-react-computer-use.mp4`, `tests/uat-evidence/react-manual/`)                                                                                                       |
| Same UAT workbook against the Angular source                                                                                                 | **25 / 25 Pass**; React and Angular give the same status and the same observed actual result in **25 / 25** scenarios (sheet "Angular parity")                                                                  |
| Upstream RealWorld e2e suite, unchanged, both apps on the local API                                                                          | Angular **95 / 140**, React **93 / 140**. The 45 Angular failures fail identically on React (suite/environment issues); the 2 extra React failures are the unmigrated Favorited tab. `evidence/official-e2e.md` |
| React type check / production build                                                                                                          | `tsc --noEmit` clean; `vite build` succeeds                                                                                                                                                                     |

## How the work was done

| Step                                                                                                                                                                | Who                           | When (UTC)          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------- |
| Repo chosen; Leonard forks it and adds it to the Devin GitHub app                                                                                                   | parent + **Leonard**          | 17:02 – 17:05       |
| Mock API + seed, Angular repointed to it, inventory, migration plan, React foundation (shell, routing, API client, auth context, shared components), parity harness | parent                        | 17:05 – 17:15       |
| 7 child Devin sessions launched in parallel, one per work package                                                                                                   | parent                        | 17:15:48            |
| UAT workbook (25 scenarios) + Playwright UAT runner; Angular UAT 25/25                                                                                              | parent, while children worked | 17:15 – 17:25       |
| Children report their PRs (5–12 min each, every one with a passing parity report on its branch)                                                                     | children                      | 17:20:37 – 17:27:44 |
| PRs merged into the integration branch, integration bugs fixed, full parity suite green                                                                             | parent                        | 17:21 – 17:34:11    |
| React UAT 25/25 (Playwright), UAT-001–005 by hand with recording 5/5                                                                                                | parent + its testing agent    | 17:34 – 17:40       |
| Live task rehearsal, upstream e2e on both apps, this summary                                                                                                        | parent + 1 rehearsal session  | 17:40 – 18:10       |

- **Wall clock:** about 13 minutes from start to children launched, 12 minutes for all 7 children to deliver, 32 minutes from start to a fully integrated branch with 41/41 parity journeys passing, about 38 minutes to 25/25 UAT on React. Everything after that is extra verification and write-up.
- **Sessions:** 1 parent + 7 parallel children + 1 rehearsal of the live task = 9 Devin sessions. Children ran in Fast mode.
- **ACUs (read from the session API at ~18:10 UTC):** 7 children 43.7 in total (4.8–7.8 each), parent ~29 (includes inventory, foundation, harness, UAT, integration, write-up and its testing agent), live-task rehearsal 2.0. About **75 ACUs** overall.
- **Human work:** Leonard forked the repo and added it to the Devin GitHub app (~2 minutes). Nothing else. No human code, no human review during the run.

## First-try results, and what needed fixing

**0 of 7 packages passed every check on their first run.** The two causes were shared, not per-screen:

1. **Duplicate API calls (foundation bug, found by the comments child).** React `<StrictMode>` runs effects twice in dev, so every API call happened twice and the API-call parity check failed. The parent removed StrictMode on the base branch (`7c58a6a`) and told all children; it hit home, article, comments, profile and the others that load data.
2. **Footer position (foundation gap, found by four children independently).** The theme's sticky-footer CSS targets Angular's `<app-root>` only, so on short pages React's footer sat higher (1.1–1.4% diffs). Fixed in `react-app/src/app.css` by the profile/settings/auth children.

Screen-specific fixes the children made: a double space in the article's Favorite button label; the login/register guard checked once on entry like Angular's; two test-script waits. What passed first time: home's visuals, article's article area (pixel-identical), editor's own API calls and payloads, and functional observations across most journeys.

**Integration found two more issues the per-branch runs could not** (the first full run after merging failed the article/comments journeys and one auth journey):

- The article and comments children each changed their code to match the other's, so after merging neither rendered the comments `.row`/column wrapper: the comment form lost its column (1.4–1.9% diffs, one journey timing out). Fixed by the parent in `6a73451`.
- The auth "back to login" observation read Angular's `<h1>` before it settled (empty, then "Sign in"). Test timing, fixed in the journey.

## Known differences and gaps

- For an article that doesn't exist, Angular still calls `GET /articles/:slug/comments`; React doesn't. Both show the same empty error list. No journey covers this (`evidence/article/deviations.md`).
- Angular's profile page doesn't reload when you go from one profile to another via the header link; React copies this existing bug on purpose (`evidence/profile/report.md`).
- `<StrictMode>` is off in the React app to keep dev API calls identical to Angular. It has no effect on production builds.
- The Angular app was changed in one line: its API base URL now points at the local mock API.
- No Devin board: the board tool was not available in this session, so the plan lives in `docs/migration-plan.md` and the PR list.
