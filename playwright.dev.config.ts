import { defineConfig } from '@playwright/test'
import config from './playwright.config'

export default defineConfig({
  ...config,
  outputDir: 'test-results/dev',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/dev', open: 'never' }]],
  webServer: {
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'pipe',
  },
})
