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

test('navegação fixa e painel sobreposto preservam composição', async ({ page }, info) => {
  await page.goto('/')
  await expect(page.getByTestId('nft-grid').getByRole('article')).toHaveCount(9)
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { const img = image as HTMLImageElement; img.loading = 'eager'; return img.decode() })))
  if (page.viewportSize()!.width > 900) {
    await page.getByRole('link', { name: 'Mercado', exact: true }).click()
    await expect(page).toHaveURL(/#colecao$/)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200)
    await expect.poll(() => page.locator('.market-header').evaluate(el => el.getBoundingClientRect().y)).toBe(0)
  } else {
    await page.getByRole('button', { name: 'Filtros', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Filtros do catálogo', exact: true })).toBeVisible()
  }
  const candidate = info.outputPath('navigation-candidate.png')
  await page.screenshot({ path: candidate, animations: 'disabled' })
  await info.attach('navegação atual', { path: candidate, contentType: 'image/png' })
  await expect(page).toHaveScreenshot('catalog-navigation.png', { animations: 'disabled', maxDiffPixels: 0 })
})
