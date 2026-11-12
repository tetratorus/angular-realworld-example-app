## Status after integration (parent session, full suite run 2026-11-12 17:31Z)

Resolved. In the full parity run on the integration branch, with every package merged, all journeys for this screen pass every check (see `evidence/parity-results.md`). The notes below are what the child session recorded on its own branch, before the packages it depended on were merged. They are kept as the audit trail.

---

No check fails: 5/5 journeys pass all checks with 0.000% pixel difference.

**How this was run (read before trusting the numbers).** The page links to two screens owned by other work packages, and both were still stubs on the base branch:

- The comments section (`components/ArticleComments.tsx`, comments package, PR #1, branch `wp/comments` at eb599c4).
- The home page that a delete redirects to (`pages/HomePage.tsx`, home package, branch `wp/home` at e8a7358).

For the runs that produced this evidence, both files were copied from those branches into the working tree. They were **not** committed to `wp/article`. With the stubs instead, every visual check fails: the stub comments row is empty, so the page is 1049 px tall instead of up to 1423 px, a 1.16–1.46% difference. The API check also fails because React skips `GET /articles/:slug/comments`, plus `GET /articles` and `GET /tags` after the delete redirect. The article area itself diffs at 0 pixels in those runs too.

**Known behaviour difference that no journey covers.** When the article does not exist (404), Angular still calls `GET /articles/:slug/comments`, because it loads the article and comments together in `combineLatest`. React only mounts `ArticleComments` once the article has loaded, so it makes no comments call. Both apps show the same thing: an empty `<ul class="error-messages">`. Angular stores `err.errors` and passes it to ListErrors, which reads `.errors` a second time. React reproduces that quirk on purpose.
