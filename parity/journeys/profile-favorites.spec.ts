import { JourneyContext, parityJourney } from '../lib/harness';

/** Waits for the profile banner and the Favorited Posts list (articles or the empty message) to finish loading. */
async function favoritesLoaded({ page }: JourneyContext) {
  await page.locator('.user-info h4').waitFor();
  await page.locator('.article-preview:not(:has-text("Loading articles..."))').first().waitFor();
}

async function observeFavorites(ctx: JourneyContext, prefix: string) {
  const { page, observe } = ctx;
  observe(`${prefix}.url`, new URL(page.url()).pathname);
  observe(`${prefix}.articleTitles`, await page.locator('.article-preview h1').allInnerTexts());
  observe(`${prefix}.emptyMessage`, await page.locator('.empty-feed-message').allInnerTexts());
}

parityJourney('profile-favorites', "alice's favorites signed out", async ctx => {
  const { page, baseURL, snap } = ctx;
  await page.goto(`${baseURL}/profile/alice/favorites`);
  await favoritesLoaded(ctx);
  await snap('alice favorites signed out');
  await observeFavorites(ctx, 'alice');
});

parityJourney('profile-favorites', 'own favorites as demo', async ctx => {
  const { page, baseURL, snap, loginAs } = ctx;
  await loginAs('demo');
  await page.goto(`${baseURL}/profile/demo/favorites`);
  await favoritesLoaded(ctx);
  await snap('demo favorites as demo');
  await observeFavorites(ctx, 'demo');
});

parityJourney('profile-favorites', "johndoe's favorites as demo", async ctx => {
  const { page, baseURL, snap, loginAs } = ctx;
  await loginAs('demo');
  await page.goto(`${baseURL}/profile/johndoe/favorites`);
  await favoritesLoaded(ctx);
  await snap('johndoe favorites as demo');
  await observeFavorites(ctx, 'johndoe');
});
