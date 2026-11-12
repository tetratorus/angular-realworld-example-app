## Status after integration (parent session, full suite run 2026-11-12 17:31Z)

Resolved. In the full parity run on the integration branch, with every package merged, all journeys for this screen pass every check (see `evidence/parity-results.md`). The notes below are what the child session recorded on its own branch, before the packages it depended on were merged. They are kept as the audit trail.

---

Two journeys fail only the **API calls + payloads** check, and only because of calls made by the screen the journey lands on, which belongs to another work package and is still a "not migrated" stub on the base branch. Every call made by the Settings screen itself matches exactly (`GET /user`, then `PUT /user` with the same payload and key order), and screenshots, observations and backend data match in all 6 journeys.

| Journey                           | Extra calls on Angular only                                            | Made by                        | Owner      |
| --------------------------------- | ---------------------------------------------------------------------- | ------------------------------ | ---------- |
| update bio then land on profile   | `GET /profiles/demo` ×2, `GET /articles?author=demo&limit=10&offset=0` | Profile page (`/profile/demo`) | profile WP |
| logout returns to home signed out | `GET /articles?limit=10&offset=0`, `GET /tags`                         | Home page (`/`)                | home WP    |

Check done for the first row: with the profile WP's `ProfilePage.tsx` and `ProfileArticles.tsx` (branch `wp/profile`, commit 64cf56c) temporarily copied into the working tree, "update bio then land on profile" passes all five checks, with the same five calls on both apps. The result file is `update-bio-with-profile-wp.json`. Those files were then restored and are not part of this PR. The home WP had no pushed branch yet, so the second row could not be checked the same way; it should pass once the home page is merged and the suite is re-run.

Not snapshotted on purpose: the screens reached after leaving Settings (profile, home, login) are owned by other work packages. Those states are checked through `observe()` (URL, navbar links, stored token, backend user/profile) rather than screenshots.

Foundation change: `react-app/src/app.css` gets the theme's sticky-footer rules (written for Angular's `<app-root>`) applied to React's `#root`. Without them, the footer on short pages like Settings sat 47px higher than in Angular (1.1–1.4% pixel diff). The text is copied byte for byte from the profile WP's branch, so the two branches merge cleanly.
