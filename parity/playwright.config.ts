import { defineConfig } from '@playwright/test';

/**
 * Angular ↔ React parity suite. Each journey runs on both apps against the same seeded mock API
 * (reset before every run) and writes evidence to evidence/<screen>/.
 *
 *   bash scripts/dev-up.sh          # mock API :3000, Angular :4200, React :5173
 *   npx playwright test -c parity   # all journeys
 *   node parity/report.mjs          # evidence/<screen>/report.md + evidence/parity-results.md
 */
export default defineConfig({
  testDir: './journeys',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [['list']],
  use: { actionTimeout: 10_000, navigationTimeout: 20_000 },
  webServer: [
    { command: 'node mock-api/server.mjs', url: 'http://localhost:3000/health', reuseExistingServer: true, cwd: '..' },
    {
      command: 'npx ng serve --port 4200',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      cwd: '..',
      timeout: 180_000,
    },
    {
      command: 'npx vite --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      cwd: '../react-app',
      timeout: 120_000,
    },
  ],
});
