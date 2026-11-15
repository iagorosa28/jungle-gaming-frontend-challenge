import { expect, test, type Page } from '@playwright/test'

async function openSpike(page: Page) {
  await page.goto('/spike?scenario=success')
  await expect(page.getByTestId('nft-price')).toHaveText('1.19 ETH')
  await expect(page.getByTestId('socket-status')).toHaveText('Conectado')
}

async function emitFromNetwork(page: Page, delivery = 'next') {
  return page.evaluate(async (delivery) => {
    const response = await fetch('/api/spike/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delivery }),
    })
    return response.status
  }, delivery)
}

test('Axios recebe JSON interceptado pelo Service Worker no acesso direto', async ({ page }, testInfo) => {
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/spike?'))
  await page.goto('/spike?scenario=success')
  const response = await responsePromise
  expect(response.status()).toBe(200)
  expect(response.fromServiceWorker()).toBe(true)
  expect(await response.json()).toMatchObject({ source: 'MSW', nft: { priceEth: '1.19', version: 1 } })
  await expect(page.getByTestId('rest-result')).toContainText('Emerald Ape #042')
  await expect(page.getByTestId('nft-price')).toHaveText('1.19 ETH')
  await expect(page.getByTestId('socket-status')).toHaveText('Conectado')
  await testInfo.attach('rest-response.json', { body: JSON.stringify({ interceptedByServiceWorker: response.fromServiceWorker(), status: response.status(), body: await response.json() }, null, 2), contentType: 'application/json' })
})

test('carregamento, HTTP 503, recuperação e cenário na URL', async ({ page }) => {
  await page.goto('/spike?scenario=slow')
  await expect(page.getByRole('status', { name: 'Carregando resposta REST' })).toBeVisible()
  await expect(page.getByTestId('nft-price')).toHaveText('1.19 ETH')
  const failed = page.waitForResponse((response) => response.url().includes('/api/spike?scenario=error'))
  await page.getByRole('link', { name: 'Erro HTTP', exact: true }).click()
  expect((await failed).status()).toBe(503)
  await expect(page.getByRole('alert')).toContainText('Falha na consulta REST')
  const retried = page.waitForResponse((response) => response.url().includes('/api/spike?scenario=error'))
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  expect((await retried).status()).toBe(503)
  await page.getByRole('link', { name: 'Sucesso', exact: true }).click()
  await expect(page.getByTestId('nft-price')).toHaveText('1.19 ETH')
  await expect(page).toHaveURL(/scenario=success/)
  await page.goBack()
  await expect(page).toHaveURL(/scenario=error/)
  await expect(page.getByRole('alert')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('alert')).toBeVisible()
})

test('evento Socket.IO atualiza a evidência e reconcilia o preço por REST', async ({ page }, testInfo) => {
  await openSpike(page)
  const post = page.waitForResponse((response) => response.url().endsWith('/api/spike/events'))
  await page.getByRole('button', { name: 'Emitir atualização' }).click()
  expect((await post).status()).toBe(200)
  await expect(page.getByTestId('socket-event')).toContainText('Evento recebido pelo socket.io-client')
  await expect(page.getByTestId('event-version')).toHaveText('v2')
  await expect(page.getByTestId('nft-price')).toHaveText('1.20 ETH')
  await expect(page.getByTestId('rest-version')).toHaveText('v2')
  await expect(page.getByTestId('event-count')).toHaveText('1')
  const screenshot = testInfo.outputPath('spike-rest-socket.png')
  await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' })
  await testInfo.attach('REST e Socket.IO', { path: screenshot, contentType: 'image/png' })
})

test('duplicatas e versões antigas atravessam o socket sem reaplicar efeitos', async ({ page }) => {
  await openSpike(page)
  await page.getByRole('button', { name: 'Emitir atualização' }).click()
  await expect(page.getByTestId('event-version')).toHaveText('v2')
  expect(await emitFromNetwork(page, 'duplicate')).toBe(200)
  expect(await emitFromNetwork(page, 'stale')).toBe(200)
  await expect(page.getByTestId('ignored-count')).toHaveText('2')
  await expect(page.getByTestId('event-count')).toHaveText('1')
  await expect(page.getByTestId('nft-price')).toHaveText('1.20 ETH')
})

test('reconexão recupera atualização perdida pela API REST', async ({ page }) => {
  await openSpike(page)
  await page.getByRole('button', { name: 'Desconectar', exact: true }).click()
  await expect(page.getByTestId('socket-status')).toHaveText('Desconectado')
  expect(await emitFromNetwork(page)).toBe(200)
  await expect(page.getByTestId('nft-price')).toHaveText('1.19 ETH')
  await page.getByRole('button', { name: 'Reconectar', exact: true }).click()
  await expect(page.getByTestId('socket-status')).toHaveText('Conectado')
  await expect(page.getByTestId('nft-price')).toHaveText('1.20 ETH')
  await expect(page.getByTestId('event-count')).toHaveText('0')
  expect(await emitFromNetwork(page, 'stale')).toBe(200)
  await expect(page.getByTestId('ignored-count')).toHaveText('1')
  await page.getByRole('button', { name: 'Emitir atualização' }).click()
  await expect(page.getByTestId('event-version')).toHaveText('v3')
  await expect(page.getByTestId('nft-price')).toHaveText('1.21 ETH')
})

test('heartbeat mantém a conexão por mais de dois intervalos', async ({ page }) => {
  await page.clock.install()
  await openSpike(page)
  await page.clock.runFor(61_000)
  await expect(page.getByTestId('socket-status')).toHaveText('Conectado')
  await page.getByRole('button', { name: 'Emitir atualização' }).click()
  await page.clock.runFor(500)
  await expect(page.getByTestId('event-version')).toHaveText('v2')
})

test('refresh reseta fixture; layout e acesso por teclado funcionam', async ({ page }) => {
  await openSpike(page)
  await page.getByRole('button', { name: 'Emitir atualização' }).click()
  await expect(page.getByTestId('nft-price')).toHaveText('1.20 ETH')
  await page.reload()
  await expect(page.getByTestId('nft-price')).toHaveText('1.19 ETH')
  await expect(page.getByTestId('event-count')).toHaveText('0')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#conteudo$/)
})

test('rota inicial, cenário inválido e página inexistente', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Todos os NFTs' })).toBeVisible()
  await page.goto('/spike?scenario=invalid')
  await expect(page.getByTestId('nft-price')).toHaveText('1.19 ETH')
  await page.goto('/nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao spike' }).click()
  await expect(page.getByTestId('nft-price')).toHaveText('1.19 ETH')
})
