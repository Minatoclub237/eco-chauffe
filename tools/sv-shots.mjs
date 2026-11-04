// Captures d'un panneau de service, ordinateur et téléphone : node tools/sv-shots.mjs [dossier]
import puppeteer from 'puppeteer-core'
import { readdirSync, mkdirSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
const out = process.argv[2] || '_raw/sv'
mkdirSync(out, { recursive: true })
const base = join(homedir(), '.cache/puppeteer/chrome'), exe = join(base, readdirSync(base).sort().pop(), 'chrome-win64/chrome.exe')
const b = await puppeteer.launch({ executablePath: exe, headless: true, userDataDir: mkdtempSync(join(tmpdir(), 'eco-sv-')), args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
for (const mode of ['ordi', 'tel']) {
  const p = await b.newPage()
  if (mode === 'tel') await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); else await p.setViewport({ width: 1440, height: 827 })
  await p.goto('http://localhost:6010/', { waitUntil: 'networkidle2' }); await wait(1500)
  const shot = (n) => p.screenshot({ path: join(out, `${mode}-${n}.jpg`), type: 'jpeg', quality: 72, captureBeyondViewport: false })
  await p.evaluate(() => window.__lenis.scrollTo(document.querySelector('.svc-wrap').getBoundingClientRect().top + scrollY + 40, { immediate: true, force: true })); await wait(1300)
  await shot('0-cartes')
  const r = await p.evaluate(() => { const e = document.querySelector('.svc-hit[data-sv="chauffage"]').getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 } })
  if (mode === 'tel') await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y)
  await wait(430); await shot('1-ouverture')
  await wait(1800); await shot('2-ouvert')
  await p.evaluate(() => { document.querySelector('.sv-page:not([hidden])').scrollTop = innerHeight * 0.5 }); await wait(1100); await shot('3-parallaxe')
  await p.evaluate(() => { document.querySelector('.sv-page:not([hidden])').scrollTop = innerHeight * 2 }); await wait(1100); await shot('4-suite')
  await p.evaluate(() => document.querySelector('.sv-nxt').click()); await wait(420); await shot('5-volet')
  await p.close()
}
await b.close()
