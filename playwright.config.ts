import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8082', headless: true, launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : { command: 'npx expo start --web --port 8082 --localhost --max-workers 2', url: 'http://localhost:8082', reuseExistingServer: !process.env.CI, timeout: 120000 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 } } },
    { name: 'small-phone', use: { viewport: { width: 320, height: 740 } } }
  ]
});
