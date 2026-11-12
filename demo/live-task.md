# Live task: migrate Profile → Favorited Posts

Kept unmigrated on purpose so it can be run live in the room. On the integration branch, `/profile/:username/favorites` in React shows the profile header (migrated) with an empty tab body.

Angular source: `src/app/features/profile/components/profile-favorites.component.ts` (≈40 lines: loads the profile, then renders `<app-article-list [limit]="10" [config]="{type:'all', filters:{favorited: username}}">`).

Start a new Devin session on `tetratorus/angular-realworld-example-app` and paste exactly:

```text
Migrate the "Profile → Favorited Posts" tab of the Conduit Angular app to React, following the same contract as the other screens.

Repo: tetratorus/angular-realworld-example-app. Base branch: devin/1794503322-react-migration. Create branch wp/profile-favorites from it and open a PR back into devin/1794503322-react-migration (not main; do not merge).

Read docs/migration-plan.md (verification contract) and parity/lib/harness.ts. Port src/app/features/profile/components/profile-favorites.component.ts into react-app/src/pages/profile/ProfileFavorites.tsx using the existing foundation (react-app/src/api/client.ts profileApi.get, components/ArticleList.tsx with limit 10 and config { type: 'all', filters: { favorited: username } }). Only change that one file plus the new journey and evidence.

Then:
1. bash scripts/setup.sh && bash scripts/dev-up.sh
2. Write parity/journeys/profile-favorites.spec.ts with parityJourney('profile-favorites', ...): (a) signed out, open /profile/alice/favorites and snap; (b) sign in as demo, open /profile/demo/favorites and snap; (c) as demo, open /profile/johndoe/favorites and snap. observe() the article titles shown in each case.
3. npx playwright test -c parity profile-favorites until all checks pass, then node parity/report.mjs profile-favorites.
4. cd react-app && npx tsc -p . --noEmit, then npx prettier --write on changed files.
5. Commit the code and evidence/profile-favorites/, push, open the PR. Reply with the PR link, journeys passed, max pixel diff.

Work fast: this is a live demo with a 10-minute budget. Localhost only.
```

Expected: one small file, three journeys, a report in `evidence/profile-favorites/report.md` with Angular/React/diff images and a React video, and a PR into the integration branch.

## Rehearsal (parent session, 2026-11-12 17:50 UTC)

The prompt was rehearsed once in a separate Fast-mode session, on branch `rehearsal/profile-favorites` with a draft PR (https://github.com/tetratorus/angular-realworld-example-app/pull/8, not to be merged): 3/3 journeys passed, max diff 0.000%, 1.95 ACUs. Session created 17:50:11 UTC, rehearsal commit 17:51:21 UTC, last session update 17:51:41 UTC; the session itself reported "about 9 minutes". Two prompt fixes came out of it and are applied above: step (c) no longer claims johndoe has no favourites (every seeded user has at least one), and `report.mjs` now takes the screen name so the live run doesn't rewrite the other screens' reports.
