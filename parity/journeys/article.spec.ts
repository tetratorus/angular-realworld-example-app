import { parityJourney, JourneyContext } from '../lib/harness';

const OTHERS_ARTICLE = 'designing-an-empty-state'; // carol; demo neither follows carol nor favorites it
const ALICE_ARTICLE = 'getting-started-with-reactive-forms';
const ALICE_TO_DELETE = 'markdown-in-the-browser';

const text = async (ctx: JourneyContext, selector: string) =>
  (await ctx.page.locator(selector).allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());

async function observePage(ctx: JourneyContext, prefix: string) {
  ctx.observe(`${prefix}.url`, ctx.page.url().replace(ctx.baseURL, ''));
  ctx.observe(`${prefix}.title`, await text(ctx, '.banner h1'));
  ctx.observe(`${prefix}.bannerMeta`, await text(ctx, '.banner .article-meta'));
  ctx.observe(`${prefix}.actionsMeta`, await text(ctx, '.article-actions .article-meta'));
  ctx.observe(`${prefix}.bannerButtons`, await text(ctx, '.banner .article-meta a.btn, .banner .article-meta button'));
  ctx.observe(
    `${prefix}.buttonClasses`,
    await ctx.page.locator('.article-page .article-meta .btn').evaluateAll(els => els.map(e => e.className)),
  );
}

parityJourney('article', 'view article signed out', async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(`${baseURL}/article/${ALICE_ARTICLE}`);
  await page.locator('.banner h1').waitFor();
  await snap('article signed out');
  await observePage(ctx, 'signedOut');
  observe('body.headings', await text(ctx, '.article-content h2'));
  observe('body.paragraphs', await text(ctx, '.article-content p'));
  observe('body.listItems', await text(ctx, '.article-content .col-md-12 > div li'));
  observe('body.bold', await text(ctx, '.article-content strong'));
  observe(
    'body.links',
    await page.locator('.article-content .col-md-12 > div a').evaluateAll(els => els.map(e => e.getAttribute('href'))),
  );
  observe('tags', await text(ctx, '.tag-list li'));
  observe(
    'authorLinks',
    await page.locator('.banner .article-meta a').evaluateAll(els => els.map(e => e.getAttribute('href'))),
  );
  const { article } = await api(`/articles/${ALICE_ARTICLE}`);
  observe('backend.article', {
    title: article.title,
    tagList: article.tagList,
    favoritesCount: article.favoritesCount,
  });

  // Signed-out Favorite sends the visitor to /register (FavoriteButton behaviour on this page).
  await page.locator('.banner button', { hasText: 'Favorite Article' }).click();
  await page.waitForURL(`${baseURL}/register`);
  observe('signedOut.favoriteClick.url', page.url().replace(baseURL, ''));
});

parityJourney('article', 'favorite then unfavorite as demo', async ctx => {
  const { page, baseURL, snap, observe, api, loginAs } = ctx;
  const token = await loginAs('demo');
  await page.goto(`${baseURL}/article/${OTHERS_ARTICLE}`);
  await page.locator('.banner h1').waitFor();
  await snap('before favorite');
  await observePage(ctx, 'before');

  await page.locator('.banner button', { hasText: 'Favorite Article' }).click();
  await page.locator('.banner button', { hasText: 'Unfavorite Article' }).waitFor();
  await snap('favorited');
  await observePage(ctx, 'favorited');
  let { article } = await api(`/articles/${OTHERS_ARTICLE}`, token);
  observe('backend.favorited', { favorited: article.favorited, favoritesCount: article.favoritesCount });

  await page.locator('.article-actions button', { hasText: 'Unfavorite Article' }).click();
  await page.locator('.article-actions button', { hasText: /^\s*Favorite Article/ }).waitFor();
  await snap('unfavorited');
  await observePage(ctx, 'unfavorited');
  ({ article } = await api(`/articles/${OTHERS_ARTICLE}`, token));
  observe('backend.unfavorited', { favorited: article.favorited, favoritesCount: article.favoritesCount });
});

parityJourney('article', 'follow author as demo', async ctx => {
  const { page, baseURL, snap, observe, api, loginAs } = ctx;
  const token = await loginAs('demo');
  await page.goto(`${baseURL}/article/${OTHERS_ARTICLE}`);
  await page.locator('.banner h1').waitFor();
  observe('before.followButtons', await text(ctx, '.article-page .action-btn'));

  await page.locator('.banner .action-btn').click();
  await page.locator('.banner .action-btn', { hasText: 'Unfollow carol' }).waitFor();
  await snap('following author');
  await observePage(ctx, 'following');
  const { profile } = await api('/profiles/carol', token);
  observe('backend.following', profile.following);
  const feed = await api('/articles/feed?limit=50', token);
  observe(
    'backend.feedHasCarol',
    feed.articles.some((a: { author: { username: string } }) => a.author.username === 'carol'),
  );
});

parityJourney('article', 'own article shows edit and delete', async ctx => {
  const { page, baseURL, snap, observe, loginAs } = ctx;
  await loginAs('alice');
  await page.goto(`${baseURL}/article/${ALICE_ARTICLE}`);
  await page.locator('.banner h1').waitFor();
  await snap('own article');
  await observePage(ctx, 'own');
  observe(
    'editLinks',
    await page
      .locator('.article-page a.btn', { hasText: 'Edit Article' })
      .evaluateAll(els => els.map(e => e.getAttribute('href'))),
  );
  observe('deleteButtons', await page.locator('.article-page button', { hasText: 'Delete Article' }).count());
  observe('followOrFavoriteButtons', await page.locator('.article-page .action-btn, .article-page .ion-heart').count());
});

parityJourney('article', 'delete own article redirects home', async ctx => {
  const { page, baseURL, snap, observe, api, loginAs } = ctx;
  const token = await loginAs('alice');
  await page.goto(`${baseURL}/article/${ALICE_TO_DELETE}`);
  await page.locator('.banner h1').waitFor();
  await snap('before delete');
  await page.locator('.banner button', { hasText: 'Delete Article' }).click();
  await page.waitForURL(`${baseURL}/`);
  observe('afterDelete.url', page.url().replace(baseURL, ''));
  await page.locator('.article-preview').first().waitFor();
  await snap('home after delete');
  observe(
    'afterDelete.homeHasDeletedArticle',
    (await text(ctx, '.article-preview h1')).includes('Markdown in the browser'),
  );
  observe('backend.articleAfterDelete', await api(`/articles/${ALICE_TO_DELETE}`, token));
  const list = await api('/articles?author=alice&limit=50', token);
  observe(
    'backend.aliceArticles',
    list.articles.map((a: { slug: string }) => a.slug),
  );
});
