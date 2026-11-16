import { defineConfig } from '@playwright/test'
import config from './playwright.config'

export default defineConfig({
  ...config,
  testDir: './tests/visual',
  outputDir: 'test-results/visual',
  snapshotPathTemplate: '{testDir}/snapshots/{platform}/{projectName}/{arg}{ext}',
  updateSnapshots: 'none',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/visual', open: 'never' }]],
})
