# Migration plan: Angular → React 18 + TypeScript + Vite + React Router

Target: `react-app/`, same URLs, same Conduit CSS classes and markup, same API calls, against the same local mock API. Server state with plain fetch hooks (`react-app/src/api/client.ts`); auth/session in React Context (`react-app/src/auth/AuthContext.tsx`).

## Phase 0 — Foundation (parent session, done before fan-out)

- Local seeded mock API (`mock-api/`), Angular repointed to it.
- React shell: Vite app, `BrowserRouter`, all 10 routes declared in `App.tsx` pointing at stub page files, guards (`RequireAuth`, `RequireGuest`), Header (4 auth variants), Footer.
- API client: port of the 3 Angular interceptors and 5 services; same `{errors,status}` error shape and 401 logout.
- AuthContext: port of `UserService` + app initializer + `window.__conduit_debug__`.
- Shared components: ArticleList, ArticlePreview, ArticleMeta, FavoriteButton, FollowButton, ListErrors, markdown and date helpers.
- Parity harness (`parity/`): runs each journey on Angular and React, 1440×900, resets the seed before each run, masks dates/avatars, pixelmatch diff (pass ≤1%), compares API calls + payloads + functional observations, records the React video, writes `evidence/<screen>/results/*.json`; `parity/report.mjs` writes `evidence/<screen>/report.md`.

## Phase 1 — One work package per screen (parallel child Devin sessions)

Each package owns only its own files, so packages merge without conflicts.

| WP                | Screen / routes                       | Files owned (React)                                                  | Parity journeys (minimum)                                                                                                                                  |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| home              | `/`, `/tag/:tag`                      | `pages/HomePage.tsx`                                                 | global feed; page 2; tag filter from sidebar; signed-in Your Feed; signed-out Your Feed tab hidden                                                         |
| auth              | `/login`, `/register`                 | `pages/AuthPage.tsx`                                                 | login success; invalid credentials error; register success; register duplicate username; empty fields keep button disabled; signed-in user visiting /login |
| article           | `/article/:slug`                      | `pages/ArticlePage.tsx`                                              | view article signed out; favorite/unfavorite signed in; follow author; own article shows Edit/Delete; delete own article                                   |
| comments          | comment section of `/article/:slug`   | `components/ArticleComments.tsx`                                     | signed-out sign-in prompt; add comment; blank comment error; delete own comment; others' comments have no delete                                           |
| editor            | `/editor`, `/editor/:slug`            | `pages/EditorPage.tsx`                                               | create article with tags; blank title error; edit own article; editing someone else's article redirects; signed-out redirect to /login                     |
| profile           | `/profile/:username` (+ My Posts tab) | `pages/profile/ProfilePage.tsx`, `pages/profile/ProfileArticles.tsx` | other user's profile; follow/unfollow; own profile shows Edit Profile Settings; empty posts message                                                        |
| settings          | `/settings`                           | `pages/SettingsPage.tsx`                                             | prefilled form; update bio → profile; invalid email error; logout; signed-out redirect                                                                     |
| profile-favorites | `/profile/:username/favorites`        | `pages/profile/ProfileFavorites.tsx`                                 | **Reserved for the live demo** (`demo/live-task.md`)                                                                                                       |

Verification contract for every package (also in each child's prompt):

1. `bash scripts/setup.sh && bash scripts/dev-up.sh`.
2. Implement the screen by porting the Angular template/component line by line (same elements, classes, text, whitespace-sensitive inline content, same API calls in the same order).
3. Write `parity/journeys/<wp>.spec.ts` using `parityJourney()`; snapshot every key state; `observe()` URLs, visible messages and resulting backend data.
4. `npx playwright test -c parity <wp>` until all checks pass, then `node parity/report.mjs`. Any diff >1% or other mismatch that is not fixable gets a written cause in `evidence/<wp>/deviations.md`.
5. `cd react-app && npx tsc -p . --noEmit`; `bun run format`.
6. Commit code + `evidence/<wp>/` and open a PR into the integration branch.

## Phase 2 — Integrate and verify (parent)

Merge PRs, run the full parity suite and the official RealWorld e2e suite against both apps, write `evidence/summary.md`, then run the UAT workbook (`tests/uat-scenarios.xlsx`) against React and Angular.
