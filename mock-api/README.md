# Local RealWorld mock API

A dependency-free Node server that implements the RealWorld API spec (`realworld/specs/api/openapi.yml`) in memory, with deterministic seed data. Both the Angular app and the React migration point at it, so neither depends on the public demo API.

```bash
node mock-api/server.mjs          # http://localhost:3000/api
curl -X POST localhost:3000/api/__reset   # restore the seed
```

- Seed: `mock-api/seed.mjs` — 6 users (`demo`, `alice`, `bob`, `carol`, `johndoe`, `erin`; password `password123` for all, email `<username>@conduit.test`), 22 articles, 20 tags, 10 comments, 4 follows, 27 favourites. Dates are fixed.
- Avatars are served locally from `/avatars/<name>.svg`, so screenshots never depend on the internet.
- `POST /api/__reset` restores the seed; parity tests call it before every journey so Angular and React see identical data.
- Conformance: passes all 13 files / 155 requests of the official Hurl suite (`realworld/specs/api/run-api-tests-hurl.sh`, Hurl 8).
