import { test, expect, Page } from '@playwright/test';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const APP = (process.env.UAT_APP || 'react') as 'react' | 'angular';
const BASE = APP === 'react' ? 'http://localhost:5173' : 'http://localhost:4200';
const API = 'http://localhost:3000/api';
const ONLY = (process.env.UAT_ONLY || '').split(',').filter(Boolean);
const ROOT = resolve(__dirname, '..', '..');
const OUT = join(ROOT, 'tests', 'uat-evidence', APP);
const RESULTS = join(OUT, 'results.json');

type Ctx = {
  page: Page;
  step: (desc: string, fn: () => Promise<unknown>) => Promise<void>;
  actual: (s: string) => void;
};
let current: { id: string; steps: string[]; actual: string; failedStep?: string } | null = null;

function scenario(id: string, fn: (ctx: Ctx) => Promise<void>) {
  const run = ONLY.length === 0 || ONLY.includes(id);
  (run ? test : test.skip)(id, async ({ page }) => {
    await fetch(`${API}/__reset`, { method: 'POST' });
    const dir = join(OUT, id);
    mkdirSync(dir, { recursive: true });
    current = { id, steps: [], actual: '' };
    let n = 0;
    const step = async (desc: string, f: () => Promise<unknown>) => {
      n++;
      current!.failedStep = `${n}. ${desc}`;
      await f();
      await page.waitForLoadState('networkidle').catch(() => {});
      const file = join(dir, `step-${String(n).padStart(2, '0')}.png`);
      await page.screenshot({ path: file });
      current!.steps.push(file);
      current!.failedStep = undefined;
    };
    await fn({ page, step, actual: s => (current!.actual = s) });
  });
}

test.afterEach(async ({ page }, info) => {
  if (!current) return;
  const all = existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, 'utf8')) : {};
  const video = page.video();
  await page.close();
  let videoFile = '';
  if (video) {
    videoFile = join(OUT, current.id, 'video.webm');
    try {
      copyFileSync(await video.path(), videoFile);
    } catch {
      videoFile = '';
    }
  }
  const passed = info.status === 'passed';
  all[current.id] = {
    status: passed ? 'Pass' : 'Fail',
    actual: passed
      ? current.actual
      : `Failed at step ${current.failedStep ?? '(verification)'}: ${String(info.error?.message ?? '')
          .split('\n')[0]
          .replace(/\u001b\[[0-9;]*m/g, '')}`,
    screenshots: current.steps.map(s => s.replace(ROOT + '/', '')),
    video: videoFile.replace(ROOT + '/', ''),
    ranAt: new Date().toISOString(),
    app: APP,
  };
  writeFileSync(RESULTS, JSON.stringify(all, null, 2));
  current = null;
});

async function signIn(page: Page, email: string, password = 'password123') {
  await page.goto(BASE + '/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
}
const headerText = (page: Page) => page.locator('.navbar .nav').innerText();
const errors = (page: Page) => page.locator('.error-messages li').allInnerTexts();
const titles = (page: Page) => page.locator('.article-preview h1').allInnerTexts();

scenario('UAT-001', async ({ page, step, actual }) => {
  await step('Open /login', () => page.goto(BASE + '/login'));
  await step('Enter email', () => page.fill('input[name="email"]', 'demo@conduit.test'));
  await step('Enter password', () => page.fill('input[name="password"]', 'password123'));
  await step("Click 'Sign in'", async () => {
    await page.click('button[type="submit"]');
    await page.waitForURL(BASE + '/');
  });
  const h = await headerText(page);
  expect(h).toContain('demo');
  expect(h).toContain('New Article');
  expect(h).toContain('Settings');
  actual(`Landed on ${new URL(page.url()).pathname}; header: ${h.replace(/\s+/g, ' ').trim()}`);
});

scenario('UAT-002', async ({ page, step, actual }) => {
  await step('Open /login', () => page.goto(BASE + '/login'));
  await step('Enter email', () => page.fill('input[name="email"]', 'demo@conduit.test'));
  await step('Enter wrong password', () => page.fill('input[name="password"]', 'wrongpass1'));
  await step("Click 'Sign in'", async () => {
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-messages li').first()).toBeVisible();
  });
  const e = await errors(page);
  expect(e.join(' ')).toContain('credentials invalid');
  expect(new URL(page.url()).pathname).toBe('/login');
  expect(await headerText(page)).toContain('Sign in');
  actual(`Error shown: "${e.join('; ')}"; still on /login, signed out`);
});

scenario('UAT-003', async ({ page, step, actual }) => {
  const reqs: string[] = [];
  page.on('request', r => r.url().includes('/users/login') && reqs.push(r.url()));
  await step('Open /login', () => page.goto(BASE + '/login'));
  await step('Leave email and password empty', () => page.locator('input[name="email"]').focus());
  await step("Check the 'Sign in' button", async () => {
    await page.locator('button[type="submit"]').click({ force: true });
  });
  expect(await page.locator('button[type="submit"]').isDisabled()).toBe(true);
  expect(reqs.length).toBe(0);
  actual(`'Sign in' button disabled; ${reqs.length} login requests sent`);
});

scenario('UAT-004', async ({ page, step, actual }) => {
  await step('Open /', () => page.goto(BASE + '/'));
  await step('Check Global Feed shows 10 articles', async () => {
    await expect(page.locator('.article-preview h1')).toHaveCount(10);
  });
  const first = await titles(page);
  await step("Click page '2'", async () => {
    await page.locator('.pagination .page-link', { hasText: '2' }).click();
    await expect(page.locator('.pagination .page-item.active')).toHaveText(/2/);
  });
  await expect(page.locator('.article-preview h1')).toHaveCount(10);
  const second = await titles(page);
  expect(second.some(t => first.includes(t))).toBe(false);
  actual(`Page 1 first: "${first[0]}"; page 2 shows 10 different articles starting "${second[0]}"; page 2 active`);
});

scenario('UAT-005', async ({ page, step, actual }) => {
  await step('Open /', () => page.goto(BASE + '/'));
  await step("Click tag 'testing' in Popular Tags", async () => {
    await page
      .locator('.sidebar .tag-list a, .sidebar .tag-list .tag-pill', { hasText: /^\s*testing\s*$/ })
      .first()
      .click();
    await page.waitForURL(BASE + '/tag/testing');
  });
  await expect(page.locator('.feed-toggle .nav-link.active')).toContainText('testing');
  const tagLists = await page.locator('.article-preview .tag-list').allInnerTexts();
  expect(tagLists.length).toBeGreaterThan(0);
  expect(tagLists.every(t => t.includes('testing'))).toBe(true);
  actual(
    `URL /tag/testing; active tab "${(await page.locator('.feed-toggle .nav-link.active').innerText()).trim()}"; ${tagLists.length} articles, all tagged testing`,
  );
});

scenario('UAT-006', async ({ page, step, actual }) => {
  await step('Open /register', () => page.goto(BASE + '/register'));
  await step('Enter username', () => page.fill('input[name="username"]', 'newuser1'));
  await step('Enter email', () => page.fill('input[name="email"]', 'newuser1@conduit.test'));
  await step('Enter password', () => page.fill('input[name="password"]', 'password123'));
  await step("Click 'Sign up'", async () => {
    await page.click('button[type="submit"]');
    await page.waitForURL(BASE + '/');
  });
  expect(await headerText(page)).toContain('newuser1');
  actual('Landed on Home signed in as newuser1');
});

scenario('UAT-007', async ({ page, step, actual }) => {
  await step('Open /register', () => page.goto(BASE + '/register'));
  await step('Enter the details', async () => {
    await page.fill('input[name="username"]', 'alice');
    await page.fill('input[name="email"]', 'other@conduit.test');
    await page.fill('input[name="password"]', 'password123');
  });
  await step("Click 'Sign up'", async () => {
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-messages li').first()).toBeVisible();
  });
  const e = await errors(page);
  expect(e.join(' ')).toContain('username has already been taken');
  expect(new URL(page.url()).pathname).toBe('/register');
  actual(`Error shown: "${e.join('; ')}"; still on /register`);
});

scenario('UAT-008', async ({ page, step, actual }) => {
  await step('Open /settings directly', async () => {
    await page.goto(BASE + '/settings');
    await page.waitForURL(BASE + '/login');
  });
  actual(`Redirected to ${new URL(page.url()).pathname}`);
});

scenario('UAT-009', async ({ page, step, actual }) => {
  await step('Open /editor directly', async () => {
    await page.goto(BASE + '/editor');
    await page.waitForURL(BASE + '/login');
  });
  actual(`Redirected to ${new URL(page.url()).pathname}`);
});

scenario('UAT-010', async ({ page, step, actual }) => {
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open /', () => page.goto(BASE + '/'));
  await step("Check 'Your Feed' tab", async () => {
    await page.locator('.feed-toggle .nav-link', { hasText: 'Your Feed' }).click();
    await expect(page.locator('.article-preview .author').first()).toBeVisible();
  });
  const authors = [
    ...new Set((await page.locator('.article-preview .author').allInnerTexts()).map(a => a.trim())),
  ].sort();
  expect(authors).toEqual(['alice', 'bob']);
  actual(`Your Feed authors: ${authors.join(', ')}`);
});

scenario('UAT-011', async ({ page, step, actual }) => {
  await step('Open /article/getting-started-with-reactive-forms', () =>
    page.goto(BASE + '/article/getting-started-with-reactive-forms'),
  );
  await expect(page.locator('.banner h1')).toHaveText('Getting started with reactive forms');
  const author = (await page.locator('.banner .author').innerText()).trim();
  const tags = (await page.locator('.article-content .tag-list li').allInnerTexts()).map(t => t.trim());
  const comments = await page.locator('.card .card-text').count();
  const hasMarkdown =
    (await page
      .locator('.article-content h2, .article-content h3, .article-content strong, .article-content code')
      .count()) > 0;
  expect(author).toBe('alice');
  expect(tags).toEqual(['forms', 'angular']);
  expect(comments).toBe(3);
  expect(hasMarkdown).toBe(true);
  actual(`Title shown; author ${author}; tags ${tags.join(', ')}; Markdown rendered; ${comments} comments`);
});

scenario('UAT-012', async ({ page, step, actual }) => {
  const btn = () => page.locator('.article-actions button', { hasText: /Favorite|Unfavorite/ }).first();
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open the article', () => page.goto(BASE + '/article/typography-for-long-reads'));
  const c0 = (await btn().innerText()).trim();
  await step("Click 'Favorite Article'", async () => {
    await btn().click();
    await expect(btn()).toContainText('Unfavorite');
  });
  const c1 = (await btn().innerText()).trim();
  await step("Click 'Unfavorite Article'", async () => {
    await btn().click();
    await expect(btn()).not.toContainText('Unfavorite');
  });
  const c2 = (await btn().innerText()).trim();
  expect(c0).toMatch(/\(0\)/);
  expect(c1).toMatch(/\(1\)/);
  expect(c2).toMatch(/\(0\)/);
  actual(`"${c0}" → "${c1}" → "${c2}"`);
});

scenario('UAT-013', async ({ page, step, actual }) => {
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open the article', () => page.goto(BASE + '/article/designing-an-empty-state'));
  await step("Click 'Follow carol'", async () => {
    await page.locator('.article-actions button', { hasText: 'Follow carol' }).first().click();
    await expect(page.locator('.article-actions button', { hasText: 'Unfollow carol' }).first()).toBeVisible();
  });
  const feed = await fetch(`${API}/articles/feed?limit=50`, {
    headers: { Authorization: `Token ${await page.evaluate(() => localStorage.getItem('jwtToken'))}` },
  }).then(r => r.json());
  const authors = [...new Set(feed.articles.map((a: any) => a.author.username))];
  expect(authors).toContain('carol');
  actual(`Button now 'Unfollow carol'; feed authors: ${authors.sort().join(', ')}`);
});

scenario('UAT-014', async ({ page, step, actual }) => {
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step("Open 'Designing an empty state'", () => page.goto(BASE + '/article/designing-an-empty-state'));
  await step('Type the comment', () => page.fill('textarea[placeholder="Write a comment..."]', 'Great write-up'));
  await step("Click 'Post Comment'", async () => {
    await page.click('button:has-text("Post Comment")');
    await expect(page.locator('.card .card-text').first()).toHaveText('Great write-up');
  });
  const author = (await page.locator('.card .comment-author').nth(1).innerText()).trim();
  expect(author).toBe('demo');
  actual(`Comment "Great write-up" at top of list, author ${author}`);
});

scenario('UAT-015', async ({ page, step, actual }) => {
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open the article', async () => {
    await page.goto(BASE + '/article/getting-started-with-reactive-forms');
    await expect(page.locator('.card .card-text')).toHaveCount(3);
  });
  const trashBefore = await page.locator('.card .mod-options .ion-trash-a').count();
  await step("Click the trash icon on demo's comment", async () => {
    await page.locator('.card .mod-options .ion-trash-a').first().click();
    await expect(page.locator('.card .card-text')).toHaveCount(2);
  });
  const remaining = await fetch(`${API}/articles/getting-started-with-reactive-forms/comments`).then(r => r.json());
  expect(trashBefore).toBe(1);
  expect(remaining.comments.some((c: any) => c.author.username === 'demo')).toBe(false);
  actual(`${trashBefore} trash icon (own comment only); after delete 2 comments remain, none by demo`);
});

scenario('UAT-016', async ({ page, step, actual }) => {
  await step('Open the article', () => page.goto(BASE + '/article/getting-started-with-reactive-forms'));
  expect(await page.locator('textarea[placeholder="Write a comment..."]').count()).toBe(0);
  const text = (await page.locator('.article-page .row').last().innerText()).replace(/\s+/g, ' ');
  expect(text).toContain('Sign in or sign up to add comments on this article.');
  actual('No comment form; prompt "Sign in or sign up to add comments on this article." shown');
});

scenario('UAT-017', async ({ page, step, actual }) => {
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step("Click 'New Article'", async () => {
    await page.locator('.navbar a', { hasText: 'New Article' }).click();
    await page.waitForURL(BASE + '/editor');
  });
  await step('Fill title, description, body', async () => {
    await page.fill('input[name="title"]', 'UAT article');
    await page.fill('input[name="description"]', 'Created by UAT');
    await page.fill('textarea[name="body"]', 'Hello **world**');
  });
  await step('Type each tag and press Enter', async () => {
    for (const t of ['uat', 'demo']) {
      await page.fill('input[placeholder="Enter tags"]', t);
      await page.press('input[placeholder="Enter tags"]', 'Enter');
    }
  });
  await step("Click 'Publish Article'", async () => {
    await page.click('button:has-text("Publish Article")');
    await page.waitForURL(BASE + '/article/uat-article');
  });
  await expect(page.locator('.banner h1')).toHaveText('UAT article');
  const tags = (await page.locator('.article-content .tag-list li').allInnerTexts()).map(t => t.trim());
  expect(tags).toEqual(['uat', 'demo']);
  expect(await page.locator('.article-content strong').innerText()).toBe('world');
  actual(`On /article/uat-article; title, bold body and tags ${tags.join(', ')} shown`);
});

scenario('UAT-018', async ({ page, step, actual }) => {
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open /editor', () => page.goto(BASE + '/editor'));
  await step('Fill description and body only', async () => {
    await page.fill('input[name="description"]', 'x');
    await page.fill('textarea[name="body"]', 'y');
  });
  await step("Click 'Publish Article'", async () => {
    await page.click('button:has-text("Publish Article")');
    await expect(page.locator('.error-messages li').first()).toBeVisible();
  });
  const e = await errors(page);
  const count = (await fetch(`${API}/articles?limit=100`).then(r => r.json())).articlesCount;
  expect(e.join(' ')).toContain("title can't be blank");
  expect(count).toBe(22);
  actual(`Error shown: "${e.join('; ')}"; article count unchanged (${count})`);
});

scenario('UAT-019', async ({ page, step, actual }) => {
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open the URL directly', async () => {
    await page.goto(BASE + '/editor/getting-started-with-reactive-forms');
    await page.waitForURL(BASE + '/');
  });
  expect(await page.locator('input[name="title"]').count()).toBe(0);
  actual(`Redirected to ${new URL(page.url()).pathname}; editor not shown`);
});

scenario('UAT-020', async ({ page, step, actual }) => {
  await step('Sign in as alice', async () => {
    await signIn(page, 'alice@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open the article', () => page.goto(BASE + '/article/markdown-in-the-browser'));
  await step("Click 'Edit Article'", async () => {
    await page.locator('.banner a', { hasText: 'Edit Article' }).click();
    await page.waitForURL(BASE + '/editor/markdown-in-the-browser');
    await expect(page.locator('input[name="title"]')).toHaveValue('Markdown in the browser');
  });
  await step("Change description to 'Edited by UAT'", () => page.fill('input[name="description"]', 'Edited by UAT'));
  await step("Click 'Publish Article'", async () => {
    await page.click('button:has-text("Publish Article")');
    await page.waitForURL(/\/article\//);
  });
  const desc = (await fetch(`${API}/articles/markdown-in-the-browser`).then(r => r.json())).article?.description;
  await step("Click 'Delete Article'", async () => {
    await page.locator('.banner button', { hasText: 'Delete Article' }).click();
    await page.waitForURL(BASE + '/');
  });
  const gone = (await fetch(`${API}/articles/markdown-in-the-browser`)).status;
  expect(desc).toBe('Edited by UAT');
  expect(gone).toBe(404);
  actual(`Description saved as "${desc}"; after delete on Home, GET article → ${gone}`);
});

scenario('UAT-021', async ({ page, step, actual }) => {
  await step('Open /profile/alice', async () => {
    await page.goto(BASE + '/profile/alice');
    await expect(page.locator('.article-preview .author').first()).toBeVisible();
  });
  const bio = (await page.locator('.user-info p').innerText()).trim();
  const authors = [...new Set((await page.locator('.article-preview .author').allInnerTexts()).map(a => a.trim()))];
  expect(await page.locator('.user-info img').count()).toBe(1);
  expect(bio).toContain('Frontend engineer');
  expect(authors).toEqual(['alice']);
  expect(await page.locator('.articles-toggle .nav-link.active').innerText()).toContain('My Posts');
  actual(
    `Image and bio "${bio}" shown; My Posts active; ${await page.locator('.article-preview').count()} articles, all by alice`,
  );
});

scenario('UAT-022', async ({ page, step, actual }) => {
  const btn = () => page.locator('.user-info button').first();
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open /profile/carol', () => page.goto(BASE + '/profile/carol'));
  const b0 = (await btn().innerText()).trim();
  await step("Click 'Follow carol'", async () => {
    await btn().click();
    await expect(btn()).toContainText('Unfollow carol');
  });
  const b1 = (await btn().innerText()).trim();
  await step("Click 'Unfollow carol'", async () => {
    await btn().click();
    await expect(btn()).not.toContainText('Unfollow');
  });
  const b2 = (await btn().innerText()).trim();
  expect(b0).toContain('Follow carol');
  actual(`"${b0}" → "${b1}" → "${b2}"`);
});

scenario('UAT-023', async ({ page, step, actual }) => {
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open Settings', async () => {
    await page.locator('.navbar a', { hasText: 'Settings' }).click();
    await page.waitForURL(BASE + '/settings');
  });
  await step('Replace bio', () => page.fill('textarea[name="bio"], textarea[formcontrolname="bio"]', 'Updated by UAT'));
  await step("Click 'Update Settings'", async () => {
    await page.click('button:has-text("Update Settings")');
    await page.waitForURL(BASE + '/profile/demo');
  });
  await expect(page.locator('.user-info p')).toHaveText('Updated by UAT');
  actual('Landed on /profile/demo; bio shows "Updated by UAT"');
});

scenario('UAT-024', async ({ page, step, actual }) => {
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open Settings', () => page.goto(BASE + '/settings'));
  await step('Enter the email', () => page.fill('input[name="email"], input[formcontrolname="email"]', 'not-an-email'));
  await step("Click 'Update Settings'", async () => {
    await page.click('button:has-text("Update Settings")');
    await expect(page.locator('.error-messages li').first()).toBeVisible();
  });
  const e = await errors(page);
  expect(e.join(' ')).toContain('email is invalid');
  expect(new URL(page.url()).pathname).toBe('/settings');
  actual(`Error shown: "${e.join('; ')}"; still on /settings`);
});

scenario('UAT-025', async ({ page, step, actual }) => {
  await step('Sign in as demo', async () => {
    await signIn(page, 'demo@conduit.test');
    await page.waitForURL(BASE + '/');
  });
  await step('Open Settings', () => page.goto(BASE + '/settings'));
  await step("Click 'Or click here to logout.'", async () => {
    await page.locator('button', { hasText: 'logout' }).click();
    await page.waitForURL(BASE + '/');
  });
  const h = await headerText(page);
  expect(h).toContain('Sign in');
  expect(h).toContain('Sign up');
  expect(await page.evaluate(() => localStorage.getItem('jwtToken'))).toBeNull();
  actual(`On Home, signed out; header: ${h.replace(/\s+/g, ' ').trim()}`);
});
