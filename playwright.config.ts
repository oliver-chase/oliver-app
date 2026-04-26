import { defineConfig, devices } from '@playwright/test'

const webServerPort = process.env.PLAYWRIGHT_WEB_SERVER_PORT || '3001'
const webServerUrl = process.env.PLAYWRIGHT_BASE_URL || process.env.PLAYWRIGHT_WEB_SERVER_URL || `http://127.0.0.1:${webServerPort}`
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1' || process.env.PLAYWRIGHT_WEB_SERVER_URL
const webServerCommand = `npm run dev -- --port ${webServerPort}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  webServer: skipWebServer
    ? undefined
    : {
      command: webServerCommand,
      url: webServerUrl,
      reuseExistingServer: true,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_E2E_AUTH_BYPASS: '1',
      },
    },
  use: {
    baseURL: webServerUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
