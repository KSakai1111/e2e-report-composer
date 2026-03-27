import { defineConfig } from '@playwright/test';
import { appUnderTest } from './e2e.settings';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*Test\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  outputDir: 'playwright-report/.artifacts',
  use: {
    baseURL: appUnderTest.url,
    trace: 'retain-on-failure',
    viewport: appUnderTest.viewport
  }
});