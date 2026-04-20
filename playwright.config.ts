import { defineConfig } from '@playwright/test'

// In CI we run against the built production server for realistic, fast
// responses (dev mode JIT compile blows past Playwright's 30s test timeout
// on cold requests). Locally, reuse whatever dev server the developer has
// running, or fall back to `next dev` for convenience.
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : 4,
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    channel: 'chrome',
  },
  webServer: {
    command: isCI ? 'npm run start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
