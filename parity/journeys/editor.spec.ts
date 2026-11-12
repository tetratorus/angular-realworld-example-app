import { expect, JourneyContext, parityJourney } from '../lib/harness';

const ALICE_ARTICLE = 'getting-started-with-reactive-forms';

const path = ({ page, baseURL }: JourneyContext) => page.url().replace(baseURL, '');

const onScreen = async ({ page }: JourneyContext) => ({
  title: await page.getByPlaceholder('Article Title').inputValue(),
  description: await page.getByPlaceholder("What's this article about?").inputValue(),
  body: await page.getByPlaceholder('Write your article (in markdown)').inputValue(),
  tagInput: await page.getByPlaceholder('Enter tags').inputValue(),
  tags: (await page.locator('.tag-list .tag-pill').allInnerTexts()).map(t => t.trim()),
  errors: (await page.locator('.error-messages li').allInnerTexts()).map(t => t.trim()),
});

const backendArticle = async ({ api }: JourneyContext, slug: string) => {
  const res = await api<{ article?: any; errors?: unknown }>(`/articles/${slug}`);
  if (!res.article) return res;
  const { title, description, body, tagList, author } = res.article;
  return { slug: res.article.slug, title, description, body, tagList, author: author.username };
};

async function addTag({ page }: JourneyContext, tag: string) {
  const input = page.getByPlaceholder('Enter tags');
  await input.fill(tag);
  await input.press('Enter');
  await expect(page.locator('.tag-list .tag-pill', { hasText: tag })).toBeVisible();
}

parityJourney('editor', 'create article with two tags as demo', async ctx => {
  const { page, baseURL, snap, observe, api, loginAs } = ctx;
  await loginAs('demo');
  await page.goto(`${baseURL}/editor`);
  await expect(page.getByPlaceholder('Article Title')).toBeVisible();
  await snap('empty editor');
  observe('empty form', await onScreen(ctx));

  await page.getByPlaceholder('Article Title').fill('Parity check from the editor');
  await page.getByPlaceholder("What's this article about?").fill('Both apps publish the same article');
  await page
    .getByPlaceholder('Write your article (in markdown)')
    .fill('## Hello\n\nWritten in the **editor** journey.');
  await addTag(ctx, 'migration');
  await addTag(ctx, 'react');
  await addTag(ctx, 'temporary');
  await snap('three tag pills');
  observe('after adding three tags', await onScreen(ctx));

  await page.locator('.tag-list .tag-pill', { hasText: 'temporary' }).locator('i.ion-close-round').click();
  await expect(page.locator('.tag-list .tag-pill', { hasText: 'temporary' })).toHaveCount(0);
  // Same tag twice is ignored; Enter on a blank tag field adds nothing.
  await addTag(ctx, 'react');
  await page.getByPlaceholder('Enter tags').press('Enter');
  await snap('filled with two tags');
  observe('before publish', await onScreen(ctx));

  await page.getByRole('button', { name: 'Publish Article' }).click();
  await page.waitForURL('**/article/**');
  observe('url after publish', path(ctx));
  observe('backend article', await backendArticle(ctx, 'parity-check-from-the-editor'));
  const { articles } = await api<{ articles: { slug: string }[] }>('/articles?author=demo');
  observe(
    'demo article slugs',
    articles.map(a => a.slug),
  );
});

parityJourney('editor', 'blank title shows error', async ctx => {
  const { page, baseURL, snap, observe, api, loginAs } = ctx;
  await loginAs('demo');
  await page.goto(`${baseURL}/editor`);
  await page.getByPlaceholder("What's this article about?").fill('No title given');
  await page.getByPlaceholder('Write your article (in markdown)').fill('Body without a title.');
  await page.getByRole('button', { name: 'Publish Article' }).click();
  await expect(page.locator('.error-messages li')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Publish Article' })).toBeEnabled();
  await snap('blank title error');
  observe('form after error', await onScreen(ctx));
  observe('url after error', path(ctx));
  const { articlesCount } = await api<{ articlesCount: number }>('/articles?author=demo');
  observe('demo articles count', articlesCount);
});

parityJourney('editor', 'edit own article as alice', async ctx => {
  const { page, baseURL, snap, observe, loginAs } = ctx;
  await loginAs('alice');
  await page.goto(`${baseURL}/editor/${ALICE_ARTICLE}`);
  await expect(page.getByPlaceholder('Article Title')).toHaveValue('Getting started with reactive forms');
  await expect(page.locator('.tag-list .tag-pill')).toHaveCount(2);
  await snap('prefilled editor');
  observe('prefilled form', await onScreen(ctx));

  await page.getByPlaceholder("What's this article about?").fill('Updated description from the editor journey');
  await page.locator('.tag-list .tag-pill', { hasText: 'angular' }).locator('i.ion-close-round').click();
  // A tag left in the field is added on Publish (Angular calls addTag() in submitForm).
  await page.getByPlaceholder('Enter tags').fill('parity');
  await snap('edited before publish');
  observe('edited form', await onScreen(ctx));

  await page.getByRole('button', { name: 'Publish Article' }).click();
  await page.waitForURL(`**/article/${ALICE_ARTICLE}`);
  observe('url after publish', path(ctx));
  observe('backend article', await backendArticle(ctx, ALICE_ARTICLE));
});

parityJourney('editor', 'non-author is redirected from edit', async ctx => {
  const { page, baseURL, snap, observe, loginAs } = ctx;
  await loginAs('demo');
  await page.goto(`${baseURL}/editor/${ALICE_ARTICLE}`);
  await page.waitForURL(`${baseURL}/`);
  await expect(page.locator('.article-preview').first()).toBeVisible();
  await snap('redirected to home');
  observe('url after redirect', path(ctx));
  observe('editor present', await page.locator('.editor-page').count());
  observe('backend article', await backendArticle(ctx, ALICE_ARTICLE));
});

parityJourney('editor', 'signed out editor redirects to login', async ctx => {
  const { page, baseURL, observe } = ctx;
  await page.goto(`${baseURL}/editor`);
  await page.waitForURL(`${baseURL}/login`);
  observe('url after redirect', path(ctx));
  observe('editor present', await page.locator('.editor-page').count());
});
