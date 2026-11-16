import { expect, test } from '@playwright/test'

test('home e catálogo preservam composição de referência', async ({ page }, info) => {
  await page.goto('/')
  await expect(page.getByTestId('nft-grid').getByRole('article')).toHaveCount(9)
  await expect(page.getByTestId('market-socket')).toHaveText('Tempo real conectado')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => document.fonts.ready)
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => {
    const artwork = image as HTMLImageElement
    artwork.loading = 'eager'
    return artwork.decode()
  })))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const candidate = info.outputPath('catalog-candidate.png')
  await page.screenshot({ path: candidate, fullPage: true, animations: 'disabled' })
  await info.attach('composição atual', { path: candidate, contentType: 'image/png' })
  const viewport = info.outputPath('catalog-viewport.png')
  await page.screenshot({ path: viewport, animations: 'disabled' })
  await info.attach('viewport atual', { path: viewport, contentType: 'image/png' })
  await expect(page).toHaveScreenshot('catalog-home.png', { fullPage: true, animations: 'disabled', maxDiffPixels: 0 })
})
