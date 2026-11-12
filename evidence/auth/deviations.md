## Status after integration (parent session, full suite run 2026-11-12 17:31Z)

Resolved. In the full parity run on the integration branch, with every package merged, all journeys for this screen pass every check (see `evidence/parity-results.md`). The notes below are what the child session recorded on its own branch, before the packages it depended on were merged. They are kept as the audit trail.

---

### Results in this report were run together with the home work package's page

Login and register redirect to `/`, so three journeys (login success, invalid credentials then retry, register) end on the home page. The parity check compares the whole journey, including the home page's own API calls (`GET /articles?limit=10&offset=0`, `GET /tags`). On this branch alone `react-app/src/pages/HomePage.tsx` is still the placeholder stub, so those calls are missing on React.

- **Results above (`results/`)**: run with the home package's `HomePage.tsx` from `origin/wp/home` (commit `e8a7358`) copied into the working tree for the run only (not committed here). **7/7 journeys pass all checks, max pixel diff 0.000%.**
- **Run on this branch alone (`standalone-run/results/`)**: 4/7 pass. The 3 failing journeys fail only after the redirect: the API-call check (Angular has the 2 home calls, React has none) and the home snapshot (70.2%, React shows the placeholder). Every auth-screen snapshot is 0.000% and all functional observations (URL, header links, signed-in token, `GET /user`, new user's profile) are equal. These pass once `wp/home` is merged.

### Home content masked in post-redirect snapshots

`home signed in` and `home after register` mask `.home-page .container.page` (feed and tags), because the home screen's visual parity is checked by the home package. The header (signed-in links, user name) and page layout stay compared.

### Foundation changes (outside `pages/AuthPage.tsx`)

1. `react-app/src/app.css`: `#root` gets the same flex rules the theme gives `app-root`. Without them the React footer sat right under the content instead of at the bottom of the window (1.398% diff on every auth snapshot, and on short pages of every screen).
2. `react-app/src/auth/guards.tsx` (`RequireGuest`, used only by `/login` and `/register`): a signed-in user opening `/login` got the home page on React; Angular cancels the navigation, so the URL becomes `/` with an empty page and no home API calls. The guard now checks once on route entry like an Angular guard, and on first load only rewrites the URL to `/`. In-app navigation to `/login` while signed in goes back to the previous page (no UI link leads there, so this path is not covered by a journey).
