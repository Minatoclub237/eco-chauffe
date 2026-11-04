import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { thermal } from './thermal.js'
import { setupServices } from './services.js'
import { splitTitle, splitChars, lockWords, proximity } from './type.js'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

const $ = (s, c = document) => c.querySelector(s)
const $$ = (s, c = document) => [...c.querySelectorAll(s)]
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches
const PHONE = matchMedia('(max-width: 900px)')
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches
const clamp = gsap.utils.clamp
const deg = (v) => v.toFixed(1).replace('.', ',')
const vh = () => innerHeight
// « max » désactive un déclencheur tout en bas de page ; celui-ci reste actif jusqu'au bout
const FOREVER = 1e9

/* ---------- Défilement ---------- */
let lenis = null
if (!RM) {
  lenis = new Lenis({ lerp: 0.1 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  window.__lenis = lenis
}

const goTo = (target, offset = 0) => {
  if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 })
  else (typeof target === 'number' ? scrollTo(0, target) : target.scrollIntoView())
}

/* ---------- Ce qui marche même en mouvement réduit ---------- */
function setupMenu() {
  const burger = $('.burger'), menu = $('#menu')
  const set = (open) => {
    menu.hidden = !open
    burger.setAttribute('aria-expanded', open)
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu')
    if (open) lenis?.stop(); else lenis?.start()
  }
  burger.addEventListener('click', () => set(menu.hidden))
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) set(false) })
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false) })
}

function setupAnchors() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]')
    if (!a) return
    e.preventDefault()
    const id = a.getAttribute('href').slice(1)
    if (id === 'top') return goTo(0)
    const el = document.getElementById(id)
    if (!el) return
    // Les étapes épinglées s'arrêtent pile en haut ; les autres sous l'en-tête
    goTo(el, el.matches('.svc-wrap, .proc-wrap') ? 0 : -$('.nav').offsetHeight)
  })
  $('.cue').addEventListener('click', () => {
    const w = $('.hero-wrap')
    goTo((w.offsetHeight - vh()) * 0.5)
  })
}

function setupFaq() {
  const items = $$('.q')
  items.forEach((q) => $('button', q).addEventListener('click', () => {
    const open = !q.classList.contains('is-open')
    items.forEach((o) => { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false') })
    if (open) { q.classList.add('is-open'); $('button', q).setAttribute('aria-expanded', 'true') }
    gsap.delayedCall(0.5, () => ScrollTrigger.refresh())
  }))
}

function setupReviews() {
  const cards = $$('.rv')
  let order = cards.map((_, i) => i), busy = false
  const place = (dur) => order.forEach((idx, pos) => {
    gsap.to(cards[idx], { x: pos * 14, y: pos * -12, scale: 1 - pos * 0.045, rotation: pos * 1.6, zIndex: cards.length - pos, autoAlpha: 1, duration: dur, ease: 'power3.out' })
  })
  place(0)
  $$('.rv-b').forEach((b) => b.addEventListener('click', () => {
    if (busy) return
    busy = true
    const forward = b.dataset.d === '1'
    const top = cards[order[0]]
    if (forward) {
      gsap.to(top, {
        x: '112%', rotation: 12, autoAlpha: 0, duration: 0.42, ease: 'power2.in',
        onComplete() { order.push(order.shift()); gsap.set(top, { zIndex: 0 }); place(0.6); busy = false },
      })
    } else {
      order.unshift(order.pop())
      const incoming = cards[order[0]]
      gsap.set(incoming, { x: '-112%', rotation: -12, autoAlpha: 0, zIndex: cards.length + 1 })
      place(0.6)
      busy = false
    }
  }))
}

function setupForm() {
  const form = $('.ct-form')
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const d = new FormData(form)
    const body = `Nom : ${d.get('nom')}\nTéléphone : ${d.get('tel')}\n\n${d.get('msg')}`
    location.href = `mailto:${form.dataset.mail}?subject=${encodeURIComponent('Demande de devis')}&body=${encodeURIComponent(body)}`
  })
}

setupMenu()
setupAnchors()
setupFaq()
setupReviews()
setupForm()
const services = setupServices({ gsap, lenis, RM, goTo })

if (!RM) motion()

function motion() {
  /* ---------- Empilement : sections figées pendant que la suivante recouvre ---------- */
  $$('main > *').forEach((el, i) => { el.style.zIndex = i + 1 })
  $('.cta').style.zIndex = 30
  $('.ft').style.zIndex = 31

  const stick = (el) => {
    const set = () => { el.style.top = `${Math.min(0, vh() - el.offsetHeight)}px` }
    set()
    new ResizeObserver(set).observe(el)
    addEventListener('resize', set)
  }
  $$('.under').forEach(stick)

  // Une section entièrement recouverte n'a plus à être peinte
  ;[['.intro', '.svc-wrap'], ['.trust', '.cases'], ['.cases', '.proc-wrap'], ['.perks', '.band']].forEach(([el, next]) => {
    ScrollTrigger.create({ trigger: next, start: 'top top', end: FOREVER, toggleClass: { targets: el, className: 'is-gone' } })
  })

  ScrollTrigger.create({ start: 40, end: FOREVER, toggleClass: { targets: '.hdr', className: 'is-stuck' } })

  /* ---------- Boucles décoratives : seulement à l'écran ---------- */
  const liveIO = new IntersectionObserver((list) => list.forEach((en) => en.target.classList.toggle('live', en.isIntersecting)), { rootMargin: '60% 0px' })
  $$('section').forEach((s) => liveIO.observe(s))

  /* ---------- Thermomètre ---------- */
  const hudFill = $('.hud-tube i'), hudVal = $('.hud-val span')
  let hudLast = ''
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate(s) {
      hudFill.style.transform = PHONE.matches ? `scaleX(${s.progress})` : `scaleY(${s.progress})`
      const hv = deg(12 + 9 * s.progress)
      if (hv !== hudLast) { hudLast = hv; hudVal.textContent = hv }
    },
  })

  // Le thermomètre s'efface sur le pied de page : 21° atteints, il laisse la place aux mentions
  ScrollTrigger.create({ trigger: '.ft', start: 'top 88%', end: FOREVER, toggleClass: { targets: '.hud', className: 'is-off' } })

  /* ---------- Titres : mots qui sortent d'un masque, lettres qui prennent du poids ---------- */
  const titles = []
  $$('.t').forEach((el) => {
    const { words, chars } = splitTitle(el)
    titles.push(el)
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: el, start: el.dataset.st || 'top 94%', end: el.dataset.en || 'top 54%', scrub: 0.6 } })
    tl.fromTo(words, { yPercent: 118, rotation: 5 }, { yPercent: 0, rotation: 0, stagger: 0.07, duration: 0.5 }, 0)
    if (chars.length) tl.fromTo(chars, { '--ws': 120 }, { '--ws': 650, stagger: 0.014, duration: 0.42 }, 0.04)
  })

  // Phrase qui se remplit au scroll, pastille qui s'ouvre au milieu
  const fill = $('.fill')
  const { chars: fillChars } = splitTitle(fill)
  titles.push(fill)
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: fill, start: 'top 92%', end: 'top 34%', scrub: 0.6 } })
    .fromTo(fillChars, { '--ws': 200, color: '#C5CCE8' }, { '--ws': 650, color: '#0B084D', stagger: 0.02, duration: 0.3 }, 0)
    .fromTo('.pill-flow', { scaleX: 0 }, { scaleX: 1, duration: 0.3, ease: 'power2.out' }, 0.2)

  proximity(titles, gsap)

  /* ---------- Briques réutilisées ---------- */
  $$('[data-reveal]').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(16% 10% 16% 10% round 32px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 32px)', ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 58%', scrub: 0.6 },
    })
  })
  $$('[data-img]').forEach((img) => {
    gsap.fromTo(img, { yPercent: -9 }, { yPercent: 9, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } })
  })
  $$('[data-rise]').forEach((el) => {
    gsap.fromTo(el, { y: 70, rotationX: 24, autoAlpha: 0, transformPerspective: 900 }, {
      y: 0, rotationX: 0, autoAlpha: 1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 99%', end: 'top 74%', scrub: 0.6 },
    })
  })
  $$('[data-par]:not(.case-col)').forEach((el) => {
    const v = +el.dataset.par
    gsap.fromTo(el, { yPercent: v }, { yPercent: -v, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
  })
  $$('[data-count]').forEach((el) => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0), o = { v: from }
    gsap.to(o, { v: to, ease: 'none', onUpdate: () => { const n = Math.round(o.v); if (n !== o.n) { o.n = n; el.textContent = n } }, scrollTrigger: { trigger: el, start: el.dataset.st || 'top 97%', end: el.dataset.en || 'top 72%', scrub: 0.6 } })
    el.textContent = from
  })

  if (FINE) {
    $$('[data-tilt]').forEach((el) => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' })
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' })
      gsap.set(el, { transformPerspective: 1100 })
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect()
        rx(((e.clientY - r.top) / r.height - 0.5) * -9)
        ry(((e.clientX - r.left) / r.width - 0.5) * 9)
      })
      el.addEventListener('pointerleave', () => { rx(0); ry(0) })
    })
    $$('[data-mag]').forEach((el) => {
      const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' })
      const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' })
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect()
        x((e.clientX - r.left - r.width / 2) * 0.24)
        y((e.clientY - r.top - r.height / 2) * 0.32)
      })
      el.addEventListener('pointerleave', () => { x(0); y(0) })
    })
  }

  /* ---------- Caméra thermique (héros et grande image) ---------- */
  const focusOf = (img) => getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100)
  const armThermal = (root, img, invert, gamma) => {
    const t = thermal($('.thermal-cv', root), img, { focus: focusOf(img), invert, gamma })
    if (!t) return null
    if (img.complete && img.currentSrc) t.load(); else img.addEventListener('load', t.load, { once: true })
    addEventListener('resize', t.fit)
    return t
  }
  const heroTh = armThermal($('.hero'), $('#hero-img'), false)
  const bigTh = armThermal($('.th'), $('#th-img'), true, 2.7)
  let heroOn = true, bigOn = false
  gsap.ticker.add((time) => {
    if (heroOn) heroTh?.draw(time)
    if (bigOn) bigTh?.draw(time)
  })

  /* ---------- Héros : se construit au défilement, puis recule sous la section suivante ---------- */
  // Le trait passe derrière le technicien ; ses coins restent ronds quelle que soit la taille d'écran
  const lineSvg = $('.h-line')
  const drawLine = () => {
    const W = lineSvg.clientWidth, H = lineSvg.clientHeight
    if (!W) return
    const hdr = PHONE.matches ? 0 : $('.hdr').offsetHeight
    const X = (f) => Math.round(W * f), Y = (f) => Math.round(hdr + (H - hdr) * f), r = 26
    const d = PHONE.matches
      ? `M${X(0.2)} ${Y(0.07)} H${X(0.92) - r} q${r} 0 ${r} ${r} V${Y(0.72) - r} q0 ${r} ${-r} ${r} H${X(0.46)}`
      : `M${X(0.5)} ${Y(0.12)} H${X(0.925) - r} q${r} 0 ${r} ${r} V${Y(0.66) - r} q0 ${r} ${-r} ${r} H${X(0.77) + r} q${-r} 0 ${-r} ${r} V${Y(0.88) - r} q0 ${r} ${-r} ${r} H${X(0.67)}`
    lineSvg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    $('path', lineSvg).setAttribute('d', d)
  }
  drawLine()
  addEventListener('resize', drawLine)

  const chaleur = $('.hl-ink .morph'), energie = $('.hl-fire .morph')
  const cA = splitChars(chaleur), cB = splitChars(energie)
  cA.forEach((c) => c.style.setProperty('--ws', chaleur.dataset.from))
  cB.forEach((c) => c.style.setProperty('--ws', energie.dataset.from))
  // Respiration au repos : la police bouge dès le premier regard
  const breathe = gsap.fromTo([...cA, ...cB], { '--wb': 0 }, { '--wb': 90, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: 0.09, from: 'start' } })

  const heroP = { p: 0 }
  const h = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '.hero-wrap', start: 'top top', end: 'bottom bottom', scrub: 0.5,
      onToggle(s) { heroOn = s.isActive },
      onUpdate(s) { breathe.paused(s.progress > 0.01) },
    },
  })
  h.to({}, { duration: 1 }, 0) // 0 → 0,5 : seul à l'écran ; 0,5 → 1 : recouvert
  h.to('.cue', { autoAlpha: 0, y: 12, duration: 0.05 }, 0)
  h.fromTo('.h-line path', { strokeDashoffset: 62 }, { strokeDashoffset: 0, duration: 0.3 }, 0)
  h.fromTo('.h-rate', { autoAlpha: 0, x: 130, rotationY: -46, transformPerspective: 900 }, { autoAlpha: 1, x: 0, rotationY: 0, duration: 0.13, ease: 'power2.out' }, 0.06)
  h.fromTo('.h-pill-b', { autoAlpha: 0, scale: 0.4, y: 30 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.07, ease: 'back.out(2.4)' }, 0.24)
  h.fromTo('.h-thumb:nth-child(1)', { rotation: 0 }, { rotation: -9, y: -6, duration: 0.2 }, 0.02)
  h.fromTo('.h-thumb:nth-child(2)', { rotation: 0, x: 0 }, { rotation: 8, x: 8, y: 5, duration: 0.2 }, 0.02)
  h.fromTo(cA, { '--ws': +chaleur.dataset.from }, { '--ws': +chaleur.dataset.to, stagger: 0.015, duration: 0.16 }, 0.06)
  h.fromTo(cB, { '--ws': +energie.dataset.from }, { '--ws': +energie.dataset.to, stagger: 0.015, duration: 0.16 }, 0.14)
  h.to(heroP, { p: 1, duration: 0.42, onUpdate: () => heroTh?.set(heroP.p) }, 0.08)
  h.fromTo('.hero-media', { scale: 1.08 }, { scale: 1, duration: 0.5 }, 0)
  h.to('.h-title', { y: () => -vh() * 0.2, duration: 0.5 }, 0.5)
  h.to('.h-foot', { y: () => -vh() * 0.34, duration: 0.5 }, 0.5)
  h.to('.h-rate', { y: () => -vh() * 0.42, duration: 0.5 }, 0.5)
  h.to('.h-pill-a', { y: () => -vh() * 0.3, duration: 0.5 }, 0.5)
  h.to('.h-pill-b', { y: () => -vh() * 0.52, duration: 0.5 }, 0.5)
  h.to('.hero', { scale: 0.9, borderRadius: 34, duration: 0.5 }, 0.5)
  h.to('.hero-dim', { opacity: 0.6, duration: 0.5 }, 0.5)

  // Boucle ambiante des pastilles
  gsap.to('.h-pill-a', { rotation: 3, yPercent: -14, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 })

  /* ---------- Services : piste horizontale en 3D ---------- */
  const svcWrap = $('.svc-wrap'), svc = $('.svc'), track = $('.svc-track')
  const cards = $$('.svc-card'), cardImgs = $$('.svc-ph img'), bar = $('.svc-bar i')
  let dist = 0, centers = []
  const svcLayout = () => {
    dist = Math.max(0, track.scrollWidth - innerWidth)
    centers = cards.map((c) => c.offsetLeft + c.offsetWidth / 2)
    // Écran + course (1,25 px de piste par px de scroll) + écran recouvert par la section suivante
    svcWrap.style.height = `${vh() * 2 + dist / 1.25}px`
  }
  const svcRender = (p) => {
    const x = -dist * p
    track.style.transform = `translate3d(${x}px,0,0)`
    cards.forEach((c, i) => {
      const n = (centers[i] + x - innerWidth / 2) / innerWidth
      const a = Math.min(1.4, Math.abs(n))
      c.style.transform = `translate3d(0,${a * a * 80}px,${-a * 280}px) rotateY(${n * -36}deg)`
      cardImgs[i].style.transform = `translate3d(${n * -7}%,0,0)`
    })
    bar.style.transform = `scaleX(${p})`
  }
  svcLayout()
  svcRender(0)
  services.setSync((i) => {
    const st = ScrollTrigger.getById('svc-track')
    const p = clamp(0, 1, (centers[i] - innerWidth / 2) / dist)
    lenis.scrollTo(st.start + (st.end - st.start) * p, { immediate: true, force: true })
    svcRender(p)
  })
  ScrollTrigger.addEventListener('refreshInit', svcLayout)
  ScrollTrigger.create({
    id: 'svc-track', trigger: svcWrap, start: 'top top', end: () => `+=${dist / 1.25}`,
    onUpdate: (s) => svcRender(s.progress),
    onRefresh: (s) => svcRender(s.progress),
  })
  gsap.fromTo(svc, { clipPath: 'inset(9% 5% 0% 5% round 56px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: svcWrap, start: 'top bottom', end: 'top top', scrub: true } })
  gsap.fromTo('.svc-in', { y: 240, rotationX: -26, autoAlpha: 0 }, { y: 0, rotationX: 0, autoAlpha: 1, ease: 'none', stagger: 0.05, scrollTrigger: { trigger: svcWrap, start: 'top 72%', end: 'top 2%', scrub: 0.5 } })
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.trust', start: 'top bottom', end: 'top top', scrub: true } })
    .to(svc, { scale: 0.92, borderRadius: 34 }, 0)
    .to('.svc-dim', { opacity: 0.55 }, 0)

  /* ---------- Réalisations : colonnes à vitesses différentes, bandes sur téléphone ---------- */
  const mm = gsap.matchMedia()
  mm.add('(min-width: 901px)', () => {
    $$('.case-col').forEach((el) => {
      const v = +el.dataset.par
      gsap.fromTo(el, { yPercent: v }, { yPercent: -v, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } })
    })
  })
  mm.add('(max-width: 900px)', () => {
    const row = (sel, fromEnd) => {
      const el = $(sel), d = () => Math.max(0, el.scrollWidth - innerWidth)
      gsap.fromTo(el, { x: () => (fromEnd ? -d() : 0) }, { x: () => (fromEnd ? 0 : -d()), ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom 30%', scrub: true, invalidateOnRefresh: true } })
    }
    row('.case-col-b', false)
    row('.case-col-c', true)
  })

  /* ---------- Méthode : paquet de cartes + thermostat ---------- */
  const steps = $$('.step'), dots = $$('.steps-dots i')
  const ticks = $('.dial-ticks'), TICKS = 54
  const mix = gsap.utils.interpolate('#3E6BF0', '#FF7A3D')
  let tickEls = []
  for (let i = 0; i < TICKS; i++) {
    const a = -135 + (270 * i) / (TICKS - 1)
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    l.setAttribute('x1', 100); l.setAttribute('x2', 100); l.setAttribute('y1', 8); l.setAttribute('y2', i % 9 === 0 ? 24 : 18)
    l.setAttribute('transform', `rotate(${a} 100 100)`)
    l.setAttribute('stroke', mix(i / (TICKS - 1)))
    ticks.append(l)
    tickEls.push(l)
  }
  const knob = $('.dial-knob'), dialVal = $('.dial-val span')
  let lit = -1, lastDeg = -1, lastDot = -1, lastFw = -1
  const dial = (p) => {
    const n = Math.round(p * TICKS)
    if (n !== lit) { tickEls.forEach((t, i) => t.classList.toggle('on', i < n)); lit = n }
    knob.style.transform = `rotate(${-135 + 270 * p}deg)`
    const d = Math.round(12 + 9 * p)
    if (d !== lastDeg) { dialVal.textContent = d; lastDeg = d }
    const fw = Math.round((250 + 600 * p) / 50) * 50
    if (fw !== lastFw) { lastFw = fw; dialVal.style.fontWeight = fw }
    const s = Math.min(steps.length - 1, Math.floor(p * steps.length))
    if (s !== lastDot) { dots.forEach((o, i) => o.classList.toggle('on', i <= s)); lastDot = s }
  }
  dial(0)
  steps.forEach((s, i) => {
    s.style.zIndex = steps.length - i
    gsap.set(s, { y: i * 12, scale: 1 - i * 0.05, transformPerspective: 1200 })
  })
  const pr = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.proc-wrap', start: 'top top', end: () => `+=${vh() * 3}`, scrub: 0.5, onUpdate: (s) => dial(s.progress), onRefresh: (s) => dial(s.progress) },
  })
  pr.to({}, { duration: 4 }, 0)
  steps.slice(0, -1).forEach((s, i) => {
    const at = i + 0.45
    pr.to(s, { y: -60, yPercent: -110, rotationX: 62, rotationZ: i % 2 ? 6 : -6, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, at)
    steps.slice(i + 1).forEach((n, j) => pr.to(n, { y: j * 12, scale: 1 - j * 0.05, duration: 0.6, ease: 'power2.out' }, at))
  })
  pr.fromTo('.proc-tech', { yPercent: 7, scale: 1.05 }, { yPercent: 0, scale: 1, duration: 4 }, 0)
  gsap.fromTo('.proc-panel', { scale: 0.86, y: 60, borderRadius: 72 }, { scale: 1, y: 0, borderRadius: 32, ease: 'none', scrollTrigger: { trigger: '.proc-wrap', start: 'top bottom', end: 'top top', scrub: true } })
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.th-wrap', start: 'top bottom', end: 'top top', scrub: true } })
    .to('.proc', { scale: 0.92, borderRadius: 34 }, 0)
    .to('.proc-dim', { opacity: 0.55 }, 0)

  /* ---------- Grande image thermique : le front révèle la vraie photo ---------- */
  const line = $('.morph-line'), lineChars = splitChars(line)
  lineChars.forEach((c) => c.style.setProperty('--ws', line.dataset.from))
  const probe = $('.th-probe'), probeVal = $('.th-probe b span'), thP = { p: 0 }
  let probeLast = ''
  gsap.set(probe, { x: -220 })
  ScrollTrigger.create({ trigger: '.th-wrap', start: 'top bottom', end: 'bottom top', onToggle: (s) => { bigOn = s.isActive } })
  const big = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.th-wrap', start: 'top top', end: () => `+=${vh() * 2}`, scrub: 0.5 },
  })
  big.to(thP, {
    p: 1, duration: 1,
    onUpdate() {
      bigTh?.set(thP.p)
      gsap.set(probe, { x: (thP.p * 1.4 - 0.2) * innerWidth })
      const pv = deg(12 + 9 * thP.p)
      if (pv !== probeLast) { probeLast = pv; probeVal.textContent = pv }
    },
  }, 0)
  big.fromTo(lineChars, { '--ws': +line.dataset.from }, { '--ws': +line.dataset.to, stagger: 0.03, duration: 0.5 }, 0.05)
  big.fromTo('.th-title em', { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.2 }, 0.55)
  gsap.fromTo('.th-media', { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.th-wrap', start: 'top bottom', end: () => `+=${vh() * 3}`, scrub: true } })
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.perks', start: 'top bottom', end: 'top top', scrub: true } })
    .to('.th', { scale: 0.92, borderRadius: 34 }, 0)
    .to('.th-dim', { opacity: 0.6 }, 0)

  /* ---------- Atouts : le paquet s'ouvre en grille ---------- */
  const perks = $$('.perk'), perkBox = $('.perks-cards')
  const angles = [-14, 8, -6, 12]
  gsap.fromTo(perks,
    {
      x: (i, el) => perkBox.offsetWidth / 2 - (el.offsetLeft + el.offsetWidth / 2),
      y: (i, el) => perkBox.offsetHeight / 2 - (el.offsetTop + el.offsetHeight / 2),
      rotation: (i) => angles[i], scale: 0.84,
    },
    {
      x: 0, y: 0, rotation: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: perkBox, start: 'top 92%', end: 'top 36%', scrub: 0.6, invalidateOnRefresh: true },
    })

  /* ---------- Questions : le dôme s'ouvre ---------- */
  gsap.fromTo('.faq-dome', { scaleX: 0.7 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.faq', start: 'top bottom', end: 'top 25%', scrub: true } })
  gsap.fromTo('.q', { y: 56, autoAlpha: 0, rotationX: -18, transformPerspective: 800 }, { y: 0, autoAlpha: 1, rotationX: 0, ease: 'none', stagger: 0.08, scrollTrigger: { trigger: '.qa', start: 'top 92%', end: 'top 46%', scrub: 0.6 } })
  $$('.spark').forEach((s, i) => gsap.fromTo(s, { y: 70 * (i ? 1 : -1) }, { y: -70 * (i ? 1 : -1), ease: 'none', scrollTrigger: { trigger: '.faq', start: 'top bottom', end: 'bottom top', scrub: true } }))

  /* ---------- Bandeau : glisse au scroll, se penche avec la vitesse, chaque mot gonfle au centre ---------- */
  const rows = $$('.band-row'), bandWords = rows.map((r) => $$('span', r))
  let bandOn = false, skew = 0
  let bandBoxes = null
  let bandSpans = []
  const bandMeasure = () => {
    bandBoxes = bandWords.map((list) => list.map((w) => w.offsetLeft + w.offsetWidth / 2))
    bandSpans = rows.map((r) => r.scrollWidth - innerWidth * 0.8)
  }
  addEventListener('resize', () => { bandBoxes = null })
  const bandRender = (p) => {
    if (!bandBoxes) bandMeasure()
    rows.forEach((r, i) => {
      const dir = +r.dataset.dir, span = bandSpans[i]
      const x = dir < 0 ? -span * p * 0.6 : -span * (0.6 - p * 0.6)
      r.style.transform = `translate3d(${x}px,0,0) skewX(${skew}deg)`
      bandWords[i].forEach((w, k) => {
        const t = 1 - Math.min(1, Math.abs(bandBoxes[i][k] + x - innerWidth / 2) / (innerWidth * 0.55))
        const v = Math.round((180 + 640 * t * t) / 40) * 40
        if (w._v !== v) { w._v = v; w.style.setProperty('--wv', v) }
      })
    })
  }
  const bandST = ScrollTrigger.create({ trigger: '.band', start: 'top bottom', end: 'bottom top', onToggle: (s) => { bandOn = s.isActive } })
  gsap.ticker.add(() => {
    if (!bandOn) return
    const target = clamp(-9, 9, (lenis?.velocity || 0) * -0.28)
    skew += (target - skew) * 0.12
    bandRender(bandST.progress)
  })

  /* ---------- Contact ---------- */
  gsap.fromTo('.ct-panel', { scale: 0.88, y: 70, borderRadius: 72 }, { scale: 1, y: 0, borderRadius: 32, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 25%', scrub: 0.6 } })

  /* ---------- Final : le feu ---------- */
  const v = $('.cta-v')
  const portrait = () => matchMedia('(max-width: 900px) and (orientation: portrait)').matches
  ScrollTrigger.create({
    trigger: '.cta', start: () => `top ${vh() * 2.6}`, once: true,
    onEnter() {
      v.poster = portrait() ? v.dataset.posterM : v.dataset.poster
      v.src = portrait() ? v.dataset.m : v.dataset.src
    },
  })
  ScrollTrigger.create({
    trigger: '.cta', start: 'top bottom', end: FOREVER,
    onToggle: (s) => { if (s.isActive) v.play().catch(() => {}); else v.pause() },
  })
  gsap.fromTo(v, { scale: 1.22 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'top top', scrub: true } })
  gsap.fromTo('.cta', { clipPath: 'inset(0% 4% 0% 4% round 44px 44px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'top 20%', scrub: true } })

  /* ---------- Clavier : même glissé que la molette ---------- */
  let held = 0
  const nudge = (d) => lenis.scrollTo(lenis.targetScroll + d, { lerp: 0.1, programmatic: false })
  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || lenis.isStopped || e.target.closest('input, textarea, select')) return
    const k = e.key, space = k === ' ' && !e.target.closest('button, a')
    const dir = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0
    if (dir) { e.preventDefault(); if (held !== dir) { held = dir; nudge(dir * vh() * 0.08) } }
    else if (k === 'PageDown' || (space && !e.shiftKey)) { e.preventDefault(); nudge(vh() * 0.82) }
    else if (k === 'PageUp' || (space && e.shiftKey)) { e.preventDefault(); nudge(-vh() * 0.82) }
    else if (k === 'Home') { e.preventDefault(); lenis.scrollTo(0, { duration: 1.6 }) }
    else if (k === 'End') { e.preventDefault(); lenis.scrollTo(lenis.limit, { duration: 1.6 }) }
  })
  const release = () => { held = 0 }
  addEventListener('keyup', (e) => { if (e.key.startsWith('Arrow')) release() })
  addEventListener('blur', release)
  gsap.ticker.add((_, dt) => { if (held) nudge(held * vh() * 0.0011 * dt) })

  /* ---------- Une fois les polices là : largeurs figées, positions recalculées ---------- */
  const settle = () => {
    document.documentElement.classList.add('measure')
    lockWords()
    document.documentElement.classList.remove('measure')
    ScrollTrigger.refresh()
  }
  const fonts = ['650 40px "Urbanist Variable"', '400 16px "Inter Variable"', 'italic 400 40px "Instrument Serif"', '500 14px "Monaspace Neon"']
  Promise.all(fonts.map((f) => document.fonts.load(f))).finally(settle)
  addEventListener('load', async () => {
    ScrollTrigger.refresh()
    // Photos décodées d'avance, l'une après l'autre : aucune saccade quand on les atteint au scroll
    await new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 1200 }) : setTimeout(r, 400)))
    for (const img of $$('img')) {
      img.loading = 'eager'
      try { await img.decode() } catch { /* image absente : le navigateur affiche le texte de remplacement */ }
    }
  })
  let resizeTimer
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(settle, 220) })
}
