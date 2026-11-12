import { JourneyContext, parityJourney } from '../lib/harness';

const text = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Everything the user can read on the home page, normalised, in DOM order. */
async function observeHome({ page, observe }: JourneyContext, key: string) {
  observe(`${key}.url`, new URL(page.url()).pathname + new URL(page.url()).search);
  observe(`${key}.bannerVisible`, await page.locator('.home-page .banner').isVisible());
  observe(
    `${key}.tabs`,
    await page.locator('.feed-toggle .nav-link:visible').evaluateAll(els =>
      els.map(e => ({
        text: (e.textContent ?? '').replace(/\s+/g, ' ').trim(),
        active: e.classList.contains('active'),
      })),
    ),
  );
  observe(`${key}.titles`, (await page.locator('.article-preview h1').allTextContents()).map(text));
  observe(`${key}.emptyMessage`, (await page.locator('.empty-feed-message').allTextContents()).map(text));
  observe(`${key}.pages`, (await page.locator('.pagination .page-link').allTextContents()).map(text));
  observe(`${key}.activePage`, (await page.locator('.pagination .page-item.active').allTextContents()).map(text));
  observe(`${key}.tags`, (await page.locator('.sidebar .tag-pill').allTextContents()).map(text));
  observe(
    `${key}.sidebarMessages`,
    (await page.locator('.sidebar > div:visible:not(.tag-list)').allTextContents()).map(text),
  );
}

const ready = (ctx: JourneyContext) =>
  Promise.all([
    ctx.page.locator('.article-preview:not(:has-text("Loading articles..."))').first().waitFor(),
    ctx.page.locator('.sidebar .tag-pill').first().waitFor(),
  ]);

parityJourney('home', 'global feed signed out', async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(baseURL + '/');
  await ready(ctx);
  await snap('global feed');
  await observeHome(ctx, 'global');
  observe('global.yourFeedTabCount', await page.locator('.feed-toggle .nav-link', { hasText: 'Your Feed' }).count());
  const backend = await api('/articles?limit=10&offset=0');
  observe(
    'backend.titles',
    backend.articles.map((a: { title: string }) => a.title),
  );
  observe('backend.articlesCount', backend.articlesCount);
});

parityJourney('home', 'go to page 2', async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(baseURL + '/');
  await ready(ctx);
  await page.locator('.pagination .page-link', { hasText: /^\s*2\s*$/ }).click();
  await page.waitForURL(/[?&]page=2/);
  await page.locator('.pagination .page-item.active .page-link', { hasText: '2' }).waitFor();
  await snap('page 2');
  await observeHome(ctx, 'page2');
  const backend = await api('/articles?limit=10&offset=10');
  observe(
    'backend.page2Titles',
    backend.articles.map((a: { title: string }) => a.title),
  );
  await page.locator('.pagination .page-link', { hasText: /^\s*1\s*$/ }).click();
  await page.waitForURL(u => !u.search.includes('page='));
  await page.locator('.pagination .page-item.active .page-link', { hasText: '1' }).waitFor();
  await snap('back to page 1');
  await observeHome(ctx, 'page1');
});

parityJourney('home', 'click a sidebar tag', async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(baseURL + '/');
  await ready(ctx);
  await page.locator('.sidebar .tag-pill', { hasText: 'testing' }).click();
  await page.waitForURL('**/tag/testing');
  await ready(ctx);
  await snap('tag testing');
  await observeHome(ctx, 'tag');
  const backend = await api('/articles?tag=testing&limit=10&offset=0');
  observe(
    'backend.tagTitles',
    backend.articles.map((a: { title: string }) => a.title),
  );
  await page.locator('.feed-toggle .nav-link', { hasText: 'Global Feed' }).click();
  await page.waitForURL(u => u.pathname === '/');
  await ready(ctx);
  await snap('back to global feed');
  await observeHome(ctx, 'global');
});

parityJourney('home', 'signed-in your feed (demo)', async ctx => {
  const { page, baseURL, snap, observe, api, loginAs } = ctx;
  const token = await loginAs('demo');
  await page.goto(baseURL + '/');
  await ready(ctx);
  await snap('signed in global feed');
  await observeHome(ctx, 'global');
  await page.locator('.feed-toggle .nav-link', { hasText: 'Your Feed' }).click();
  await page.waitForURL(/feed=following/);
  await ready(ctx);
  await snap('your feed');
  await observeHome(ctx, 'feed');
  const backend = await api('/articles/feed?limit=10&offset=0', token);
  observe(
    'backend.feedTitles',
    backend.articles.map((a: { title: string }) => a.title),
  );
  observe('backend.feedCount', backend.articlesCount);
});

parityJourney('home', 'tag url loaded directly', async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(baseURL + '/tag/design');
  await ready(ctx);
  await snap('tag design');
  await observeHome(ctx, 'tag');
  const backend = await api('/articles?tag=design&limit=10&offset=0');
  observe(
    'backend.tagTitles',
    backend.articles.map((a: { title: string }) => a.title),
  );
  await page.locator('.sidebar .tag-pill', { hasText: 'ux' }).click();
  await page.waitForURL('**/tag/ux');
  await ready(ctx);
  await snap('tag ux');
  await observeHome(ctx, 'tag2');
});

parityJourney('home', 'signed-out your feed url redirects to login', async ctx => {
  const { page, baseURL } = ctx;
  await page.goto(baseURL + '/?feed=following');
  await page.waitForURL('**/login');
  ctx.observe('url', new URL(page.url()).pathname);
  ctx.observe('yourFeedTabCount', await page.locator('.feed-toggle .nav-link', { hasText: 'Your Feed' }).count());
});
