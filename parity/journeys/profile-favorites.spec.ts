import { JourneyContext, parityJourney } from '../lib/harness';

/** Waits for the profile banner and the Favorited Posts list (articles or the empty message) to finish loading. */
async function favoritesLoaded({ page }: JourneyContext) {
  await page.locator('.user-info h4').waitFor();
  await page.locator('.article-preview:not(:has-text("Loading articles..."))').first().waitFor();
}

async function observeFavorites(ctx: JourneyContext, prefix: string) {
  const { page, observe } = ctx;
  observe(`${prefix}.url`, new URL(page.url()).pathname);
  observe(
    `${prefix}.tabs`,
    await page.locator('.articles-toggle .nav-link').evaluateAll(els =>
      els.map(e => ({
        text: e.textContent?.trim(),
        href: e.getAttribute('href'),
        active: e.classList.contains('active'),
      })),
    ),
  );
  observe(`${prefix}.articleTitles`, await page.locator('.article-preview h1').allInnerTexts());
  observe(`${prefix}.emptyMessage`, await page.locator('.empty-feed-message').allInnerTexts());
  observe(`${prefix}.pages`, await page.locator('.pagination .page-link').allInnerTexts());
}

parityJourney('profile-favorites', "alice's favorites signed out", async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(`${baseURL}/profile/alice/favorites`);
  await favoritesLoaded(ctx);
  await snap('alice favorites signed out');
  await observeFavorites(ctx, 'alice');
  observe('backend.favoritedCount', (await api('/articles?favorited=alice&limit=10&offset=0')).articlesCount);
});

parityJourney('profile-favorites', 'own favorites as demo', async ctx => {
  const { page, baseURL, snap, observe, api, loginAs } = ctx;
  const token = await loginAs('demo');
  await page.goto(`${baseURL}/profile/demo/favorites`);
  await favoritesLoaded(ctx);
  await snap('demo favorites');
  await observeFavorites(ctx, 'demo');
  observe('backend.favoritedCount', (await api('/articles?favorited=demo&limit=10&offset=0', token)).articlesCount);
});

parityJourney('profile-favorites', 'johndoe favorites as demo', async ctx => {
  const { page, baseURL, snap, observe, api, loginAs } = ctx;
  const token = await loginAs('demo');
  await page.goto(`${baseURL}/profile/johndoe/favorites`);
  await favoritesLoaded(ctx);
  await snap('johndoe favorites');
  await observeFavorites(ctx, 'johndoe');
  observe('backend.favoritedCount', (await api('/articles?favorited=johndoe&limit=10&offset=0', token)).articlesCount);
});
