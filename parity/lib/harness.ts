import { test, expect, Browser, BrowserContext, Page, Locator } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export const API = 'http://localhost:3000/api';
export const APPS = { angular: 'http://localhost:4200', react: 'http://localhost:5173' } as const;
export type AppName = keyof typeof APPS;
export const VIEWPORT = { width: 1440, height: 900 };
export const DIFF_THRESHOLD_PCT = 1;
const ROOT = resolve(__dirname, '..', '..');

/** Dynamic content masked in every screenshot (dates, avatars, footer year). */
export const DEFAULT_MASKS = [
  '.date',
  '.article-meta img',
  '.user-pic',
  '.user-img',
  '.comment-author-img',
  '.attribution',
];

export interface ApiCall {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
  status?: number;
}

export interface JourneyContext {
  app: AppName;
  page: Page;
  baseURL: string;
  /** Screenshot a key state (full page, masked). Same names must be used on both apps. */
  snap: (name: string, opts?: { mask?: string[]; fullPage?: boolean }) => Promise<void>;
  /** Record a functional observation (text, URL, data) that must be equal on both apps. */
  observe: (key: string, value: unknown) => void;
  /** Read backend state directly, e.g. to assert resulting data. */
  api: <T = any>(path: string, token?: string) => Promise<T>;
  /** Log in via the API and put the token in localStorage before the app boots. Call before the first goto. */
  loginAs: (username: string) => Promise<string>;
}

interface RunResult {
  calls: ApiCall[];
  observations: Record<string, unknown>;
  snaps: string[];
  video?: string;
  error?: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function resetBackend() {
  const res = await fetch(`${API}/__reset`, { method: 'POST' });
  if (!res.ok) throw new Error('mock API reset failed');
}

async function runOnApp(
  browser: Browser,
  app: AppName,
  screen: string,
  journeyId: string,
  journey: (ctx: JourneyContext) => Promise<void>,
): Promise<RunResult> {
  await resetBackend();
  const outDir = join(ROOT, 'evidence', screen);
  const shotsDir = join(outDir, 'screens');
  const videoDir = join(outDir, 'video');
  mkdirSync(shotsDir, { recursive: true });
  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'Asia/Singapore',
    ...(app === 'react' ? { recordVideo: { dir: videoDir, size: VIEWPORT } } : {}),
  });
  const page = await context.newPage();
  const result: RunResult = { calls: [], observations: {}, snaps: [] };

  page.on('request', req => {
    const url = new URL(req.url());
    if (!req.url().startsWith(API) || url.pathname.endsWith('/__reset') || req.method() === 'OPTIONS') return;
    let body: unknown = null;
    const raw = req.postData();
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
    const query: Record<string, string> = {};
    [...url.searchParams.keys()].sort().forEach(k => (query[k] = url.searchParams.get(k)!));
    result.calls.push({ method: req.method(), path: url.pathname.replace(/^\/api/, ''), query, body });
  });
  page.on('response', res => {
    const call = [...result.calls].reverse().find(c => res.url().includes(c.path) && c.status === undefined);
    if (call && res.url().startsWith(API)) call.status = res.status();
  });

  const settle = async () => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await page.waitForTimeout(250);
  };

  const ctx: JourneyContext = {
    app,
    page,
    baseURL: APPS[app],
    observe: (key, value) => (result.observations[key] = value),
    api: async (path, token) => {
      const res = await fetch(API + path, { headers: token ? { Authorization: `Token ${token}` } : {} });
      return res.status === 204 ? null : res.json();
    },
    loginAs: async username => {
      const res = await fetch(`${API}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { email: `${username}@conduit.test`, password: 'password123' } }),
      });
      const { user } = await res.json();
      await context.addInitScript(t => window.localStorage.setItem('jwtToken', t), user.token);
      return user.token as string;
    },
    snap: async (name, opts = {}) => {
      await settle();
      const masks: Locator[] = [...DEFAULT_MASKS, ...(opts.mask ?? [])].map(s => page.locator(s));
      await page.screenshot({
        path: join(shotsDir, `${journeyId}--${slug(name)}--${app}.png`),
        fullPage: opts.fullPage ?? true,
        mask: masks,
        maskColor: '#FF00FF',
        animations: 'disabled',
        caret: 'hide',
      });
      result.snaps.push(slug(name));
    },
  };

  try {
    await journey(ctx);
    await settle();
  } catch (e) {
    result.error = String((e as Error)?.message ?? e).split('\n')[0];
  }
  const video = page.video();
  await context.close();
  if (video) {
    const target = join(videoDir, `${journeyId}--react.webm`);
    try {
      renameSync(await video.path(), target);
      result.video = target;
    } catch {
      /* video optional */
    }
  }
  return result;
}

function diffImages(a: string, b: string, out: string) {
  const imgA = PNG.sync.read(readFileSync(a));
  const imgB = PNG.sync.read(readFileSync(b));
  const width = Math.max(imgA.width, imgB.width);
  const height = Math.max(imgA.height, imgB.height);
  const pad = (img: PNG) => {
    if (img.width === width && img.height === height) return img;
    const p = new PNG({ width, height });
    p.data.fill(0);
    PNG.bitblt(img, p, 0, 0, img.width, img.height, 0, 0);
    return p;
  };
  const A = pad(imgA);
  const B = pad(imgB);
  const diff = new PNG({ width, height });
  const differing = pixelmatch(A.data, B.data, diff.data, width, height, { threshold: 0.1 });
  writeFileSync(out, PNG.sync.write(diff));
  return {
    pct: (differing / (width * height)) * 100,
    differing,
    size: { angular: [imgA.width, imgA.height], react: [imgB.width, imgB.height] },
  };
}

const normaliseCalls = (calls: ApiCall[]) =>
  calls.map(({ method, path, query, body, status }) => ({ method, path, query, body, status }));

/**
 * Declare one parity journey for a screen. The callback runs once on Angular and once on React
 * with the same seed; screenshots, API calls and observations are compared and written to
 * evidence/<screen>/results/<journey>.json for parity/report.mjs.
 */
export function parityJourney(screen: string, title: string, journey: (ctx: JourneyContext) => Promise<void>) {
  test(`${screen} › ${title}`, async ({ browser }) => {
    const journeyId = slug(title);
    const angular = await runOnApp(browser, 'angular', screen, journeyId, journey);
    const react = await runOnApp(browser, 'react', screen, journeyId, journey);

    const outDir = join(ROOT, 'evidence', screen);
    const diffDir = join(outDir, 'diffs');
    mkdirSync(diffDir, { recursive: true });
    const shots = angular.snaps.map(name => {
      const a = join(outDir, 'screens', `${journeyId}--${name}--angular.png`);
      const r = join(outDir, 'screens', `${journeyId}--${name}--react.png`);
      const d = join(diffDir, `${journeyId}--${name}--diff.png`);
      if (!existsSync(r)) return { name, missing: true, pct: 100, pass: false };
      const res = diffImages(a, r, d);
      return { name, angular: a, react: r, diff: d, ...res, pass: res.pct <= DIFF_THRESHOLD_PCT };
    });
    const apiEqual = JSON.stringify(normaliseCalls(angular.calls)) === JSON.stringify(normaliseCalls(react.calls));
    const obsEqual = JSON.stringify(angular.observations) === JSON.stringify(react.observations);
    const snapsEqual = JSON.stringify(angular.snaps) === JSON.stringify(react.snaps);

    const record = {
      screen,
      journey: title,
      journeyId,
      ranAt: new Date().toISOString(),
      checks: {
        noErrors: !angular.error && !react.error,
        sameScreens: snapsEqual,
        visual: shots.every(s => s.pass),
        apiCalls: apiEqual,
        observations: obsEqual,
      },
      errors: { angular: angular.error ?? null, react: react.error ?? null },
      shots,
      apiCalls: { angular: angular.calls, react: react.calls },
      observations: { angular: angular.observations, react: react.observations },
      video: react.video ?? null,
    };
    mkdirSync(join(outDir, 'results'), { recursive: true });
    writeFileSync(join(outDir, 'results', `${journeyId}.json`), JSON.stringify(record, null, 2));

    expect.soft(record.errors, 'journey threw on one of the apps').toEqual({ angular: null, react: null });
    expect.soft(react.snaps, 'same key states captured').toEqual(angular.snaps);
    for (const s of shots) expect.soft(s.pct, `pixel diff for "${s.name}" (%)`).toBeLessThanOrEqual(DIFF_THRESHOLD_PCT);
    expect.soft(normaliseCalls(react.calls), 'API calls and payloads').toEqual(normaliseCalls(angular.calls));
    expect.soft(react.observations, 'functional observations').toEqual(angular.observations);
  });
}

export { expect };
