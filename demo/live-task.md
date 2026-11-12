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
2. Write parity/journeys/profile-favorites.spec.ts with parityJourney('profile-favorites', ...): (a) signed out, open /profile/alice/favorites and snap; (b) sign in as demo, open /profile/demo/favorites and snap; (c) as demo, open /profile/johndoe/favorites (no favourites) and snap the empty state. observe() the article titles shown in each case.
3. npx playwright test -c parity profile-favorites until all checks pass, then node parity/report.mjs.
4. cd react-app && npx tsc -p . --noEmit, then npx prettier --write on changed files.
5. Commit the code and evidence/profile-favorites/, push, open the PR. Reply with the PR link, journeys passed, max pixel diff.

Work fast: this is a live demo with a 10-minute budget. Localhost only.
```

Expected: one small file, three journeys, a report in `evidence/profile-favorites/report.md` with Angular/React/diff images and a React video, and a PR into the integration branch.
