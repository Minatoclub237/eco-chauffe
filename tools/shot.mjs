// Captures à des positions de scroll : node tools/shot.mjs desk|phone 0,600,1200 [dossier]
// "p12" = 12 % de la page ; "s:.selector" = quand le haut du sélecteur atteint le haut de l'écran
import puppeteer from 'puppeteer-core'
import { readdirSync, mkdirSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
const [mode = 'desk', list = 'p0', out = '_raw/shots'] = process.argv.slice(2)
const base = join(homedir(), '.cache/puppeteer/chrome'), exe = join(base, readdirSync(base).sort().pop(), 'chrome-win64/chrome.exe')
mkdirSync(out, { recursive: true })
const b = await puppeteer.launch({ executablePath: exe, headless: true, userDataDir: mkdtempSync(join(tmpdir(), 'eco-shot-')), args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
const errs = []
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ' ' + m.text().slice(0, 220)) })
p.on('requestfailed', (r) => { if (!/fire|\.mp4/.test(r.url())) errs.push('FAILED ' + r.url()) })
if (mode === 'phone') await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
else await p.setViewport({ width: 1440, height: 827 })
await p.goto(process.env.U || 'http://localhost:6010/', { waitUntil: 'networkidle2', timeout: 60000 })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await wait(1200)
const info = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, vw: innerWidth, sw: document.documentElement.scrollWidth }))
console.log(JSON.stringify(info))
for (const item of list.split(',')) {
  const y = await p.evaluate((it) => {
    const max = document.documentElement.scrollHeight - innerHeight
    if (it.startsWith('p')) return Math.round(max * +it.slice(1) / 100)
    if (it.startsWith('s:')) { const [sel, add = 0] = it.slice(2).split('+'); return Math.round(document.querySelector(sel).getBoundingClientRect().top + scrollY + innerHeight * +add / 100) }
    return +it
  }, item)
  await p.evaluate((v) => { if (window.__lenis) window.__lenis.scrollTo(v, { immediate: true, force: true }); else scrollTo(0, v) }, y)
  await wait(1300)
  const name = `${mode}-${item.replace(/[^\w.+-]/g, '_')}.jpg`
  await p.screenshot({ path: join(out, name), type: 'jpeg', quality: 72 })
  console.log(item, '→', y, name)
}
if (errs.length) console.log('--- ERREURS ---\n' + [...new Set(errs)].join('\n'))
else console.log('aucune erreur console')
await b.close()
