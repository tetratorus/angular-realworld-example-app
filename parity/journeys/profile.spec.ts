import { JourneyContext, parityJourney } from '../lib/harness';

/** Waits for the profile banner and the My Posts list (articles or the empty message) to finish loading. */
async function profileLoaded({ page }: JourneyContext) {
  await page.locator('.user-info h4').waitFor();
  await page.locator('.article-preview:not(:has-text("Loading articles..."))').first().waitFor();
}

async function observeProfile(ctx: JourneyContext, prefix: string) {
  const { page, observe } = ctx;
  observe(`${prefix}.url`, new URL(page.url()).pathname);
  observe(`${prefix}.username`, await page.locator('.user-info h4').innerText());
  observe(`${prefix}.bio`, await page.locator('.user-info p').innerText());
  observe(`${prefix}.image`, await page.locator('.user-info img.user-img').getAttribute('src'));
  observe(`${prefix}.actionButtons`, await page.locator('.user-info .action-btn').allInnerTexts());
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

parityJourney('profile', "view alice's profile signed out", async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(`${baseURL}/profile/alice`);
  await profileLoaded(ctx);
  await snap('alice profile signed out');
  await observeProfile(ctx, 'alice');
  observe('backend.profile', await api('/profiles/alice'));
  observe('backend.articleCount', (await api('/articles?author=alice&limit=10&offset=0')).articlesCount);
});

parityJourney('profile', 'follow button signed out redirects to login', async ctx => {
  const { page, baseURL, observe, api } = ctx;
  await page.goto(`${baseURL}/profile/alice`);
  await profileLoaded(ctx);
  await page.locator('.user-info button.action-btn').click();
  await page.waitForURL('**/login');
  observe('url', new URL(page.url()).pathname);
  observe('backend.profile', await api('/profiles/alice'));
});

parityJourney('profile', 'follow then unfollow alice as demo', async ctx => {
  const { page, baseURL, snap, observe, api, loginAs } = ctx;
  const token = await loginAs('demo');
  const button = page.locator('.user-info button.action-btn');
  await page.goto(`${baseURL}/profile/alice`);
  await profileLoaded(ctx);
  // Seed: demo already follows alice, so start by unfollowing to reach the "Follow" state.
  await snap('following initially');
  await observeProfile(ctx, 'initial');
  observe('initial.backendFollowing', (await api('/profiles/alice', token)).profile.following);

  await button.click();
  await button.filter({ hasText: 'Follow alice' }).filter({ hasNotText: 'Unfollow' }).waitFor();
  await snap('after unfollow');
  observe('afterUnfollow.button', await button.innerText());
  observe('afterUnfollow.buttonClass', await button.getAttribute('class'));
  observe('afterUnfollow.backendFollowing', (await api('/profiles/alice', token)).profile.following);

  await button.click();
  await button.filter({ hasText: 'Unfollow alice' }).waitFor();
  await snap('after follow');
  observe('afterFollow.button', await button.innerText());
  observe('afterFollow.buttonClass', await button.getAttribute('class'));
  observe('afterFollow.backendFollowing', (await api('/profiles/alice', token)).profile.following);

  await button.click();
  await button.filter({ hasText: 'Follow alice' }).filter({ hasNotText: 'Unfollow' }).waitFor();
  await snap('after second unfollow');
  observe('afterSecondUnfollow.button', await button.innerText());
  observe('afterSecondUnfollow.backendFollowing', (await api('/profiles/alice', token)).profile.following);
  observe(
    'afterSecondUnfollow.demoFeedAuthors',
    [
      ...new Set((await api('/articles/feed?limit=20&offset=0', token)).articles.map((a: any) => a.author.username)),
    ].sort(),
  );
});

parityJourney('profile', 'own profile shows Edit Profile Settings', async ctx => {
  const { page, baseURL, snap, observe, loginAs } = ctx;
  await loginAs('demo');
  await page.goto(`${baseURL}/profile/demo`);
  await profileLoaded(ctx);
  await snap('own profile');
  await observeProfile(ctx, 'own');
  const edit = page.locator('.user-info a.action-btn');
  observe('editLink.href', await edit.getAttribute('href'));
  observe('editLink.class', await edit.getAttribute('class'));
  observe('followButtonCount', await page.locator('.user-info button').count());
});

parityJourney('profile', 'user with no posts shows empty message', async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(`${baseURL}/profile/demo`);
  await profileLoaded(ctx);
  await snap('demo profile empty');
  await observeProfile(ctx, 'demo');
  observe('backend.articleCount', (await api('/articles?author=demo&limit=10&offset=0')).articlesCount);
});

parityJourney('profile', 'unknown username', async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(`${baseURL}/profile/nosuchuser`);
  await page.locator('.profile-page').waitFor({ state: 'attached' });
  await snap('unknown user');
  observe('url', new URL(page.url()).pathname);
  observe('errorMessages', await page.locator('.error-messages li').allInnerTexts());
  observe('errorListCount', await page.locator('.profile-page .error-messages').count());
  observe('userInfoCount', await page.locator('.user-info').count());
  observe('tabsCount', await page.locator('.articles-toggle').count());
  observe('backend', await api('/profiles/nosuchuser'));
});

parityJourney('profile', 'header Your profile link while viewing another profile', async ctx => {
  const { page, baseURL, snap, observe, loginAs } = ctx;
  await loginAs('demo');
  await page.goto(`${baseURL}/profile/alice`);
  await profileLoaded(ctx);
  await page.locator('.navbar a.nav-link[href="/profile/demo"]').click();
  await page.waitForURL('**/profile/demo');
  await snap('after header profile link');
  await observeProfile(ctx, 'afterSwitch');
});
