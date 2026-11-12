## Status after integration (parent session, full suite run 2026-11-12 17:31Z)

Resolved. In the full parity run on the integration branch, with every package merged, all journeys for this screen pass every check (see `evidence/parity-results.md`). The notes below are what the child session recorded on its own branch, before the packages it depended on were merged. They are kept as the audit trail.

---

No failing checks. Notes:

- **Signed-out journey has no screenshot.** It ends on `/login`, which is still a stub in React (work package `auth`), so it observes the URL and the absence of the editor only.
- **Fixed during the run, not by this package:** on the first runs every editor screen differed by 1.40% because the theme's sticky-footer rules target Angular's `<app-root>`, not React's `#root`. The integration branch now carries the fix in `react-app/src/app.css` (merged from another package); this branch takes that version unchanged.
- **Fixed by merging the integration branch:** before `wp/article` was merged, the create and edit journeys differed only in the two calls Angular's Article page makes after Publish (`GET /articles/<slug>`, `GET /articles/<slug>/comments`). With the Article page merged they match.
