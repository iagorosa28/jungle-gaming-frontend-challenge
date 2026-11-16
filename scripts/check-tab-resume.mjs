import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, devices, expect } from '@playwright/test'

// A separate Chromium avoids Playwright's default focus emulation, which keeps
// background documents visible. Only this temporary browser profile is used.
const profileRoot = resolve(tmpdir())
const profile = await mkdtemp(join(profileRoot, 'kurio-tab-resume-'))
const output = resolve('reports/tab-resume')
const baseURL = process.env.TAB_RESUME_BASE_URL ?? 'http://127.0.0.1:4173'
const chrome = spawn(chromium.executablePath(), [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { windowsHide: true, stdio: 'ignore' })
const closed = once(chrome, 'exit')
let browser
try {
  let port
  await expect.poll(async () => {
    port = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').then(text => Number(text.split('\n')[0])).catch(() => undefined)
    return port
  }).toBeTruthy()
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { noDefaults: true })
  const context = browser.contexts()[0]
  const page = context.pages()[0]
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 412, height: 924, deviceScaleFactor: 2.625, mobile: true })
  await cdp.send('Emulation.setUserAgentOverride', { userAgent: devices['Pixel 7'].userAgent })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    window.tabResumeEvents = []
    for (const name of ['visibilitychange', 'freeze', 'resume']) {
      document.addEventListener(name, () => window.tabResumeEvents.push({ name, visibility: document.visibilityState }))
    }
    window.addEventListener('unhandledrejection', event => window.tabResumeEvents.push({ name: 'unhandledrejection', reason: String(event.reason) }))
  })
  await page.goto(`${baseURL}/login?returnTo=%2Fcart`)
  expect(await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual({ width: 412, height: 924 })
  await page.getByLabel('E-mail', { exact: true }).fill('ana@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('Demo123!')
  await page.getByRole('button', { name: 'Entrar e continuar' }).click()
  await expect(page.getByText('Ana Demo', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Início', exact: true }).click()
  await page.getByRole('article').filter({ hasText: 'Emerald Ape #042' }).getByRole('button', { name: 'Adicionar ao carrinho' }).click()
  await expect(page.getByRole('link', { name: 'Carrinho (1)' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('Emerald')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByTestId('nft-grid').getByRole('article')).toHaveCount(4)
  const url = page.url()
  const snapshot = () => page.evaluate(async () => {
    const session = await (await fetch('/api/session')).json()
    const headers = { 'X-Mock-Session': session.id }
    return { session, cart: await (await fetch('/api/cart', { headers })).json(), orders: await (await fetch('/api/orders', { headers })).json() }
  })
  const before = await snapshot()
  const other = await context.newPage()
  for (const duration of [17_000, 500, 500]) {
    await other.bringToFront()
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('hidden')
    await delay(duration)
    await page.bringToFront()
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('visible')
    await expect(page.getByTestId('nft-grid').getByRole('article')).toHaveCount(4)
    await expect(page.getByText('Ana Demo', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Carrinho (1)' })).toBeVisible()
  }
  await other.bringToFront()
  await cdp.send('Page.setWebLifecycleState', { state: 'frozen' })
  await delay(2000)
  await cdp.send('Page.setWebLifecycleState', { state: 'active' })
  await page.bringToFront()
  await expect(page.getByTestId('nft-grid').getByRole('article')).toHaveCount(4)
  await expect(page).toHaveURL(url)
  expect(await snapshot()).toEqual(before)
  await expect(page.getByTestId('market-socket')).toHaveText('Tempo real conectado')
  await page.evaluate(async () => {
    await fetch('/api/demo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'price' }) })
  })
  await expect(page.locator('.market-notice')).toContainText('Preço ou disponibilidade atualizados')
  const events = await page.evaluate(() => window.tabResumeEvents)
  expect(events.filter(event => event.name === 'visibilitychange' && event.visibility === 'hidden')).toHaveLength(4)
  expect(events.some(event => event.name === 'freeze')).toBe(true)
  expect(events.some(event => event.name === 'resume')).toBe(true)
  expect(events.some(event => event.name === 'unhandledrejection')).toBe(false)
  expect(errors).toEqual([])
  expect(await page.evaluate(() => innerWidth)).toBe(412)
  await mkdir(output, { recursive: true })
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(join(output, 'mobile-412.png'), Buffer.from(screenshot.data, 'base64'))
  await writeFile(join(output, 'result.json'), JSON.stringify({ viewport: '412 × 924', browser: browser.version(), events, errors, preserved: ['session', 'cart', 'orders', 'url'], socketEvent: 'nft.updated' }, null, 2))
  console.log(`Troca de abas e suspensão/retomada passaram. Evidências: ${output}`)
} finally {
  await browser?.close()
  chrome.kill()
  await closed
  if (resolve(profile).startsWith(join(profileRoot, 'kurio-tab-resume-'))) {
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 })
  }
}
