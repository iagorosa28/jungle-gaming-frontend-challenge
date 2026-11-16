import { expect, test } from '@playwright/test'

test('home e catálogo preservam composição de referência', async ({ page }) => {
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
  await expect(page).toHaveScreenshot('catalog-home.png', { fullPage: true, animations: 'disabled', maxDiffPixels: 0 })
})
