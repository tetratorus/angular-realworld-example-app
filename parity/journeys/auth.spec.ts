import type { Page } from '@playwright/test';
import { parityJourney, JourneyContext } from '../lib/harness';

const PASSWORD = 'password123';
/** Home feed/sidebar belong to the home work package; auth only checks that the redirect lands there signed in. */
const HOME_CONTENT = ['.home-page .container.page', '[data-not-migrated]'];

const path = (page: Page) => new URL(page.url()).pathname;
const token = (page: Page) => page.evaluate(() => window.localStorage.getItem('jwtToken'));
const errorList = (page: Page) => page.locator('.error-messages li').allInnerTexts();
const navLinks = async (page: Page) =>
  (await page.locator('nav .navbar-nav .nav-link').allInnerTexts()).map(t => t.trim());
const submit = (page: Page) => page.locator('form button[type="submit"]');

/** Everything visible on the auth form that must match between the apps. */
async function observeForm({ page, observe }: JourneyContext, key: string) {
  observe(`${key}.url`, path(page));
  observe(`${key}.title`, await page.locator('.auth-page h1').innerText());
  observe(`${key}.switchLink`, {
    text: await page.locator('.auth-page p.text-xs-center a').innerText(),
    href: await page.locator('.auth-page p.text-xs-center a').getAttribute('href'),
  });
  observe(
    `${key}.inputs`,
    await page.locator('.auth-page input').evaluateAll(els => els.map(e => e.getAttribute('placeholder'))),
  );
  observe(`${key}.errors`, await errorList(page));
  observe(`${key}.buttonText`, (await submit(page).innerText()).trim());
  observe(`${key}.buttonDisabled`, await submit(page).isDisabled());
  observe(`${key}.signedIn`, !!(await token(page)));
}

async function waitForHome(page: Page) {
  await page.waitForURL(u => new URL(u).pathname === '/');
  await page.locator('nav a[href="/editor"]').waitFor();
}

parityJourney('auth', 'login success as demo', async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(baseURL + '/login');
  await submit(page).waitFor();
  await observeForm(ctx, 'empty');
  await snap('login form');

  await page.fill('input[name="email"]', 'demo@conduit.test');
  await page.fill('input[name="password"]', PASSWORD);
  observe('filled.buttonDisabled', await submit(page).isDisabled());
  await snap('login filled');

  await submit(page).click();
  await waitForHome(page);
  observe('after.url', path(page));
  observe('after.nav', await navLinks(page));
  const jwt = await token(page);
  observe('after.signedIn', !!jwt);
  const { user } = await api('/user', jwt!);
  observe('after.currentUser', { username: user.username, email: user.email });
  await snap('home signed in', { mask: HOME_CONTENT, fullPage: false });
});

parityJourney('auth', 'invalid credentials error', async ctx => {
  const { page, baseURL, snap, observe } = ctx;
  await page.goto(baseURL + '/login');
  await page.fill('input[name="email"]', 'demo@conduit.test');
  await page.fill('input[name="password"]', 'wrong-password');
  await submit(page).click();
  await page.locator('.error-messages li').first().waitFor();
  await observeForm(ctx, 'error');
  observe('error.fieldValues', {
    email: await page.inputValue('input[name="email"]'),
    password: await page.inputValue('input[name="password"]'),
  });
  await snap('credentials invalid');

  // Fixing the password and retrying clears the error and signs in.
  await page.fill('input[name="password"]', PASSWORD);
  await submit(page).click();
  await waitForHome(page);
  observe('retry.url', path(page));
  observe('retry.signedIn', !!(await token(page)));
});

parityJourney('auth', 'register a new user', async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(baseURL + '/register');
  await submit(page).waitFor();
  await observeForm(ctx, 'empty');
  await snap('register form');

  await page.fill('input[name="username"]', 'newreader');
  await page.fill('input[name="email"]', 'newreader@conduit.test');
  await page.fill('input[name="password"]', PASSWORD);
  observe('filled.buttonDisabled', await submit(page).isDisabled());
  await snap('register filled');

  await submit(page).click();
  await waitForHome(page);
  observe('after.url', path(page));
  observe('after.nav', await navLinks(page));
  const jwt = await token(page);
  const { user } = await api('/user', jwt!);
  observe('after.currentUser', { username: user.username, email: user.email, bio: user.bio, image: user.image });
  observe('after.profile', await api('/profiles/newreader'));
  // The new account can sign in with the chosen password.
  const res = await fetch('http://localhost:3000/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: { email: 'newreader@conduit.test', password: PASSWORD } }),
  });
  observe('after.canLogin', res.status);
  await snap('home after register', { mask: HOME_CONTENT, fullPage: false });
});

parityJourney('auth', 'register with taken username', async ctx => {
  const { page, baseURL, snap, observe, api } = ctx;
  await page.goto(baseURL + '/register');
  await page.fill('input[name="username"]', 'alice');
  await page.fill('input[name="email"]', 'another@conduit.test');
  await page.fill('input[name="password"]', PASSWORD);
  await submit(page).click();
  await page.locator('.error-messages li').first().waitFor();
  await observeForm(ctx, 'taken');
  observe('taken.anotherProfile', (await api('/profiles/another')).errors ?? 'exists');
  await snap('username taken');

  // Taken email is reported the same way.
  await page.fill('input[name="username"]', 'someoneelse');
  await page.fill('input[name="email"]', 'bob@conduit.test');
  await submit(page).click();
  await page.locator('.error-messages li', { hasText: 'email' }).waitFor();
  observe('emailTaken.errors', await errorList(page));
  await snap('email taken');
});

parityJourney('auth', 'empty fields keep button disabled', async ctx => {
  const { page, baseURL, snap, observe } = ctx;
  await page.goto(baseURL + '/login');
  await submit(page).waitFor();
  observe('login.empty', await submit(page).isDisabled());
  await page.fill('input[name="email"]', 'demo@conduit.test');
  observe('login.emailOnly', await submit(page).isDisabled());
  await snap('login email only');
  await page.fill('input[name="email"]', '');
  await page.fill('input[name="password"]', PASSWORD);
  observe('login.passwordOnly', await submit(page).isDisabled());
  // Clicking the disabled button sends nothing (asserted by the identical API call log).
  await submit(page).click({ force: true });
  observe('login.afterClick.url', path(page));

  // "Need an account?" switches to the register form.
  await page.click('text=Need an account?');
  await page.waitForURL(u => new URL(u).pathname === '/register');
  await submit(page).waitFor();
  await observeForm(ctx, 'register.empty');
  await page.fill('input[name="email"]', 'x@conduit.test');
  await page.fill('input[name="password"]', PASSWORD);
  observe('register.noUsername', await submit(page).isDisabled());
  await snap('register without username');
  await page.fill('input[name="username"]', 'x');
  observe('register.allFilled', await submit(page).isDisabled());

  // "Have an account?" goes back to a fresh login form.
  await page.click('text=Have an account?');
  await page.waitForURL(u => new URL(u).pathname === '/login');
  await submit(page).waitFor();
  await observeForm(ctx, 'login.back');
});

parityJourney('auth', 'malformed email is rejected in the browser', async ctx => {
  const { page, baseURL, snap, observe } = ctx;
  await page.goto(baseURL + '/register');
  await page.fill('input[name="username"]', 'typo');
  await page.fill('input[name="email"]', 'typo-at-conduit.test');
  await page.fill('input[name="password"]', PASSWORD);
  observe('buttonDisabledBeforeSubmit', await submit(page).isDisabled());
  await submit(page).click();
  await page.locator('.error-messages li').first().waitFor();
  await observeForm(ctx, 'invalid');
  await snap('email is invalid');
});

parityJourney('auth', 'signed-in user visiting login', async ctx => {
  const { page, baseURL, snap, observe, loginAs } = ctx;
  await loginAs('demo');
  await page.goto(baseURL + '/login');
  await page.locator('nav a[href="/editor"]').waitFor();
  await page.waitForURL(u => new URL(u).pathname === '/');
  observe('url', path(page));
  observe('authFormShown', await page.locator('.auth-page').count());
  observe('nav', await navLinks(page));
  observe('signedIn', !!(await token(page)));
  await snap('login while signed in');
});
