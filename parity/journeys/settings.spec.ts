import { JourneyContext, parityJourney } from '../lib/harness';

const SETTINGS_FIELDS = ['image', 'username', 'bio', 'email', 'password'];

async function formValues({ page }: JourneyContext) {
  const values: Record<string, string> = {};
  for (const name of SETTINGS_FIELDS) values[name] = await page.locator(`.settings-page [name="${name}"]`).inputValue();
  return values;
}

async function openSettings(ctx: JourneyContext) {
  await ctx.page.goto(ctx.baseURL + '/settings');
  await ctx.page.locator('.settings-page h1').waitFor();
}

const path = (ctx: JourneyContext) => new URL(ctx.page.url()).pathname;
const navLinks = (ctx: JourneyContext) => ctx.page.locator('nav.navbar .nav-link').allInnerTexts();
const errorList = (ctx: JourneyContext) => ctx.page.locator('.settings-page .error-messages li').allInnerTexts();
const storedToken = (ctx: JourneyContext) => ctx.page.evaluate(() => window.localStorage.getItem('jwtToken'));

parityJourney('settings', 'form prefilled for demo', async ctx => {
  await ctx.loginAs('demo');
  await openSettings(ctx);
  await ctx.snap('settings form prefilled');
  ctx.observe('url', path(ctx));
  ctx.observe('heading', await ctx.page.locator('.settings-page h1').innerText());
  ctx.observe('formValues', await formValues(ctx));
  ctx.observe(
    'placeholders',
    await ctx.page
      .locator('.settings-page .form-control')
      .evaluateAll(els => els.map(e => e.getAttribute('placeholder'))),
  );
  ctx.observe('buttons', await ctx.page.locator('.settings-page button').allInnerTexts());
  ctx.observe('errors', await errorList(ctx));
});

parityJourney('settings', 'update bio then land on profile', async ctx => {
  const token = await ctx.loginAs('demo');
  await openSettings(ctx);
  await ctx.page.locator('.settings-page textarea[name="bio"]').fill('Updated bio from the settings journey.');
  await ctx.snap('settings form with new bio');
  await ctx.page.getByRole('button', { name: 'Update Settings' }).click();
  await ctx.page.waitForURL('**/profile/demo');
  ctx.observe('urlAfterSubmit', path(ctx));
  ctx.observe('backendUser', await ctx.api('/user', token));
  ctx.observe('backendProfile', await ctx.api('/profiles/demo'));
  ctx.observe('navLinksAfterSubmit', await navLinks(ctx));
});

parityJourney('settings', 'invalid email shows error', async ctx => {
  const token = await ctx.loginAs('demo');
  await openSettings(ctx);
  await ctx.page.locator('.settings-page input[name="email"]').fill('not-an-email');
  await ctx.page.getByRole('button', { name: 'Update Settings' }).click();
  await ctx.page.locator('.settings-page .error-messages li').first().waitFor();
  await ctx.snap('invalid email error');
  ctx.observe('url', path(ctx));
  ctx.observe('errors', await errorList(ctx));
  ctx.observe('formValues', await formValues(ctx));
  ctx.observe('formEnabledAgain', await ctx.page.locator('.settings-page form > fieldset').isEnabled());
  ctx.observe('backendEmail', (await ctx.api('/user', token)).user.email);
});

parityJourney('settings', 'short new password shows error', async ctx => {
  const token = await ctx.loginAs('demo');
  await openSettings(ctx);
  await ctx.page.locator('.settings-page input[name="password"]').fill('short');
  await ctx.page.getByRole('button', { name: 'Update Settings' }).click();
  await ctx.page.locator('.settings-page .error-messages li').first().waitFor();
  await ctx.snap('short password error');
  ctx.observe('url', path(ctx));
  ctx.observe('errors', await errorList(ctx));
  ctx.observe('backendUser', await ctx.api('/user', token));
});

parityJourney('settings', 'logout returns to home signed out', async ctx => {
  const token = await ctx.loginAs('demo');
  await openSettings(ctx);
  ctx.observe('navLinksBefore', await navLinks(ctx));
  await ctx.snap('settings before logout');
  await ctx.page.getByRole('button', { name: 'Or click here to logout.' }).click();
  await ctx.page.waitForURL(url => new URL(url).pathname === '/');
  await ctx.page.locator('nav.navbar a[href="/login"]').waitFor();
  ctx.observe('urlAfterLogout', path(ctx));
  ctx.observe('navLinksAfter', await navLinks(ctx));
  ctx.observe('storedToken', await storedToken(ctx));
  ctx.observe('tokenStillValidOnBackend', !!(await ctx.api('/user', token)).user);
});

parityJourney('settings', 'signed-out settings redirects to login', async ctx => {
  await ctx.page.goto(ctx.baseURL + '/settings');
  await ctx.page.waitForURL('**/login');
  await ctx.page.locator('nav.navbar a[href="/login"]').waitFor();
  ctx.observe('url', path(ctx));
  ctx.observe('settingsFormRendered', await ctx.page.locator('.settings-page').count());
  ctx.observe('navLinks', await navLinks(ctx));
  ctx.observe('storedToken', await storedToken(ctx));
});
