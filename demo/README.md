# Demo: a parallel Angular → React migration run by Devin

Source: the open-source RealWorld "Conduit" Angular app (Angular 21.2.12, 10 route patterns, 8 screens, 18 components). Target: React 18 + TypeScript + Vite. Everything runs on localhost against a seeded mock API. Results and numbers: [`evidence/summary.md`](../evidence/summary.md).

## Sessions

| Role                                                                  | Session                                                                      | PR                                                                                                      | ACUs |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---- |
| Parent: inventory, plan, foundation, parity harness, UAT, integration | https://lentan.devinenterprise.com/sessions/e3ce0eada82c455f94be64cadd2af7f1 | integration PR into `main` (see below)                                                                  | ~29  |
| Child: home (`/`, `/tag/:tag`)                                        | https://lentan.devinenterprise.com/sessions/92eeb3ed8ecb4acdaac759fc40e9160d | [#3](https://github.com/tetratorus/angular-realworld-example-app/pull/3) merged into integration branch | 5.1  |
| Child: auth (`/login`, `/register`)                                   | https://lentan.devinenterprise.com/sessions/71f0c39a1b6144afb6abf37d329c06f0 | [#4](https://github.com/tetratorus/angular-realworld-example-app/pull/4) merged                         | 7.8  |
| Child: article (`/article/:slug`)                                     | https://lentan.devinenterprise.com/sessions/7b69db0b249c4cffa4b81d5f6e6bb48e | [#5](https://github.com/tetratorus/angular-realworld-example-app/pull/5) merged                         | 6.4  |
| Child: comments                                                       | https://lentan.devinenterprise.com/sessions/8371aa70ae224f69bf00c1215172ba0b | [#1](https://github.com/tetratorus/angular-realworld-example-app/pull/1) merged                         | 6.8  |
| Child: editor (`/editor`, `/editor/:slug`)                            | https://lentan.devinenterprise.com/sessions/06db71b46bee4ef3a88bea2c563a74b1 | [#7](https://github.com/tetratorus/angular-realworld-example-app/pull/7) merged                         | 6.7  |
| Child: profile (`/profile/:username`)                                 | https://lentan.devinenterprise.com/sessions/ca39d65d016245419fd66286a0f5eb05 | [#2](https://github.com/tetratorus/angular-realworld-example-app/pull/2) merged                         | 6.0  |
| Child: settings (`/settings`)                                         | https://lentan.devinenterprise.com/sessions/7452418157ca4874abf7c8f95e6633ae | [#6](https://github.com/tetratorus/angular-realworld-example-app/pull/6) merged                         | 4.8  |
| Rehearsal of the live task (not for the demo)                         | https://lentan.devinenterprise.com/sessions/d0d3c5c0ebbd46c8a947c7ad07b391df | [#8](https://github.com/tetratorus/angular-realworld-example-app/pull/8) draft, do not merge            | 2.0  |

Devin board: **not used**. The board tool wasn't available to the parent session; the work packages are listed in [`docs/migration-plan.md`](../docs/migration-plan.md). All 7 children were launched within 5 seconds of each other (17:15:48–17:15:53 UTC) and ran in Fast mode.

## Numbers

- 7 of 8 screens migrated (9 of 10 routes); Profile → Favorited Posts left for the live task.
- Parity, integrated branch: **41/41 journeys pass**, max pixel diff 0.020% (limit 1%), identical API calls and payloads.
- UAT workbook: React **25/25**, Angular **25/25**, same result in 25/25. UAT-001–005 also done by hand in Chrome with a recording, 5/5.
- Upstream RealWorld e2e (unchanged): Angular 95/140, React 93/140, the 2 extra failures are the unmigrated Favorited tab ([`evidence/official-e2e.md`](../evidence/official-e2e.md)).
- First try: 0/7 packages passed every check; 2 shared foundation issues (StrictMode duplicate calls, footer CSS) caused most failures. Integration found 2 more (comments wrapper, an auth test race), fixed by the parent.
- Wall clock: start 17:02 UTC → children launched 17:15 → all 7 PRs in by ~17:28 → integrated branch green 17:34 → React UAT 25/25 by ~17:40.
- Human work: Leonard forked the repo and added it to the Devin GitHub app. Nothing else.

## Where the evidence is

| What                                                            | Where                                                                                           |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Inventory and plan                                              | `docs/inventory.md`, `docs/migration-plan.md`                                                   |
| Parity results (all screens)                                    | `evidence/parity-results.md`                                                                    |
| Per screen: report, screenshots, diffs, React video, deviations | `evidence/<screen>/report.md`, `screens/`, `diffs/`, `video/`, `deviations.md`                  |
| Angular / React / diff composites                               | `demo/images/*.png` (`node scripts/compose-comparison.mjs <screen> <journey--state> <out.png>`) |
| Executed UAT workbook                                           | `tests/uat-scenarios-executed.xlsx` (sheets "UAT Scenarios" and "Angular parity")               |
| UAT screenshots and Playwright videos                           | `tests/uat-evidence/react/`, `tests/uat-evidence/angular/`, `tests/uat-evidence/react-manual/`  |
| Manual UAT-001–005 recording                                    | `demo/recordings/uat-001-005-react-computer-use.mp4`                                            |

## Run it locally

```bash
bun run setup && (cd react-app && npm install)
node mock-api/server.mjs                 # http://localhost:3000/api   (POST /api/__reset restores the seed)
bun run start                            # Angular  http://localhost:4200
(cd react-app && npm run dev)            # React    http://localhost:5173
npx playwright test -c parity home    # one work package; the config starts all three servers if they are not running
node parity/report.mjs
```

## Live task

Paste the prompt in [`demo/live-task.md`](live-task.md) into a new Devin session. It ports Profile → Favorited Posts (`react-app/src/pages/profile/ProfileFavorites.tsx`, currently a stub), adds 3 parity journeys, and opens a PR into `devin/1794503322-react-migration`. The rehearsal took one Fast-mode session, passed 3/3 journeys at 0.000% diff and used 2.0 ACUs. The session's own timestamps show about 1.5 minutes from start to commit; it reported "about 9 minutes" itself, so plan for up to 10 minutes.

## 10-minute script

1. **(1 min) The ask.** Open `docs/inventory.md`: every route, component, service, form and guard of the Angular app. Then `docs/migration-plan.md`: shared foundation first, one work package per screen, and the verification contract each child must meet.
2. **(1 min) Start the live task.** Paste `demo/live-task.md` into a new session now, so it runs while you talk.
3. **(2 min) Parallel children.** Open the parent session and show the 7 children launched within 5 seconds. Open one child (e.g. editor) and its PR (#7): code, parity journeys, evidence committed on the branch.
4. **(2 min) Proof of equivalence.** Open `evidence/parity-results.md` (41/41), then one screen report, e.g. `evidence/article/report.md`: Angular and React screenshots, the pixel diff, the API calls made by each app side by side, and the React video. Show `demo/images/article-angular-react-diff.png`.
5. **(1 min) Honest failures.** `evidence/summary.md` → "First-try results": 0/7 first-try passes, the two shared foundation bugs, and the two bugs integration found. Each child's `deviations.md` keeps its first-pass failures.
6. **(2 min) UAT in their format.** Open `tests/uat-scenarios-executed.xlsx`: 25 business scenarios with actual result, status and evidence path per row, plus the Angular-parity sheet. Play 30 seconds of `demo/recordings/uat-001-005-react-computer-use.mp4`.
7. **(1 min) Back to the live task.** Show its PR and the new `evidence/profile-favorites/report.md`. If it isn't done, show the rehearsal PR #8 and say it is the rehearsal.
