import { defineConfig } from '@playwright/test';

/** UAT runner: UAT_APP=react|angular npx playwright test -c tests/uat --headed */
export default defineConfig({
  testDir: '.',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  outputDir: '../../test-results/uat',
  use: {
    viewport: { width: 1440, height: 900 },
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    actionTimeout: 10_000,
    launchOptions: { slowMo: 150 },
  },
});
