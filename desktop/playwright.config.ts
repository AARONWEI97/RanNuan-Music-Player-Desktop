import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:5201'

export default defineConfig({
  testDir: './tests',
  expect: { timeout: 10000 },
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    viewport: { width: 1100, height: 720 },
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 5201 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
  },
})
