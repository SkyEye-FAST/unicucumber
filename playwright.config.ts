import { defineConfig, devices } from '@playwright/test'

const requestedPort = process.env.PLAYWRIGHT_PORT ?? '4173'
const parsedPort = /^\d+$/.test(requestedPort)
  ? Number.parseInt(requestedPort, 10)
  : 4173
const serverPort = parsedPort >= 1 && parsedPort <= 65_535 ? parsedPort : 4173
const serverUrl = `http://127.0.0.1:${serverPort}`
const crossBrowserSmoke = /@cross-browser/
const phoneSmoke = /@phone/
const tabletSmoke = /@tablet/

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: serverUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command:
      process.env.PWA_E2E === '1'
        ? `pnpm preview --host 127.0.0.1 --port ${serverPort} --strictPort`
        : `pnpm dev --host 127.0.0.1 --port ${serverPort} --strictPort`,
    url: serverUrl,
    reuseExistingServer:
      !process.env.CI && process.env.PLAYWRIGHT_PORT === undefined,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      grep: crossBrowserSmoke,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      grep: crossBrowserSmoke,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'chromium-phone',
      grep: phoneSmoke,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'chromium-tablet',
      grep: tabletSmoke,
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'webkit-phone',
      grep: phoneSmoke,
      use: { ...devices['iPhone 13'] },
    },
  ],
})
