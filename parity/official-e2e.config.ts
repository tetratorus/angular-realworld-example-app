import { defineConfig } from '@playwright/test';
import { baseConfig } from '../realworld/specs/e2e/playwright.base';

/**
 * Runs the official RealWorld e2e suite (realworld/specs/e2e) against either app on the local mock API.
 *   E2E_APP=react   npx playwright test -c parity/official-e2e.config.ts --grep-invert @security
 *   E2E_APP=angular npx playwright test -c parity/official-e2e.config.ts --grep-invert @security
 */
const port = process.env.E2E_APP === 'angular' ? 4200 : 5173;
export default defineConfig({
  ...baseConfig,
  testDir: '../realworld/specs/e2e',
  outputDir: `../test-results/official-e2e-${process.env.E2E_APP || 'react'}`,
  retries: 0,
  use: { ...baseConfig.use, baseURL: `http://localhost:${port}` },
});
