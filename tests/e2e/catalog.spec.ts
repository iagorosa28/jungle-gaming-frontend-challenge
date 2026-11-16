import { expect, test, type Page } from '@playwright/test'

async function control(page: Page, body: unknown) {
  const result = await page.evaluate(async body => {
    const response = await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return response.status
  }, body)
  expect(result).toBe(200)
}
async function open(page: Page, catalog = 'normal') {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Todos os NFTs' })).toBeVisible()
  await control(page, { action: 'reset', scenario: 'success' })
  await control(page, { action: 'network', catalog })
  await page.reload()
}
async function search(page: Page, q: string) {
  await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill(q)
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
}
async function filters(page: Page) {
  const option = page.getByRole('radio', { name: 'Música', exact: true })
  await expect(page.getByRole('heading', { name: 'Todos os NFTs' })).toBeVisible()
  if (page.viewportSize()!.width <= 900) {
    const toggle = page.getByRole('button', { name: 'Filtros', exact: true })
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click()
  }
  await expect(option).toBeVisible()
}
const cards = (page: Page) => page.getByTestId('nft-grid').getByRole('article')

test('busca, categoria, rede e preços combinam parâmetros REST reais e permitem limpar', async ({ page }) => {
  await open(page)
  await search(page, 'Golden')
  await filters(page)
  await page.getByRole('radio', { name: 'Música', exact: true }).check()
  await page.getByRole('radio', { name: 'Ethereum', exact: true }).check()
  await page.getByLabel('Mínimo (ETH)').fill('0.4')
  await page.getByLabel('Máximo (ETH)').fill('1')
  const response = page.waitForResponse(r => { const url = new URL(r.url()); return url.pathname === '/api/nfts' && url.searchParams.get('min') === '0.4' })
  await page.getByRole('button', { name: 'Aplicar preço' }).click()
  const rest = await response
  expect(rest.fromServiceWorker()).toBe(true)
  expect((await rest.json()).total).toBe(2)
  await expect(cards(page)).toHaveCount(2)
  await expect(cards(page).nth(0)).toContainText('Golden Beat #207')
  await expect(cards(page).nth(1)).toContainText('Golden Pulse #777')
  await expect(page.getByRole('list', { name: 'Filtros selecionados' })).toContainText('Música')
  await expect(page).toHaveURL(/category=music/)
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(cards(page)).toHaveCount(9)
  await expect(page.getByRole('status').filter({ hasText: '21 NFTs encontrados' })).toBeVisible()
})

test('ordenação e paginação usam a API e mudanças reiniciam a página', async ({ page }) => {
  await open(page)
  await page.getByLabel('Ordenar NFTs').selectOption('price-asc')
  await expect(cards(page).first()).toContainText('Golden Frequency #301')
  await page.getByRole('button', { name: 'Página 2', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Página 2', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(cards(page).first()).toContainText('Emerald Ape #042')
  await page.getByLabel('Ordenar NFTs').selectOption('price-desc')
  await expect(page.getByRole('button', { name: 'Página 1', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(cards(page).first()).toContainText('Emerald Dawn #900')
  await page.getByRole('button', { name: 'Página 3', exact: true }).click()
  await expect(cards(page)).toHaveCount(3)
  await search(page, 'Nomad')
  await expect(page.getByRole('button', { name: 'Página 1', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(cards(page)).toHaveCount(2)
})

test('URL direta, refresh e histórico restauram busca, filtros e página', async ({ page }) => {
  await open(page)
  await page.goto('/?category=music&network=ethereum&sort=price-asc&page=1&q=Golden&min=0.1&max=1')
  await expect(cards(page)).toHaveCount(2)
  await expect(cards(page).first()).toContainText('Golden Pulse #777')
  await page.reload()
  await expect(page.getByRole('searchbox')).toHaveValue('Golden')
  await filters(page)
  await expect(page.getByRole('radio', { name: 'Música', exact: true })).toBeChecked()
  await expect(page.getByLabel('Máximo (ETH)')).toHaveValue('1')
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(cards(page)).toHaveCount(9)
  await page.getByRole('button', { name: 'Página 2', exact: true }).click()
  await expect(cards(page).first()).toContainText('Emerald Horizon #108')
  await page.goBack()
  await expect(cards(page).first()).toContainText('Emerald Ape #042')
  await page.goBack()
  await expect(cards(page)).toHaveCount(2)
  await expect(page.getByRole('searchbox')).toHaveValue('Golden')
  await page.goForward()
  await expect(cards(page)).toHaveCount(9)
  await page.goForward()
  await expect(page.getByRole('button', { name: 'Página 2', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('valida URL e faixa de preço e representa resultado vazio', async ({ page }) => {
  await open(page)
  await page.goto('/?category=invalid&network=invalid&min=-1&sort=invalid&page=-8&q=')
  await expect(cards(page)).toHaveCount(9)
  await expect(page.getByLabel('Ordenar NFTs')).toHaveValue('recent')
  await filters(page)
  await page.getByLabel('Mínimo (ETH)').fill('2')
  await page.getByLabel('Máximo (ETH)').fill('1')
  await page.getByRole('button', { name: 'Aplicar preço' }).click()
  await expect(page.getByRole('alert')).toContainText('mínimo menor')
  await search(page, 'NFT inexistente')
  await expect(page.getByRole('heading', { name: 'Nenhum NFT encontrado' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Paginação do catálogo' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(cards(page)).toHaveCount(9)
  const statuses = await page.evaluate(async () => Promise.all(['?page=0', '?min=2&max=1', '?network=solana', '?min=invalid&max=1'].map(async params => (await fetch('/api/nfts' + params)).status)))
  expect(statuses).toEqual([400, 400, 400, 400])
})

test('preserva 18 casas decimais na URL e enriquece persistência anterior sem perder carrinho', async ({ page }) => {
  await open(page)
  await page.goto('/?min=0.190000000000000001&max=1.000000000000000001&sort=price-asc')
  await filters(page)
  await expect(page.getByLabel('Mínimo (ETH)')).toHaveValue('0.190000000000000001')
  await expect(cards(page).first()).toContainText('Sage Archive #800')
  await page.reload()
  await filters(page)
  await expect(page.getByLabel('Máximo (ETH)')).toHaveValue('1.000000000000000001')
  await page.evaluate(async () => {
    const session = await (await fetch('/api/session')).json()
    await fetch('/api/cart/items', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Mock-Session': session.id }, body: JSON.stringify({ nftId: 'emerald-042', edition: 'standard', quantity: 2 }) })
    const stored = JSON.parse(localStorage.getItem('jungle.mock.market.v1')!)
    stored.catalog = stored.catalog.filter((n: { id: string }) => ['emerald-042', 'sage-009', 'amber-012'].includes(n.id))
    for (const nft of stored.catalog) { delete nft.category; delete nft.network; delete nft.listedAt; nft.artwork = '/art/emerald.svg' }
    stored.catalog[0].priceEth = '1.49'
    delete stored.networkConditions
    localStorage.setItem('jungle.mock.market.v1', JSON.stringify(stored))
  })
  await page.goto('/')
  await expect(cards(page)).toHaveCount(9)
  await expect(cards(page).first()).toContainText('1.49 ETH')
  await expect(page.getByRole('link', { name: 'Carrinho (2)' })).toBeVisible()
  await expect(cards(page).first().getByRole('img')).toHaveAttribute('src', '/art/nfts/emerald-ape.png')
})

for (const mode of ['http-error', 'network-error']) test(`falha ${mode} tem recuperação sem dados antigos`, async ({ page }) => {
  await open(page, mode)
  await expect(page.getByRole('alert')).toContainText(mode === 'http-error' ? 'temporariamente indisponível' : 'Falha de conexão')
  await expect(page.getByTestId('nft-grid')).toHaveCount(0)
  await control(page, { action: 'network', catalog: 'normal' })
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(cards(page)).toHaveCount(9)
})

test('skeleton, atualização em segundo plano e movimento reduzido', async ({ page }) => {
  await open(page, 'slow')
  await expect(page.getByRole('status', { name: 'Carregando catálogo', exact: true })).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.locator('.nft-grid .skeleton').first().evaluate(el => getComputedStyle(el, '::after').animationName)).toBe('none')
  await expect(cards(page)).toHaveCount(9)
  await expect(page.getByTestId('market-socket')).toHaveText('Tempo real conectado')
  await control(page, { action: 'price' })
  await expect(page.getByRole('status').filter({ hasText: 'Atualizando resultados' })).toBeVisible()
  await expect(cards(page).first()).toContainText('1.29 ETH')
  await page.getByRole('button', { name: 'Desconectar tempo real', exact: true }).click()
  await control(page, { action: 'price', broadcast: false })
  await page.getByRole('button', { name: 'Reconectar tempo real', exact: true }).click()
  await expect(cards(page).first()).toContainText('1.39 ETH')
})

test('descarta resposta atrasada sem mostrar resultados da busca anterior', async ({ page }) => {
  await open(page, 'out-of-order')
  await expect(cards(page)).toHaveCount(9)
  const oldRequest = page.waitForRequest(r => new URL(r.url()).pathname === '/api/nfts' && new URL(r.url()).searchParams.get('q') === 'e')
  await search(page, 'e')
  await oldRequest
  await expect(page.getByTestId('nft-grid')).toHaveCount(0)
  await search(page, 'Emerald')
  await expect(cards(page)).toHaveCount(4)
  await expect(page.getByRole('searchbox')).toHaveValue('Emerald')
  // A REST barrier with the same slow latency resolves after the obsolete request.
  await page.evaluate(async () => { await fetch('/api/nfts?q=e') })
  await expect(cards(page)).toHaveCount(4)
  for (const card of await cards(page).all()) await expect(card).toContainText('Emerald')
})

test('catálogo navega ao detalhe e mantém acesso ao carrinho', async ({ page }) => {
  await open(page)
  await cards(page).filter({ hasText: 'Emerald Ape #042' }).getByRole('link').click()
  await expect(page).toHaveURL(/\/nfts\/emerald-042$/)
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByRole('link', { name: 'Carrinho (1)' })).toBeVisible()
  await page.goto('/nfts/inexistente')
  await expect(page.getByRole('alert')).toContainText('NFT não encontrado')
})

test('layout, assets locais, fonte e teclado nos três viewports', async ({ page }, info) => {
  await open(page)
  await expect(cards(page)).toHaveCount(9)
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.nft-art img').evaluateAll(images => Promise.all(images.map(image => { (image as HTMLImageElement).loading = 'eager'; return (image as HTMLImageElement).decode() })))
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.evaluate(() => document.fonts.check('700 16px "Roboto Mono"'))).toBe(true)
  expect(await page.locator('.hero-art > img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(900)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#conteudo$/)
  const path = info.outputPath('catalog.png')
  await page.screenshot({ path, fullPage: true, animations: 'disabled' })
  await info.attach('catálogo responsivo', { path, contentType: 'image/png' })
})
