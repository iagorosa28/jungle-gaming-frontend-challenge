import { expect, test, type Page, type TestInfo } from '@playwright/test'

function compactViewport(info: TestInfo) {
  return info.project.name === 'chromium-390' ? { width: 390, height: 568 }
    : info.project.name === 'chromium-768' ? { width: 768, height: 1024 }
      : { width: 414, height: 896 }
}
async function open(page: Page, info: TestInfo) {
  await page.setViewportSize(compactViewport(info))
  await page.goto('/')
  await expect(page.getByTestId('nft-grid').getByRole('article')).toHaveCount(9)
}
const panel = (page: Page) => page.getByRole('dialog', { name: 'Filtros do catálogo', exact: true })

test('painel sobreposto contém foco e rolagem, fecha por Escape, botão e backdrop e limpa ao redimensionar', async ({ page }, info) => {
  await open(page, info)
  await page.evaluate(() => window.scrollTo(0, 16))
  const trigger = page.getByRole('button', { name: 'Filtros', exact: true })
  const heroBefore = (await page.locator('.catalog-hero').boundingBox())!
  const scrollBefore = await page.evaluate(() => scrollY)
  await trigger.click()
  const dialog = panel(page)
  await expect(dialog).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(dialog.getByRole('button', { name: 'Fechar filtros' })).toBeFocused()
  const heroAfter = (await page.locator('.catalog-hero').boundingBox())!
  expect(heroAfter.y).toBeCloseTo(heroBefore.y, 0)
  expect(await page.evaluate(() => document.body.style.position)).toBe('fixed')
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Ver resultados' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Fechar filtros' })).toBeFocused()
  await page.mouse.move(4, 200)
  await page.mouse.wheel(0, 500)
  expect((await page.locator('.catalog-hero').boundingBox())!.y).toBeCloseTo(heroBefore.y, 0)
  const body = page.locator('.filter-drawer-body')
  const bounds = (await body.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await page.mouse.wheel(0, 700)
  await expect.poll(() => body.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  expect((await page.locator('.catalog-hero').boundingBox())!.y).toBeCloseTo(heroBefore.y, 0)
  const results = dialog.getByRole('button', { name: 'Ver resultados' })
  const footer = (await results.boundingBox())!
  expect(footer.y + footer.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  expect(await results.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) })).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore)
  expect(await page.evaluate(() => document.body.style.position)).toBe('')
  await trigger.click()
  await dialog.getByRole('button', { name: 'Fechar filtros' }).click()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.mouse.click(4, 200)
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Música', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.body.style.position)).toBe('')
  await page.setViewportSize(compactViewport(info))
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(panel(page)).toBeHidden()
  await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('Emerald')
})

test('filtros mantêm URL e precisão com conta autenticada e aviso real de Socket.IO', async ({ page }, info) => {
  await open(page, info)
  await page.evaluate(async () => {
    const session = await (await fetch('/api/session')).json()
    await fetch('/api/session/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mock-Session': session.id }, body: JSON.stringify({ email: 'ana@example.test', password: 'Demo123!' }) })
  })
  await page.reload()
  await expect(page.getByText('Ana Demo', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible()
  await expect(page.getByTestId('market-socket')).toHaveText('Tempo real conectado')
  await page.locator('.hero-art img').evaluateAll(images => Promise.all(images.map(img => (img as HTMLImageElement).decode())))
  const hero = (await page.locator('.catalog-hero').boundingBox())!
  if (page.viewportSize()!.width < 600) {
    const mainArt = (await page.locator('.hero-art > img').first().boundingBox())!
    const companion = (await page.locator('.hero-companion').boundingBox())!
    const title = (await page.locator('#hero-title').boundingBox())!
    expect(companion.y).toBeLessThan(mainArt.y + mainArt.height)
    expect(companion.x + companion.width).toBeLessThanOrEqual(hero.x + hero.width)
    expect(companion.y + companion.height).toBeLessThanOrEqual(hero.y + hero.height)
    expect(title.x + title.width).toBeLessThanOrEqual(mainArt.x)
  }
  await page.getByRole('button', { name: 'Filtros', exact: true }).click()
  const dialog = panel(page)
  await dialog.getByRole('radio', { name: 'Arte digital', exact: true }).check()
  await dialog.getByRole('radio', { name: 'Ethereum', exact: true }).check()
  await dialog.getByLabel('Mínimo (ETH)').fill('1.190000000000000000')
  await dialog.getByLabel('Máximo (ETH)').fill('1.390000000000000001')
  await page.evaluate(async () => { await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'price' }) }) })
  await expect(page.locator('.market-notice')).toContainText('Preço ou disponibilidade atualizados')
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/nfts' && new URL(r.url()).searchParams.get('min') === '1.190000000000000000')
  await dialog.getByRole('button', { name: 'Aplicar preço' }).click()
  const rest = await response
  expect(rest.fromServiceWorker()).toBe(true)
  expect((await rest.json()).total).toBe(2)
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
  await expect(dialog.getByLabel('Máximo (ETH)')).toHaveValue('1.390000000000000001')
  const path = info.outputPath('filters-authenticated.png')
  await page.screenshot({ path, animations: 'disabled' })
  await info.attach('painel com conta e evento Socket.IO', { path, contentType: 'image/png' })
  await dialog.getByRole('button', { name: 'Ver resultados' }).click()
  await expect(page.getByTestId('nft-grid').getByRole('article')).toHaveCount(2)
  await expect(page.getByRole('status').filter({ hasText: 'Preço ou disponibilidade atualizados' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  await expect(page.getByTestId('nft-grid').getByRole('article')).toHaveCount(2)
  await page.getByRole('button', { name: 'Filtros', exact: true }).click()
  await expect(panel(page).getByRole('radio', { name: 'Arte digital', exact: true })).toBeChecked()
  await expect(panel(page).getByLabel('Mínimo (ETH)')).toHaveValue('1.190000000000000000')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Filtros', exact: true })).toBeFocused()
})
