# Official RealWorld e2e suite: React vs Angular

The upstream RealWorld project ships a framework-agnostic Playwright suite (`realworld/specs/e2e`, 140 tests including `@security`). Neither Devin nor the children wrote it. It was run unchanged against both apps on the same local mock API with `parity/official-e2e.config.ts` (2026-11-12, ~9 min per app, 1 worker, 0 retries).

| App              | Passed | Failed |
| ---------------- | ------ | ------ |
| Angular (source) | 95     | 45     |
| React (migrated) | 93     | 47     |

**The 45 Angular failures fail identically on React** (same 45 test IDs, same error signature). They are environment/suite issues that both apps share, not behaviour that differs between them. Root causes are only partly investigated:

| Spec file                             | Failures | Error signature (both apps)               | Cause                                                                                                                                    |
| ------------------------------------- | -------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| error-handling, user-fetch-errors     | 16 + 5   | elements not visible / click timeouts     | Verified: the specs intercept `https://api.realworld.show/api`, the public demo API, so their injected errors never reach the local API. |
| null-fields, navigation               | 3 + 1    | `Login failed: credentials invalid`       | The spec logs in with an account the local seed does not contain. Not investigated further.                                              |
| comments                              | 1        | `a[href="/login"]` resolves to 2 elements | Verified: unscoped locator, matches the header link and the comment-box link.                                                            |
| xss-security (`@security`)            | 14       | waiting for `.user-info` times out        | Not root-caused.                                                                                                                         |
| url-navigation (pagination `?page=N`) | 5        | page closed while waiting for URL         | Not root-caused.                                                                                                                         |

**The 2 React-only failures are both the Profile → Favorited Posts tab**, which is deliberately left unmigrated for the live demo (`demo/live-task.md`):

- `social.spec.ts:115` should display favorited articles on profile
- `navigation.spec.ts:200` should show article count on profile tabs (clicks the Favorited tab)

Logs: rerun with `E2E_APP=react|angular npx playwright test -c parity/official-e2e.config.ts`.
