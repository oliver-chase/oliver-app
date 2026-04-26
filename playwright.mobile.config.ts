import { defineConfig, devices } from '@playwright/test'
import baseConfig from './playwright.config'

const base = baseConfig

export default defineConfig({
  ...base,
  testMatch: ['**/mobile-clickpaths.spec.ts'],
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
})
