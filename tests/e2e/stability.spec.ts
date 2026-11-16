import { expect, test, type Page } from '@playwright/test'

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const session = await (await fetch('/api/session')).json()
    const headers = { 'X-Mock-Session': session.id }
    return {
      session,
      cart: await (await fetch('/api/cart', { headers })).json(),
      orders: await (await fetch('/api/orders', { headers })).json(),
      demo: await (await fetch('/api/demo')).json(),
    }
  })
}

for (const forced of [false, true]) test(`retry recupera o Service Worker e preserva dados e filtros${forced ? ' com falha forçada ativa' : ''}`, async ({ page, context }) => {
  await page.goto('/login?returnTo=%2Fcart')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('Demo123!')
  await page.getByRole('button', { name: 'Entrar e continuar' }).click()
  await expect(page.getByText('Ana Demo', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Início', exact: true }).click()
  await page.getByRole('article').filter({ hasText: 'Emerald Ape #042' }).getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByRole('link', { name: 'Carrinho (1)' })).toBeVisible()
  const before = await snapshot(page)
  if (forced) await page.evaluate(async () => {
    await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'network', catalog: 'network-error' }) })
  })

  const cdp = await context.newCDPSession(page)
  let versions: { versionId: string; scriptURL: string; runningStatus: string }[] = []
  cdp.on('ServiceWorker.workerVersionUpdated', event => { versions = event.versions })
  await cdp.send('ServiceWorker.enable')
  await expect.poll(() => versions.some(worker => worker.scriptURL.endsWith('/mockServiceWorker.js') && worker.runningStatus === 'running')).toBe(true)
  const worker = versions.find(worker => worker.scriptURL.endsWith('/mockServiceWorker.js') && worker.runningStatus === 'running')!
  await cdp.send('ServiceWorker.stopWorker', { versionId: worker.versionId })
  const bypassed = page.waitForResponse(r => new URL(r.url()).pathname === '/api/nfts')
  await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('Emerald')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  expect((await bypassed).status()).toBe(404)
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  const url = page.url()
  let recovered = forced ? undefined : page.waitForResponse(r => new URL(r.url()).pathname === '/api/nfts' && r.status() === 200)
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  if (forced) {
    await expect(page.getByRole('alert')).toContainText('Falha de conexão')
    await expect(page.getByText('Uma falha de rede está forçada', { exact: false })).toBeVisible()
    expect((await snapshot(page)).demo.networkConditions.catalog).toBe('network-error')
    recovered = page.waitForResponse(r => new URL(r.url()).pathname === '/api/nfts' && r.status() === 200)
    await page.getByRole('button', { name: 'Restaurar rede normal', exact: true }).click()
  }
  const response = (await recovered)!
  expect(response.fromServiceWorker()).toBe(true)
  expect(await response.headerValue('content-type')).toContain('application/json')
  await expect(page.getByTestId('nft-grid').getByRole('article')).toHaveCount(4)
  await expect(page).toHaveURL(url)
  expect(await snapshot(page)).toEqual(before)
  await page.evaluate(async () => {
    await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'price' }) })
  })
  await expect(page.locator('.market-notice')).toContainText('Preço ou disponibilidade atualizados')
  // The reactivated worker must also serve later requests, without F5.
  await page.getByRole('link', { name: 'Carrinho (1)' }).click()
  await expect(page.getByLabel('Quantidade de Emerald Ape #042')).toHaveValue('1')
  await expect(page.getByTestId('market-socket')).toHaveText('Tempo real conectado')
})

test('hero mantém apenas Emerald Ape e conteúdo enquadrado nas larguras da entrega', async ({ page }, info) => {
  await page.goto('/')
  await expect(page.getByTestId('nft-grid').getByRole('article')).toHaveCount(9)
  await page.evaluate(() => document.fonts.ready)
  const hero = page.locator('.catalog-hero')
  await expect(hero.locator('img')).toHaveCount(1)
  await expect(hero.getByRole('img')).toHaveAttribute('src', '/art/nfts/emerald-ape.png')
  await hero.getByRole('img').evaluate(image => (image as HTMLImageElement).decode())
  for (const width of [390, 412, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 924 })
    const bounds = (await hero.boundingBox())!
    for (const content of [hero.getByRole('img'), hero.getByRole('heading'), hero.locator('.hero-description'), hero.getByRole('link', { name: 'Explorar' })]) {
      await expect(content).toBeVisible()
      const box = (await content.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(bounds.x)
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1)
      expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await info.attach(`hero-${width}`, { body: await hero.screenshot({ animations: 'disabled' }), contentType: 'image/png' })
  }
})
