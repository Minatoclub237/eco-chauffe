// Fluidité sur téléphone émulé : vrais glissés du doigt de haut en bas, processeur ralenti 4×
import puppeteer from 'puppeteer-core'
import { readdirSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
const base = join(homedir(), '.cache/puppeteer/chrome'), exe = join(base, readdirSync(base).sort().pop(), 'chrome-win64/chrome.exe')
const b = await puppeteer.launch({ executablePath: exe, headless: true, userDataDir: mkdtempSync(join(tmpdir(), 'eco-ft-')), args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto(process.env.U || 'http://localhost:6010/', { waitUntil: 'networkidle2' }); await wait(2500)
const c = await p.createCDPSession()
await c.send('Emulation.setCPUThrottlingRate', { rate: +(process.env.R || 4) })
await p.evaluate(() => { window.__f = []; const f = (t) => { window.__f.push([t, scrollY]); requestAnimationFrame(f) }; requestAnimationFrame(f) })
const t0 = Date.now()
while (Date.now() - t0 < 70000) {
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 700 }] })
  for (let i = 1; i <= 10; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 700 - 50 * i }] }); await wait(14) }
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  if (await p.evaluate(() => scrollY >= document.documentElement.scrollHeight - innerHeight - 5)) break
}
const rows = await p.evaluate(() => {
  const secs = [...document.querySelectorAll('main > *, .end > *')].filter((s) => s.offsetHeight > 5).map((s) => { const was = s.style.position; s.style.position = 'relative'; const r = s.getBoundingClientRect(); s.style.position = was; return { n: s.className.toString().split(' ')[0], a: r.top + scrollY, z: r.bottom + scrollY } })
  return secs.map((s) => { const g = window.__f.filter(([, y]) => y + innerHeight * 0.5 >= s.a && y + innerHeight * 0.5 < s.z); if (g.length < 3) return null; const d = g.slice(1).map((v, i) => v[0] - g[i][0]), tot = g.at(-1)[0] - g[0][0]; return s.n.padEnd(12) + String(Math.round(g.length / tot * 1000)).padStart(4) + ' i/s | pire ' + Math.round(Math.max(...d)) + ' ms' }).filter(Boolean)
})
console.log(rows.join('\n'))
const r = await p.evaluate(() => { const f = window.__f, d = f.slice(1).map((v, i) => v[0] - f[i][0]), tot = f.at(-1)[0] - f[0][0]; return { secondes: Math.round(tot / 1000), moyenne: Math.round(f.length / tot * 1000), lentes: Math.round(d.filter((v) => v > 34).length / d.length * 100) + ' %', pire: Math.round(Math.max(...d)) + ' ms' } })
console.log('TÉLÉPHONE ÉMULÉ (CPU ÷4)', JSON.stringify(r))
await b.close()
