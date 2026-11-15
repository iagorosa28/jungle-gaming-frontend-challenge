import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { profiles } from '../lighthouse.config.mjs'

const { values } = parseArgs({ options: {
  url: { type: 'string', default: 'http://127.0.0.1:4173/spike?scenario=success' },
  profile: { type: 'string', default: 'mobile' },
  runs: { type: 'string', default: '3' },
} })
if (!(values.profile in profiles)) throw new Error('Perfil deve ser mobile ou desktop.')
const runs = Number(values.runs)
if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error('Runs deve ser inteiro entre 1 e 10.')
const directory = resolve('reports/lighthouse', values.profile)
await mkdir(directory, { recursive: true })
const chrome = await launch({ chromeFlags: ['--headless=new'] })
try {
  const measurements = []
  for (let index = 1; index <= runs; index++) {
    const result = await lighthouse(values.url, { port: chrome.port, output: ['html', 'json'], logLevel: 'error' }, profiles[values.profile])
    if (!result) throw new Error('Lighthouse não retornou um relatório.')
    await writeFile(resolve(directory, `run-${index}.html`), result.report[0])
    await writeFile(resolve(directory, `run-${index}.json`), result.report[1])
    const { lhr } = result
    measurements.push({
      lighthouseVersion: lhr.lighthouseVersion,
      environment: lhr.environment,
      fetchTime: lhr.fetchTime,
      url: lhr.finalDisplayedUrl,
      categories: Object.fromEntries(Object.entries(lhr.categories).map(([key, category]) => [key, category.score])),
      lcp: lhr.audits['largest-contentful-paint'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
      tbt: lhr.audits['total-blocking-time'].numericValue,
    })
  }
  const median = (values) => {
    const ordered = [...values].sort((a, b) => a - b)
    const middle = Math.floor(ordered.length / 2)
    return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2
  }
  const summary = {
    purpose: 'Auditoria da página técnica atual; não equivale à avaliação final de início/detalhe.',
    profile: values.profile, runs, node: process.version, platform: process.platform,
    measurements,
    medians: Object.fromEntries(Object.keys(measurements[0].categories).map((key) => [key, median(measurements.map((run) => run.categories[key]))])),
    metrics: Object.fromEntries(['lcp', 'cls', 'tbt'].map((key) => [key, median(measurements.map((run) => run[key]))])),
  }
  await writeFile(resolve(directory, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(`Relatórios gravados em ${directory}`)
} finally {
  await chrome.kill()
}
