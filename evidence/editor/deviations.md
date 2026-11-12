### 1. Two journeys fail only on calls made by the Article page after Publish (not yet migrated on this base)

- **Journeys:** "create article with two tags as demo", "edit own article as alice". Check: API calls.
- **Cause:** After Publish both apps go to `/article/<slug>`. Angular's Article page then calls `GET /articles/<slug>` and `GET /articles/<slug>/comments`. On this base, React's `ArticlePage.tsx` is still the stub (work package `article`, not merged yet), so it makes no calls. Every call the editor itself makes (`GET /user`, `GET /articles/<slug>`, `GET /user`, `POST /articles` / `PUT /articles/<slug>` with the same payload, key order and status) is identical in both apps; only the two calls after the URL change differ. Screens, URLs and backend data are identical.
- **Check that it clears once the Article page lands:** with `ArticlePage.tsx` from `wp/article` and `ArticleComments.tsx` from `wp/comments` copied in locally (not committed), all 5 editor journeys passed every check (max pixel diff 0.58%).
- **Action:** re-run `npx playwright test -c parity editor` after `wp/article` is merged; no editor change is expected.

### 2. Foundation change: sticky footer for `#root`

The theme's sticky-footer rules target Angular's `<app-root>` element, so on short pages (the editor) the React footer sat right under the content instead of at the bottom of the window (1.40% pixel diff on every editor screen). `react-app/src/app.css` now applies the same three rules to `#root`. Pages taller than the window are unaffected.

### 3. Screens not snapshotted

The signed-out journey ends on `/login`, which is still a stub in React (work package `auth`), so it observes the URL only, with no screenshot.
