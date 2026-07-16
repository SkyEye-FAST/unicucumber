import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command:
      process.env.PWA_E2E === '1'
        ? 'pnpm preview --host 127.0.0.1 --port 4173 --strictPort'
        : 'pnpm dev --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'chromium-small-phone',
      use: { ...devices['iPhone SE'] },
    },
    {
      name: 'chromium-phone',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'chromium-tablet',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'webkit-phone',
      use: { ...devices['iPhone 13'] },
    },
  ],
})
