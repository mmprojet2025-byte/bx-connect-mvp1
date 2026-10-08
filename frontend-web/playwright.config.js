import process from 'node:process';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',

  fullyParallel: true,

  forbidOnly: Boolean(process.env.CI),

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'webkit-activity-dates',
      testMatch: '**/activity-finalization.spec.js',
      grep: /local date\/time|WebKit native keyboard/,
      use: {
        ...devices['Desktop Safari'],
      },
    },
    {
      name: 'webkit-activity-uploads',
      testMatch: '**/activity-finalization.spec.js',
      grep: /paid multi-day activity with deadline\/image/,
      use: {
        ...devices['Desktop Safari'],
      },
    },
    {
      name: 'webkit-payments',
      testMatch: ['**/payment-checkout-safety.spec.js', '**/project-payments.spec.js', '**/activity-finalization.spec.js'],
      grep: /payment-checkout-safety\.spec\.js|project-payments\.spec\.js|payment return|member uses activity payment flow/,
      use: {
        ...devices['Desktop Safari'],
      },
    },
    {
      name: 'webkit-session-navigation',
      testMatch: '**/session-navigation.spec.js',
      use: {
        ...devices['Desktop Safari'],
      },
    },
    {
      name: 'webkit-project-details',
      testMatch: ['**/project-details.spec.js', '**/project-referent-review.spec.js', '**/project-catalogue.spec.js'],
      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],

  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
