import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Campus Pulse E2E and Accessibility tests.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: process.env['CI'] ? 'github' : 'list',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Accessibility: use consistent viewport
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start the server before tests
  webServer: {
    command: 'node dist/server.js',
    url: 'http://localhost:3001/api/health',
    // Playwright waits for a successful HTTP response from this URL before running tests
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PORT: '3001',
      NODE_ENV: 'test',
      // Use a dummy key in tests — the offline parser handles extraction without a real key
      GEMINI_API_KEY: process.env['GEMINI_API_KEY'] ?? 'test-placeholder-key',
    },
  },
});
