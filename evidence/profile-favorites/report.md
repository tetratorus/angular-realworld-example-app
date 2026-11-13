# Parity report: profile-favorites

Angular (http://localhost:4200) vs React (http://localhost:5173), same seeded mock API reset before each run, viewport 1440×900, dates/avatars masked in magenta. Visual pass threshold: ≤1% differing pixels (pixelmatch, threshold 0.1).

| Journey                      | No errors | Same states | Visual | API calls + payloads | Functional | Max diff | Result   |
| ---------------------------- | --------- | ----------- | ------ | -------------------- | ---------- | -------- | -------- |
| alice's favorites signed out | PASS      | PASS        | PASS   | PASS                 | PASS       | 0.000%   | **PASS** |
| johndoe's favorites as demo  | PASS      | PASS        | PASS   | PASS                 | PASS       | 0.000%   | **PASS** |
| own favorites as demo        | PASS      | PASS        | PASS   | PASS                 | PASS       | 0.000%   | **PASS** |

## alice's favorites signed out

React journey video: [video/alice-s-favorites-signed-out--react.webm](video/alice-s-favorites-signed-out--react.webm)

| State                      | Diff        | Angular                                                                            | React                                                                            | Diff image                                                                    |
| -------------------------- | ----------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| alice-favorites-signed-out | 0.000% PASS | ![](screens/alice-s-favorites-signed-out--alice-favorites-signed-out--angular.png) | ![](screens/alice-s-favorites-signed-out--alice-favorites-signed-out--react.png) | ![](diffs/alice-s-favorites-signed-out--alice-favorites-signed-out--diff.png) |

API calls (PASS):

| #   | Angular                                                 | React                                                   |
| --- | ------------------------------------------------------- | ------------------------------------------------------- |
| 1   | `GET /profiles/alice → 200`                             | `GET /profiles/alice → 200`                             |
| 2   | `GET /profiles/alice → 200`                             | `GET /profiles/alice → 200`                             |
| 3   | `GET /articles?favorited=alice&limit=10&offset=0 → 200` | `GET /articles?favorited=alice&limit=10&offset=0 → 200` |

Functional observations (PASS):

| Key                 | Angular                                                                                                     | React                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| alice.url           | `"/profile/alice/favorites"`                                                                                | `"/profile/alice/favorites"`                                                                                |
| alice.articleTitles | `["Screenshots as evidence","Welcome to Conduit","Designing an empty state","Why we run every test in CI"]` | `["Screenshots as evidence","Welcome to Conduit","Designing an empty state","Why we run every test in CI"]` |
| alice.emptyMessage  | `[]`                                                                                                        | `[]`                                                                                                        |

## johndoe's favorites as demo

React journey video: [video/johndoe-s-favorites-as-demo--react.webm](video/johndoe-s-favorites-as-demo--react.webm)

| State                     | Diff        | Angular                                                                          | React                                                                          | Diff image                                                                  |
| ------------------------- | ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| johndoe-favorites-as-demo | 0.000% PASS | ![](screens/johndoe-s-favorites-as-demo--johndoe-favorites-as-demo--angular.png) | ![](screens/johndoe-s-favorites-as-demo--johndoe-favorites-as-demo--react.png) | ![](diffs/johndoe-s-favorites-as-demo--johndoe-favorites-as-demo--diff.png) |

API calls (PASS):

| #   | Angular                                                   | React                                                     |
| --- | --------------------------------------------------------- | --------------------------------------------------------- |
| 1   | `GET /user → 200`                                         | `GET /user → 200`                                         |
| 2   | `GET /profiles/johndoe → 200`                             | `GET /profiles/johndoe → 200`                             |
| 3   | `GET /profiles/johndoe → 200`                             | `GET /profiles/johndoe → 200`                             |
| 4   | `GET /articles?favorited=johndoe&limit=10&offset=0 → 200` | `GET /articles?favorited=johndoe&limit=10&offset=0 → 200` |

Functional observations (PASS):

| Key                   | Angular                                                                                                 | React                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| johndoe.url           | `"/profile/johndoe/favorites"`                                                                          | `"/profile/johndoe/favorites"`                                                                          |
| johndoe.articleTitles | `["Migrating a screen at a time","Writing test cases people can run","Component boundaries that last"]` | `["Migrating a screen at a time","Writing test cases people can run","Component boundaries that last"]` |
| johndoe.emptyMessage  | `[]`                                                                                                    | `[]`                                                                                                    |

## own favorites as demo

React journey video: [video/own-favorites-as-demo--react.webm](video/own-favorites-as-demo--react.webm)

| State                  | Diff        | Angular                                                                 | React                                                                 | Diff image                                                         |
| ---------------------- | ----------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| demo-favorites-as-demo | 0.000% PASS | ![](screens/own-favorites-as-demo--demo-favorites-as-demo--angular.png) | ![](screens/own-favorites-as-demo--demo-favorites-as-demo--react.png) | ![](diffs/own-favorites-as-demo--demo-favorites-as-demo--diff.png) |

API calls (PASS):

| #   | Angular                                                | React                                                  |
| --- | ------------------------------------------------------ | ------------------------------------------------------ |
| 1   | `GET /user → 200`                                      | `GET /user → 200`                                      |
| 2   | `GET /profiles/demo → 200`                             | `GET /profiles/demo → 200`                             |
| 3   | `GET /profiles/demo → 200`                             | `GET /profiles/demo → 200`                             |
| 4   | `GET /articles?favorited=demo&limit=10&offset=0 → 200` | `GET /articles?favorited=demo&limit=10&offset=0 → 200` |

Functional observations (PASS):

| Key                | Angular                                                                                                                                                                 | React                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| demo.url           | `"/profile/demo/favorites"`                                                                                                                                             | `"/profile/demo/favorites"`                                                                                                                                             |
| demo.articleTitles | `["Screenshots as evidence","Migrating a screen at a time","Writing test cases people can run","Component boundaries that last","Getting started with reactive forms"]` | `["Screenshots as evidence","Migrating a screen at a time","Writing test cases people can run","Component boundaries that last","Getting started with reactive forms"]` |
| demo.emptyMessage  | `[]`                                                                                                                                                                    | `[]`                                                                                                                                                                    |

## Deviations

_None recorded._
