// Vérifications fonctionnelles : réversibilité du scroll, ancres, menu, questions, avis, formulaire, débordements
import puppeteer from 'puppeteer-core'
import { readdirSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
const base = join(homedir(), '.cache/puppeteer/chrome'), exe = join(base, readdirSync(base).sort().pop(), 'chrome-win64/chrome.exe')
const b = await puppeteer.launch({ executablePath: exe, headless: true, userDataDir: mkdtempSync(join(tmpdir(), 'eco-chk-')), args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const U = process.env.U || 'http://localhost:6010/'
let bad = 0
const ok = (name, pass, extra = '') => { console.log((pass ? 'OK   ' : 'ÉCHEC'), name, extra); if (!pass) bad++ }
const go = (p, y) => p.evaluate((v) => window.__lenis.scrollTo(v, { immediate: true, force: true }), y)

// ---- Ordinateur ----
{
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 827 })
  const errs = []; p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(U, { waitUntil: 'networkidle2' }); await wait(1500)

  // Même position en descendant puis en remontant = même état
  const state = () => p.evaluate(() => JSON.stringify({
    w: getComputedStyle(document.querySelector('.hl-ink .c')).fontWeight,
    rate: getComputedStyle(document.querySelector('.h-rate')).opacity,
    hero: getComputedStyle(document.querySelector('.hero')).transform,
    title: getComputedStyle(document.querySelector('.h-title')).transform,
  }))
  const same = (s) => s.replaceAll('matrix(1, 0, 0, 1, 0, 0)', 'none')
  await go(p, 620); await wait(1400); const down = same(await state())
  await go(p, 1500); await wait(1400)
  await go(p, 620); await wait(1400); const up = same(await state())
  ok('héros réversible (620 px, descente = remontée)', down === up, down === up ? '' : `\n  ${down}\n  ${up}`)

  const svcState = () => p.evaluate(() => document.querySelector('.svc-track').style.transform)
  const svcY = await p.evaluate(() => document.querySelector('.svc-wrap').getBoundingClientRect().top + scrollY + innerHeight * 0.8)
  await go(p, svcY); await wait(1000); const a = await svcState()
  await go(p, svcY + 900); await wait(800); await go(p, svcY); await wait(1000); const c = await svcState()
  ok('piste des services réversible', a === c && a.includes('translate3d(-'), a)

  // Ancres : chaque lien de navigation amène la bonne section à l'écran
  for (const [href, sel] of [['#services', '.svc'], ['#realisations', '.cases'], ['#methode', '.proc'], ['#questions', '.faq'], ['#contact', '.contact']]) {
    await p.evaluate((h) => document.querySelector(`.links a[href="${h}"]`).click(), href)
    await wait(2400)
    const t = await p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) } }, sel)
    ok(`ancre ${href}`, t.top <= 200 && t.bottom > 300, JSON.stringify(t))
  }

  // Questions : une seule ouverte, et la réponse devient visible
  await go(p, await p.evaluate(() => document.querySelector('.faq').getBoundingClientRect().top + scrollY)); await wait(1000)
  await p.evaluate(() => document.querySelectorAll('.q button')[2].click()); await wait(800)
  const faq = await p.evaluate(() => ({ open: document.querySelectorAll('.q.is-open').length, h: document.querySelectorAll('.q .a')[2].getBoundingClientRect().height, exp: document.querySelectorAll('.q button')[2].getAttribute('aria-expanded') }))
  ok('questions : une seule ouverte', faq.open === 1 && faq.h > 20 && faq.exp === 'true', JSON.stringify(faq))

  // Avis : suivant et précédent changent la carte du dessus
  const top = () => p.evaluate(() => [...document.querySelectorAll('.rv')].sort((x, y) => +getComputedStyle(y).zIndex - +getComputedStyle(x).zIndex)[0].querySelector('blockquote').textContent)
  const t0 = await top()
  await p.evaluate(() => document.querySelector('.rv-b[data-d="1"]').click()); await wait(1300); const t1 = await top()
  await p.evaluate(() => document.querySelector('.rv-b[data-d="-1"]').click()); await wait(1000); const t2 = await top()
  ok('avis : suivant / précédent', t0 !== t1 && t2 === t0, `${t0} > ${t1} > ${t2}`)

  // Formulaire : le mailto contient bien ce qui a été saisi
  const mail = await p.evaluate(() => {
    const f = document.querySelector('.ct-form')
    f.nom.value = 'Test Nom'; f.tel.value = '0102030405'; f.msg.value = 'Ma demande'
    let url = ''; const d = Object.getOwnPropertyDescriptor(window, 'location')
    const body = new FormData(f)
    url = `Nom : ${body.get('nom')} / ${body.get('tel')} / ${body.get('msg')} -> ${f.dataset.mail}`
    return { url, valid: f.checkValidity(), d: !!d }
  })
  ok('formulaire valide', mail.valid, mail.url)

  // Fin de page : le pied de page apparaît en entier
  await p.evaluate(() => window.__lenis.scrollTo(document.documentElement.scrollHeight, { immediate: true, force: true })); await wait(1200)
  const ft = await p.evaluate(() => { const r = document.querySelector('.ft').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight } })
  ok('pied de page entier en fin de page', ft.bottom <= ft.vh + 1 && ft.top < ft.vh, JSON.stringify(ft))
  ok('largeur sans débordement (1440)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  ok('aucune erreur JS (ordinateur)', errs.length === 0, errs.join(' | '))
  await p.close()
}

// ---- Pied de page, pages légales, vie privée ----
{
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 827 })
  const hosts = new Set(); p.on('request', (r) => { const u = new URL(r.url()); if (u.protocol.startsWith('http')) hosts.add(u.host) })
  await p.goto(U, { waitUntil: 'networkidle2' }); await wait(1200)
  await p.evaluate(() => window.__lenis.scrollTo(document.documentElement.scrollHeight, { immediate: true, force: true })); await wait(3000)
  const priv = await p.evaluate(() => ({ cookie: document.cookie, ls: localStorage.length, ss: sessionStorage.length }))
  ok('aucun cookie ni stockage', !priv.cookie && !priv.ls && !priv.ss, JSON.stringify(priv))
  ok('aucune requête vers un tiers', [...hosts].every((h) => h.startsWith('localhost')), [...hosts].join(', '))
  const txt = await p.evaluate(() => document.querySelector('.ft').innerText)
  for (const m of ['Youssef Garziad', 'Rue Alphonse Brenez 206', '0664.557.193', 'TVA BE 0664.557.193', '0471 05 38 84', 'garziad@hotmail.com', 'Mentions légales', 'Confidentialité', 'Cookies']) ok('pied de page : ' + m, txt.includes(m))
  const left = await p.evaluate(() => document.documentElement.outerHTML.match(/votre-domaine|00 00 00 00 00|À confirmer|\+33/g))
  ok('plus aucun contenu provisoire', !left, String(left))
  for (const path of ['mentions-legales.html', 'confidentialite.html']) {
    const r = await p.goto(U + path, { waitUntil: 'networkidle2' })
    const t = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, over: document.documentElement.scrollWidth > innerWidth }))
    ok('page ' + path, r.status() === 200 && !!t.h1 && !t.over, t.h1)
  }
  for (const w of [1190, 1280, 1366]) {
    await p.setViewport({ width: w, height: 800 }); await p.goto(U, { waitUntil: 'networkidle2' }); await wait(500)
    const n = await p.evaluate(() => { const r = document.querySelector('.nav'); const c = [...r.children].map((e) => e.getBoundingClientRect()); return { over: r.scrollWidth > r.clientWidth + 1 || c.some((x) => x.right > innerWidth), tall: Math.max(...c.map((x) => x.height)) } })
    ok('en-tête sur une ligne à ' + w + ' px', !n.over && n.tall < 70, JSON.stringify(n))
  }
  await p.close()
}

// ---- Logos et version anglaise ----
for (const [mode, vp] of [['ordi', { width: 1440, height: 827 }], ['tel', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const p = await b.newPage(); await p.setViewport(vp)
  const errs = []; p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(U + 'en/', { waitUntil: 'networkidle2' }); await wait(1300)
  const e = await p.evaluate(() => ({
    lang: document.documentElement.lang,
    logo: document.querySelector('.hdr .logo img').currentSrc,
    logoOk: document.querySelector('.hdr .logo img').naturalWidth > 0,
    foot: document.querySelector('.ft .logo img').currentSrc,
    h1: document.querySelector('h1').getAttribute('aria-label'),
    cur: document.querySelector('.lang [aria-current]').textContent,
    over: document.documentElement.scrollWidth > innerWidth,
    hud: document.querySelector('.hud-val span').textContent,
  }))
  ok('EN ' + mode + ' : page anglaise', e.lang === 'en' && e.cur === 'EN' && e.h1 === 'More warmth, less energy.', e.h1)
  ok('EN ' + mode + ' : logos clair et bleu', e.logoOk && e.logo.includes('/logo.webp') && e.foot.includes('/logo-w.webp'))
  ok('EN ' + mode + ' : largeur sans débordement', !e.over)
  ok('EN ' + mode + ' : décimale anglaise', e.hud.includes('.'), e.hud)
  // Bascule au milieu de la page : on reste au même endroit, et retour
  const y = await p.evaluate(() => { const v = (document.documentElement.scrollHeight - innerHeight) * 0.4; window.__lenis.scrollTo(v, { immediate: true, force: true }); return v }); await wait(900)
  const nav = p.waitForNavigation({ waitUntil: 'networkidle2' })
  await p.evaluate(() => document.querySelector('.lang a[lang="fr"]').click()); await nav; await wait(1700)
  const s = await p.evaluate(() => ({ lang: document.documentElement.lang, y: scrollY, frac: scrollY / (document.documentElement.scrollHeight - innerHeight), hash: location.hash, op: getComputedStyle(document.body).opacity }))
  ok('Bascule ' + mode + ' EN > FR au même endroit', s.lang === 'fr-BE' && Math.abs(s.frac - 0.4) < 0.02 && s.hash === '' && s.op === '1', JSON.stringify(s))
  // Un panneau de service en anglais
  await p.goto(U + 'en/', { waitUntil: 'networkidle2' }); await wait(900)
  await p.evaluate(() => document.querySelector('.ft a[data-sv="gaz"]').click()); await wait(1800)
  const sv = await p.evaluate(() => { const g = document.querySelector('.sv-page:not([hidden])'); return { t: g.querySelector('.sv-t').getAttribute('aria-label'), q: g.querySelector('.sv-q h3').textContent } })
  ok('EN ' + mode + ' : panneau traduit', sv.t === 'Gas' && sv.q.includes('gas'), JSON.stringify(sv))
  for (const path of ['en/legal-notice.html', 'en/privacy.html', 'mentions-legales.html']) {
    const r = await p.goto(U + path, { waitUntil: 'networkidle2' })
    const t = await p.evaluate(() => ({ h1: document.querySelector('h1').textContent, logo: document.querySelector('.logo img')?.naturalWidth > 0, sw: !!document.querySelector('.lang'), over: document.documentElement.scrollWidth > innerWidth }))
    ok(mode + ' ' + path, r.status() < 400 && t.logo && t.sw && !t.over, t.h1)
  }
  ok('EN ' + mode + ' : aucune erreur JS', errs.length === 0, errs.join(' | '))
  await p.close()
}
{
  const p = await b.newPage()
  for (const page of ['', 'en/']) for (const w of [1190, 1280, 1366, 1440]) {
    await p.setViewport({ width: w, height: 800 }); await p.goto(U + page, { waitUntil: 'networkidle2' }); await wait(350)
    const n = await p.evaluate(() => { const r = document.querySelector('.nav'), c = [...r.children].filter((e) => e.offsetParent !== null).map((e) => e.getBoundingClientRect()); return { over: c.some((x) => x.right > innerWidth - 8), tall: Math.max(...c.map((x) => x.height)), touch: c.slice(1).some((x, i) => x.left < c[i].right - 1) } })
    ok(`en-tête ${page || 'fr'} à ${w} px`, !n.over && n.tall < 70 && !n.touch, JSON.stringify(n))
  }
  await p.close()
}

// ---- Téléphone ----
{
  const p = await b.newPage(); await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const errs = []; p.on('pageerror', (e) => errs.push(e.message))
  const reqs = []; p.on('request', (r) => reqs.push(r.url()))
  await p.goto(U, { waitUntil: 'networkidle2' }); await wait(1500)

  ok('héros : la photo portrait est chargée, pas la grande', reqs.some((u) => u.includes('/media/m/hero.webp')) && !reqs.some((u) => /\/media\/hero\.webp/.test(u)))
  await p.evaluate(() => document.querySelector('.burger').click()); await wait(300)
  ok('menu : s\'ouvre', await p.evaluate(() => !document.getElementById('menu').hidden))
  await p.evaluate(() => document.querySelector('#menu a[href="#contact"]').click()); await wait(2600)
  const m = await p.evaluate(() => ({ closed: document.getElementById('menu').hidden, top: Math.round(document.querySelector('.contact').getBoundingClientRect().top) }))
  ok('menu : se ferme et mène au contact', m.closed && m.top < 200, JSON.stringify(m))
  ok('largeur sans débordement (390)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), String(await p.evaluate(() => document.documentElement.scrollWidth)))

  // Tailles de texte : aucun texte visible sous 12 px (hors décor)
  const small = await p.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && e.textContent.trim() && e.offsetParent !== null && !e.closest('[aria-hidden="true"]') && parseFloat(getComputedStyle(e).fontSize) < 12.5).map((e) => e.tagName + ':' + e.textContent.trim().slice(0, 24)).slice(0, 6))
  ok('aucun texte sous 12,5 px', small.length === 0, small.join(', '))
  ok('aucune erreur JS (téléphone)', errs.length === 0, errs.join(' | '))
  await p.close()
}
console.log(bad ? `\n${bad} ÉCHEC(S)` : '\nTout est bon')
await b.close()
