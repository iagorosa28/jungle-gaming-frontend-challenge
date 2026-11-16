import { defineConfig } from '@playwright/test'
import config from './playwright.config'

export default defineConfig({
  ...config,
  projects: [...config.projects!,
    { name: 'chromium-414', use: { ...config.projects![0].use, viewport: { width: 414, height: 896 } } },
    { name: 'chromium-390-short', use: { ...config.projects![0].use, viewport: { width: 390, height: 568 } } },
  ],
  testDir: './tests/visual',
  outputDir: 'test-results/visual',
  snapshotPathTemplate: '{testDir}/snapshots/{platform}/{projectName}/{arg}{ext}',
  updateSnapshots: 'none',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/visual', open: 'never' }]],
})
