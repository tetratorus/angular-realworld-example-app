import { JourneyContext, parityJourney, expect } from '../lib/harness';

const SLUG = 'getting-started-with-reactive-forms';
const COMMENT_CARDS = '.card:has(.card-text)';
// Article action buttons belong to the article work package (temporarily mounted here); only the comments section is under test.
const ARTICLE_PART = ['.article-meta .btn'];

async function openArticle({ page, baseURL }: JourneyContext) {
  await page.goto(`${baseURL}/article/${SLUG}`);
  await expect(page.locator('.article-page h1')).toBeVisible();
  await expect(page.locator(COMMENT_CARDS).first()).toBeVisible();
}

const cardsOnScreen = (page: JourneyContext['page']) =>
  page.locator(COMMENT_CARDS).evaluateAll(cards =>
    cards.map(c => ({
      body: c.querySelector('.card-text')?.textContent?.trim(),
      author: c.querySelectorAll('a.comment-author')[1]?.textContent?.trim(),
      authorHref: c.querySelector('a.comment-author')?.getAttribute('href'),
      date: c.querySelector('.date-posted')?.textContent?.trim(),
      hasDelete: !!c.querySelector('.mod-options .ion-trash-a'),
    })),
  );

const backendComments = async (api: JourneyContext['api']) =>
  (
    (await api(`/articles/${SLUG}/comments`)) as { comments: { body: string; author: { username: string } }[] }
  ).comments.map(c => ({ author: c.author.username, body: c.body }));

parityJourney('comments', 'signed out sees sign-in prompt', async ctx => {
  const { page, snap, observe } = ctx;
  await openArticle(ctx);
  await snap('signed out comments', { mask: ARTICLE_PART });
  observe('comment form count', await page.locator('form.comment-form').count());
  const prompt = page.locator('.col-md-8 > div:has(a[href="/login"])');
  observe('prompt text', (await prompt.innerText()).trim());
  observe(
    'prompt links',
    await prompt.locator('a').evaluateAll(as => as.map(a => [a.textContent, a.getAttribute('href')])),
  );
  observe('comments on screen', await cardsOnScreen(page));
  await prompt.getByRole('link', { name: 'Sign in' }).click();
  await page.waitForURL('**/login');
  observe('url after Sign in', new URL(page.url()).pathname);
  await page.goBack();
  await expect(page.locator(COMMENT_CARDS).first()).toBeVisible();
  await page.locator('.col-md-8').getByRole('link', { name: 'sign up' }).click();
  await page.waitForURL('**/register');
  observe('url after sign up', new URL(page.url()).pathname);
});

parityJourney('comments', 'add a comment as demo', async ctx => {
  const { page, snap, observe, api, loginAs } = ctx;
  await loginAs('demo');
  await openArticle(ctx);
  await snap('comment form', { mask: ARTICLE_PART });
  observe('prompt count', await page.locator('.col-md-8 a[href="/login"]').count());
  observe('form avatar src', await page.locator('form.comment-form img.comment-author-img').getAttribute('src'));
  await page.getByPlaceholder('Write a comment...').fill('Parity check: comments look the same in both apps.');
  await snap('comment typed', { mask: ARTICLE_PART });
  await page.getByRole('button', { name: 'Post Comment' }).click();
  await expect(page.locator(COMMENT_CARDS).first()).toContainText('Parity check');
  await expect(page.getByPlaceholder('Write a comment...')).toHaveValue('');
  await snap('comment posted', { mask: [...ARTICLE_PART, '.date-posted'] });
  observe('textarea after post', await page.getByPlaceholder('Write a comment...').inputValue());
  observe('error items', await page.locator('.error-messages li').allInnerTexts());
  observe(
    'comments on screen',
    (await cardsOnScreen(page)).map(({ date, ...c }) => c),
  );
  observe('backend comments', await backendComments(api));
});

parityJourney('comments', 'blank comment shows error', async ctx => {
  const { page, snap, observe, api, loginAs } = ctx;
  await loginAs('demo');
  await openArticle(ctx);
  await page.getByRole('button', { name: 'Post Comment' }).click();
  await expect(page.locator('.error-messages li').first()).toBeVisible();
  await snap('blank comment error', { mask: ARTICLE_PART });
  observe('error items', await page.locator('.error-messages li').allInnerTexts());
  observe('comment count on screen', await page.locator(COMMENT_CARDS).count());
  observe('backend comments', await backendComments(api));
  await page.getByPlaceholder('Write a comment...').fill('Now with text.');
  await page.getByRole('button', { name: 'Post Comment' }).click();
  await expect(page.locator(COMMENT_CARDS).first()).toContainText('Now with text.');
  await snap('error cleared after valid comment', { mask: [...ARTICLE_PART, '.date-posted'] });
  observe('error items after valid post', await page.locator('.error-messages li').allInnerTexts());
});

parityJourney('comments', 'delete own comment', async ctx => {
  const { page, snap, observe, api, loginAs } = ctx;
  await loginAs('demo');
  await openArticle(ctx);
  const own = page.locator(COMMENT_CARDS, { hasText: 'Bookmarking this for the team.' });
  await expect(own.locator('.mod-options .ion-trash-a')).toBeVisible();
  await snap('before delete', { mask: ARTICLE_PART });
  await own.locator('.mod-options .ion-trash-a').click();
  await expect(own).toHaveCount(0);
  await snap('after delete', { mask: ARTICLE_PART });
  observe('comments on screen', await cardsOnScreen(page));
  observe('error items', await page.locator('.error-messages li').allInnerTexts());
  observe('backend comments', await backendComments(api));
  observe('url', new URL(page.url()).pathname);
});

parityJourney('comments', 'other users comments have no delete icon', async ctx => {
  const { page, snap, observe, loginAs } = ctx;
  await loginAs('bob');
  await openArticle(ctx);
  await snap('signed in as bob', { mask: ARTICLE_PART });
  observe('comments on screen', await cardsOnScreen(page));
  observe('delete icon count', await page.locator('.mod-options .ion-trash-a').count());
  observe(
    'author link hrefs',
    await page.locator(`${COMMENT_CARDS} a.comment-author`).evaluateAll(as => as.map(a => a.getAttribute('href'))),
  );
});
