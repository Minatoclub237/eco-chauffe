// Recherche de la fiche Google Maps (navigateur standard, sans déguisement) : node tools/gmaps.mjs "requête" [dossier]
import puppeteer from 'puppeteer-core'
import { readdirSync, mkdirSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
const q = process.argv[2], out = process.argv[3] || '_raw/gmaps'
mkdirSync(out, { recursive: true })
const base = join(homedir(), '.cache/puppeteer/chrome'), exe = join(base, readdirSync(base).sort().pop(), 'chrome-win64/chrome.exe')
const b = await puppeteer.launch({ executablePath: exe, headless: true, userDataDir: mkdtempSync(join(tmpdir(), 'eco-gm-')), args: ['--lang=fr-BE'] })
const p = await b.newPage(); await p.setViewport({ width: 1280, height: 900 })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await p.goto(`https://www.google.com/maps/search/${encodeURIComponent(q)}?hl=fr&gl=be`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
await wait(2500)
// Consentement : on refuse si la bannière s'affiche ; sinon on continue
await p.evaluate(() => { const b = [...document.querySelectorAll('button, input[type=submit]')].find((x) => /tout refuser|reject all/i.test(x.innerText || x.value || '')); if (b) b.click() })
await wait(5000)
const info = await p.evaluate(() => ({
  url: location.href.slice(0, 160),
  title: document.title,
  h1: document.querySelector('h1')?.innerText || '',
  list: [...document.querySelectorAll('a.hfpxzc')].slice(0, 8).map((a) => a.getAttribute('aria-label')),
  data: [...document.querySelectorAll('[data-item-id]')].map((e) => `${e.getAttribute('data-item-id').slice(0, 30)} : ${(e.getAttribute('aria-label') || e.innerText || '').replace(/\s+/g, ' ').slice(0, 110)}`).slice(0, 10),
  rating: document.querySelector('div.F7nice')?.innerText?.replace(/\s+/g, ' ') || '',
  cat: document.querySelector('button.DkEaL')?.innerText || '',
}))
console.log(JSON.stringify(info, null, 1))
await p.screenshot({ path: join(out, 'result.jpg'), type: 'jpeg', quality: 60 })
await b.close()
