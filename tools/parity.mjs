// Audit de parité : chaque effet doit réellement bouger, sur ordinateur ET sur téléphone.
// Pour chaque effet on lit l'état à la position A puis à la position B : s'il ne change pas, il est mort.
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { readdirSync, mkdtempSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
const base = join(homedir(), '.cache/puppeteer/chrome'), exe = join(base, readdirSync(base).sort().pop(), 'chrome-win64/chrome.exe')
const b = await puppeteer.launch({ executablePath: exe, headless: true, userDataDir: mkdtempSync(join(tmpdir(), 'eco-par-')), args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const U = process.env.U || 'http://localhost:6010/'

// lecture : t=transform o=opacité c=clip-path w=graisse x=texte s=style inline d=dash k=couleur v=visibilité d'un groupe
const read = (spec) => {
  const [kind, sel] = spec
  const e = document.querySelector(sel)
  if (!e) return 'ABSENT'
  const cs = getComputedStyle(e)
  if (kind === 't') return cs.transform
  if (kind === 'o') return cs.opacity
  if (kind === 'c') return cs.clipPath
  if (kind === 'w') return [...document.querySelectorAll(sel)].map((x) => getComputedStyle(x).fontWeight).join(',')
  if (kind === 'x') return e.textContent
  if (kind === 's') return e.getAttribute('style') || ''
  if (kind === 'd') return cs.strokeDashoffset
  if (kind === 'k') return cs.color
  if (kind === 'b') return [...document.querySelectorAll(sel)].map((x) => x.style.getPropertyValue('--wv')).join(',')
  return '?'
}

const SECTIONS = [
  { nom: 'Héros : construction', a: (T) => 0, z: (T) => T.heroEnd * 0.42, fx: [
    ['Graisse « chaleur »', 'w', '.hl-ink .morph .c'], ['Graisse « énergie »', 'w', '.hl-fire .morph .c'], ['Tracé du trait', 'd', '.h-line path'],
    ['Note qui entre en 3D', 't', '.h-rate'], ['Pastille qui surgit', 't', '.h-pill-b'], ['Vignettes en éventail', 't', '.h-thumb:nth-child(2)'],
    ['Zoom de la photo', 't', '.hero-media'], ['Invite qui s’efface', 'o', '.cue'],
  ], pixels: { nom: 'Onde thermique', x: 0.72, y: 0.3 } },
  { nom: 'Héros : recouvrement', a: (T) => T.heroEnd * 0.5, z: (T) => T.heroEnd * 0.97, fx: [
    ['Le héros recule', 't', '.hero'], ['Voile qui fonce', 'o', '.hero-dim'], ['Titre en parallaxe', 't', '.h-title'], ['Note en parallaxe', 't', '.h-rate'],
  ] },
  { nom: 'Intro', a: (T) => T.intro - T.vh * 0.95, z: (T) => T.intro + T.vh * 0.45, fx: [
    ['Phrase : graisse', 'w', '.fill .c'], ['Phrase : couleur', 'k', '.fill .c'], ['Pastille qui s’ouvre', 't', '.pill-flow'],
    ['Carte en 3D', 't', '.n-card'], ['Photo : découpe', 'c', '.notch'], ['Photo : parallaxe', 't', '.notch img'], ['Compteur', 'x', '.n-big span'],
  ] },
  { nom: 'Services : entrée', a: (T) => T.svc - T.vh * 0.95, z: (T) => T.svc, fx: [
    ['Découpe de la scène', 'c', '.svc'], ['Cartes qui arrivent', 't', '.svc-in'], ['Titre : masque', 't', '.svc-head .wi'], ['Titre : graisse', 'w', '.svc-head .c'],
  ] },
  { nom: 'Services : piste', a: (T) => T.svc + 2, z: (T) => T.svc + T.vh * 0.5, fx: [
    ['Piste horizontale', 's', '.svc-track'], ['Carte en 3D', 's', '.svc-card:nth-child(2)'], ['Photo en parallaxe', 's', '.svc-card:nth-child(2) .svc-ph img'], ['Barre de progression', 's', '.svc-bar i'],
  ] },
  { nom: 'Services : recouvrement', a: (T) => T.trust - T.vh, z: (T) => T.trust - 2, fx: [['La scène recule', 't', '.svc'], ['Voile', 'o', '.svc-dim']] },
  { nom: 'Confiance', a: (T) => T.trust - T.vh, z: (T) => T.stats - T.vh * 0.45, fx: [
    ['Bloc en parallaxe', 't', '.trust-block'], ['Photo : découpe', 'c', '.trust-ph'], ['Carte qui monte', 't', '.trust-card'], ['Compteur', 'x', '.big-pct span'], ['Puces', 't', '.feats li'], ['Stats', 't', '.stat'], ['Compteur stats', 'x', '.stat b span'],
  ] },
  { nom: 'En images', a: (T) => T.cases - T.vh * 0.9, z: (T) => T.cases + T.casesH * 0.42, fx: [
    ['Colonne/bande B', 't', '.case-col-b'], ['Colonne/bande C', 't', '.case-col-c'], ['Photo : parallaxe', 't', '.case .par-box img'], ['Photo : découpe', 'c', '.case-col-b .case'],
  ] },
  { nom: 'Méthode : entrée', a: (T) => T.proc - T.vh * 0.95, z: (T) => T.proc, fx: [['Panneau qui grandit', 't', '.proc-panel']] },
  { nom: 'Méthode : cartes', a: (T) => T.proc + 2, z: (T) => T.proc + T.vh * 2.4, fx: [
    ['Carte 1 qui s’envole', 't', '.step:nth-child(1)'], ['Carte 2', 't', '.step:nth-child(2)'], ['Thermostat : bouton', 's', '.dial-knob'], ['Thermostat : degrés', 'x', '.dial-val span'], ['Thermostat : graisse', 's', '.dial-val span'], ['Artisane', 't', '.proc-tech'],
  ] },
  { nom: 'Méthode : recouvrement', a: (T) => T.th - T.vh, z: (T) => T.th - 2, fx: [['La scène recule', 't', '.proc'], ['Voile', 'o', '.proc-dim']] },
  { nom: 'Image thermique', a: (T) => T.th + 2, z: (T) => T.th + T.vh * 1.9, fx: [
    ['Sonde qui traverse', 't', '.th-probe'], ['Valeur de la sonde', 'x', '.th-probe b span'], ['Graisse du titre', 'w', '.morph-line .c'], ['« compte. »', 'o', '.th-title em'], ['Zoom', 't', '.th-media'],
  ], pixels: { nom: 'Onde thermique', x: 0.3, y: 0.4 } },
  { nom: 'Atouts', a: (T) => T.perksCards - T.vh * 0.95, z: (T) => T.perksCards - T.vh * 0.3, fx: [['Paquet qui s’ouvre', 't', '.perk:nth-child(1)'], ['Carte 4', 't', '.perk:nth-child(4)']] },
  { nom: 'Questions', a: (T) => T.faq - T.vh * 0.95, z: (T) => T.faq - T.vh * 0.1, fx: [['Dôme', 't', '.faq-dome'], ['Questions', 't', '.q:nth-child(2)'], ['Étoile', 't', '.spark-a']] },
  { nom: 'Bandeau', a: (T) => T.band - T.vh * 0.8, z: (T) => T.band - T.vh * 0.1, fx: [['Ligne 1', 's', '.band-row:nth-child(1)'], ['Ligne 2', 's', '.band-row:nth-child(2)'], ['Graisse des mots', 'b', '.band-row:nth-child(1) span']] },
  { nom: 'Preuves', a: (T) => T.avis - T.vh * 0.9, z: (T) => T.avis, fx: [['Photo : découpe', 'c', '.avis-ph'], ['Titre : masque', 't', '.avis-side .wi'], ['Photo : parallaxe', 't', '.avis-ph img']] },
  { nom: 'Contact', a: (T) => T.contact - T.vh * 0.95, z: (T) => T.contact + T.vh * 0.1, fx: [['Panneau qui grandit', 't', '.ct-panel'], ['Titre : masque', 't', '.ct-left .wi']] },
  { nom: 'Final', a: (T) => T.cta - T.vh, z: (T) => T.cta, fx: [['Découpe', 'c', '.cta'], ['Zoom du feu', 't', '.cta-v'], ['Degrés', 'x', '.cta-deg span']] },
  { nom: 'Pied de page', a: (T) => T.cta, z: (T) => T.max, fx: [['Thermomètre (valeur)', 'x', '.hud-val span'], ['Thermomètre s’efface', 'o', '.hud']] },
]

const results = {}
const add = (nom, mode, ok) => { (results[nom] ||= {})[mode] = ok }

for (const mode of ['ordi', 'tel']) {
  const p = await b.newPage()
  if (mode === 'tel') await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  else await p.setViewport({ width: 1440, height: 827 })
  await p.goto(U, { waitUntil: 'networkidle2' }); await wait(1800)
  const T = await p.evaluate(() => {
    const top = (s) => { const e = document.querySelector(s); return e.getBoundingClientRect().top + scrollY }
    const w = document.querySelector('.hero-wrap')
    return { vh: innerHeight, max: document.documentElement.scrollHeight - innerHeight, heroEnd: w.offsetHeight - innerHeight, intro: top('.intro'), svc: top('.svc-wrap'), trust: top('.trust'), stats: top('.stats'), cases: top('.cases'), casesH: document.querySelector('.cases').offsetHeight, proc: top('.proc-wrap'), th: top('.th-wrap'), perksCards: top('.perks-cards'), faq: top('.faq'), band: top('.band'), avis: top('.avis'), contact: top('.contact'), cta: top('.cta') }
  })
  const go = async (y) => { await p.evaluate((v) => window.__lenis.scrollTo(v, { immediate: true, force: true }), Math.round(y)); await wait(1250) }
  const shot = async (o) => {
    const png = await p.screenshot({ captureBeyondViewport: false })
    const m = await sharp(png).metadata()
    const s = await sharp(png).extract({ left: Math.round(o.x * m.width), top: Math.round(o.y * m.height), width: 80, height: 80 }).stats()
    return s.channels.slice(0, 3).map((c) => c.mean)
  }
  for (const S of SECTIONS) {
    await go(S.a(T))
    const A = await p.evaluate((fx) => fx.map(([, k, s]) => { const f = eval('(' + window.__read + ')'); return f([k, s]) }).join('\u0001'), S.fx).catch(async () => {
      await p.evaluate((src) => { window.__read = src }, read.toString())
      return p.evaluate((fx) => fx.map(([, k, s]) => { const f = eval('(' + window.__read + ')'); return f([k, s]) }).join('\u0001'), S.fx)
    })
    const pxA = S.pixels ? await shot(S.pixels) : null
    await go(S.z(T))
    const Z = await p.evaluate((fx) => fx.map(([, k, s]) => { const f = eval('(' + window.__read + ')'); return f([k, s]) }).join('\u0001'), S.fx)
    const pxZ = S.pixels ? await shot(S.pixels) : null
    const a = A.split('\u0001'), z = Z.split('\u0001')
    S.fx.forEach(([nom], i) => add(`${S.nom} › ${nom}`, mode, a[i] !== 'ABSENT' && a[i] !== z[i]))
    if (S.pixels) add(`${S.nom} › ${S.pixels.nom} (pixels)`, mode, Math.max(...pxA.map((v, i) => Math.abs(v - pxZ[i]))) > 12)
  }

  // Le feu joue-t-il ?
  await go(T.cta)
  await wait(1500)
  const vid = await p.evaluate(() => { const v = document.querySelector('.cta-v'); return { src: v.currentSrc, playing: !v.paused && v.currentTime > 0 } })
  add('Final › Vidéo du feu qui joue', mode, vid.playing)
  add('Final › Bonne vidéo chargée', mode, mode === 'tel' ? vid.src.includes('/m/') : !vid.src.includes('/m/'))

  // Lettres qui s'épaississent : curseur sur ordinateur, défilement au doigt
  await go(T.svc + 2)
  if (mode === 'ordi') { const r = await p.evaluate(() => { const b = document.querySelector('.svc-head h2').getBoundingClientRect(); return { x: b.left + b.width * 0.3, y: b.top + b.height / 2 } }); await p.mouse.move(r.x, r.y); await wait(500) }
  const prox = await p.evaluate(() => Math.max(...[...document.querySelectorAll('.t .c, .fill .c')].map((c) => +c.style.getPropertyValue('--wp') || 0)))
  add('Titres › Lettres qui réagissent (curseur / défilement)', mode, prox > 0)

  // Panneaux de services : au doigt sur téléphone, à la souris sur ordinateur
  await go(T.svc + T.vh * 0.3); await wait(600)
  const hit = await p.evaluate(() => {
    const cx = innerWidth / 2
    const b = [...document.querySelectorAll('.svc-hit')].map((e) => ({ id: e.dataset.sv, r: e.getBoundingClientRect() })).filter((o) => o.r.left < cx && o.r.right > cx)[0]
    return b && { id: b.id, x: b.r.left + b.r.width / 2, y: b.r.top + b.r.height * 0.5 }
  })
  if (mode === 'tel') await p.touchscreen.tap(hit.x, hit.y); else await p.mouse.click(hit.x, hit.y)
  await wait(260)
  const mid = await p.evaluate(() => { const v = document.querySelector('.sv-page:not([hidden])'); return v ? getComputedStyle(v).clipPath : 'none' })
  await wait(1900)
  const st = (s) => p.evaluate((q) => { const d = document.querySelector('#sv'), g = d.querySelector('.sv-page:not([hidden])'); const f = eval('(' + window.__read + ')'); return { open: d.open, id: g?.dataset.sv, n: d.querySelector('.sv-count b').textContent, scrollable: g ? g.scrollHeight > g.clientHeight : false, wt: g ? getComputedStyle(g.querySelector('.sv-t .c')).fontWeight : 0, it: g ? getComputedStyle(g.querySelector('.sv-it')).opacity : 0, q } }, s)
  const s1 = await st('x')
  add('Panneau › S’ouvre au clic/tap sur la carte', mode, s1.open && s1.id === hit.id)
  add('Panneau › Photo qui s’ouvre depuis la carte', mode, mid !== 'none' && mid !== 'inset(0px)' && !mid.includes('inset(0px 0px 0px 0px'))
  add('Panneau › Lettres et cartes en place', mode, +s1.wt >= 775 && +s1.it > 0.98)
  const layers = () => p.evaluate(() => { const g = document.querySelector('.sv-page:not([hidden])'); return [g.querySelector('.sv-bg img'), g.querySelector('.sv-head'), ...g.querySelectorAll('.sv-items li'), g.querySelector('.sv-next')].map((e) => getComputedStyle(e).transform) })
  const l0 = await layers()
  if (mode === 'tel') {
    // Vrai glissé du doigt (le geste synthétique de Chrome ne fait rien, même sur une page vide)
    const c = await p.createCDPSession()
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 720 }] })
    for (let i = 1; i <= 14; i++) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 720 - (480 * i) / 14 }] }); await wait(18) }
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  } else {
    await p.mouse.move(700, 400); await p.mouse.wheel({ deltaY: 560 })
  }
  await wait(1300)
  const l1 = await layers()
  const moved = l0.map((v, i) => v !== l1[i])
  add('Panneau › Parallaxe photo au défilement', mode, moved[0])
  add('Panneau › Parallaxe du titre', mode, moved[1])
  const liDiff = new Set(l1.slice(2, 6))
  add('Panneau › 4 cartes à 4 vitesses', mode, liDiff.size === 4)
  add('Panneau › Carte « suivant » en mouvement', mode, moved[6])
  await p.evaluate(() => document.querySelector('.sv-nxt').click()); await wait(350)
  const swapMid = await p.evaluate(() => [...document.querySelectorAll('.sv-page:not([hidden])')].length)
  await wait(1700)
  const s2 = await st('x')
  add('Panneau › Passage au service suivant (volet)', mode, swapMid === 2 && s2.id !== hit.id && s2.n === String(+s1.n + 1).padStart(2, '0'))
  add('Panneau › Page figée derrière', mode, await p.evaluate(() => window.__lenis.isStopped))
  const y0 = await p.evaluate(() => scrollY)
  await p.evaluate(() => document.querySelector('.sv-close').click()); await wait(1500)
  const closed = await p.evaluate(() => ({ open: document.querySelector('#sv').open, stopped: window.__lenis.isStopped, top: document.querySelector('.sv-page:not([hidden])') === null }))
  add('Panneau › Se referme, la page reprend', mode, !closed.open && !closed.stopped && closed.top)
  const y1 = await p.evaluate(() => scrollY)
  add('Panneau › Retour sur la bonne carte', mode, await p.evaluate((id) => { const r = document.querySelector(`.svc-hit[data-sv="${id}"]`).getBoundingClientRect(); return r.left < innerWidth && r.right > 0 }, s2.id))

  // Autres déclencheurs
  await p.evaluate(() => document.querySelector('.feat-b[data-sv="gaz"]').click()); await wait(1800)
  add('Panneau › S’ouvre depuis les puces « Confiance »', mode, (await st('x')).id === 'gaz')
  await p.keyboard.press('Escape'); await wait(1400)
  add('Panneau › Échap referme', mode, !(await p.evaluate(() => document.querySelector('#sv').open)))
  await p.evaluate(() => document.querySelector('.ft a[data-sv="ventilation"]').click()); await wait(1800)
  add('Panneau › S’ouvre depuis le pied de page', mode, (await st('x')).id === 'ventilation')
  await p.close()
}

const keys = Object.keys(results)
let badO = 0, badT = 0
const lines = keys.map((k) => {
  const r = results[k]; if (!r.ordi) badO++; if (!r.tel) badT++
  return `${r.ordi ? 'OK ' : 'XX '} ${r.tel ? 'OK ' : 'XX '} ${k}`
})
console.log('ORD TEL  effet')
console.log(process.argv.includes('--tout') ? lines.join('\n') : lines.filter((l) => l.includes('XX')).join('\n') || '(aucun écart)')
console.log(`\n${keys.length} effets contrôlés | manquants ordinateur : ${badO} | manquants téléphone : ${badT}`)
await b.close()
