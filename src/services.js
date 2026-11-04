// Panneaux de services : la photo de la carte s'ouvre en plein écran.
// Mêmes mouvements sur ordinateur et téléphone : ouverture depuis la carte, lettres, cartes 3D,
// parallaxe au défilement dans le panneau, passage d'un service à l'autre, fermeture vers la carte.
import { splitTitle } from './type.js'

export function setupServices({ gsap, lenis, RM, goTo }) {
  const $ = (s, c = document) => c.querySelector(s)
  const $$ = (s, c = document) => [...c.querySelectorAll(s)]
  const dialog = $('#sv'), pages = $$('.sv-page', dialog)
  const count = $('.sv-count b', dialog), dots = $$('.sv-dots i', dialog)
  const FULL = 'inset(0px 0px 0px 0px round 0px)'
  let cur = -1, opener = null, scrub = null, busy = false, syncCard = null

  pages.forEach((p) => splitTitle($('.sv-t', p)))

  const insetOf = (r) => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 28px)`
  const label = (i) => {
    count.textContent = String(i + 1).padStart(2, '0')
    dots.forEach((d, k) => d.classList.toggle('on', k === i))
  }

  // Apparition du contenu d'un panneau
  const reveal = (page, at = 0.25) => {
    if (RM) return
    const tl = gsap.timeline({ delay: at })
    tl.fromTo($('.sv-ic', page), { scale: 0, rotation: -50 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.8)' }, 0)
      .fromTo($$('.sv-t .c', page), { yPercent: 125, '--ws': 120 }, { yPercent: 0, '--ws': 800, duration: 0.95, stagger: 0.022, ease: 'power4.out' }, 0.03)
      .fromTo($('.sv-line', page), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.32)
      .fromTo($$('.sv-it', page), { y: 96, rotationX: -58, autoAlpha: 0, transformPerspective: 900 }, { y: 0, rotationX: 0, autoAlpha: 1, duration: 0.95, stagger: 0.085, ease: 'power3.out' }, 0.2)
      .fromTo($('.sv-hint', page), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.9)
  }

  // Parallaxe : chaque calque glisse à sa propre vitesse quand on fait défiler le panneau
  const speeds = [70, 210, 130, 280]
  const arm = (page) => {
    if (RM) return null
    return gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { scroller: page, trigger: $('.sv-more', page), start: 'top bottom', end: 'top top', scrub: 0.5 } })
        .fromTo($('.sv-bg img', page), { yPercent: 0, scale: 1 }, { yPercent: -9, scale: 1.14 }, 0)
        .fromTo($('.sv-veil', page), { opacity: 0 }, { opacity: 0.72 }, 0)
        .fromTo($('.sv-head', page), { y: 0, opacity: 1 }, { y: -170, opacity: 0.1 }, 0)
        .fromTo($('.sv-hint', page), { opacity: 1 }, { opacity: 0, duration: 0.12 }, 0)
        .fromTo($$('.sv-items li', page), { y: 0 }, { y: (i) => -speeds[i] }, 0)
        .fromTo($('.sv-q', page), { y: 90, opacity: 0 }, { y: 0, opacity: 1 }, 0.3)
        .fromTo($('.sv-next', page), { y: 150, rotationX: -22, transformPerspective: 1100 }, { y: 0, rotationX: 0 }, 0.2)
        .fromTo($('.sv-next img', page), { yPercent: -10 }, { yPercent: 8 }, 0)
    }, page)
  }

  const show = (i) => {
    const page = pages[i]
    page.hidden = false
    page.scrollTop = 0
    cur = i
    label(i)
  }

  function open(id, from) {
    if (busy || dialog.open) return
    const i = pages.findIndex((p) => p.dataset.sv === id)
    if (i < 0) return
    opener = from
    lenis?.stop()
    dialog.showModal()
    show(i)
    const page = pages[i]
    page.focus({ preventScroll: true })
    if (RM) return
    busy = true
    gsap.set($('.sv-bar', dialog), { autoAlpha: 0, y: -24 })
    gsap.timeline({ onComplete: () => { busy = false; gsap.set(page, { clearProps: 'clipPath' }); scrub = arm(page) } })
      .fromTo(page, { clipPath: insetOf(from.getBoundingClientRect()) }, { clipPath: FULL, duration: 1.05, ease: 'expo.inOut' }, 0)
      .fromTo($('.sv-ph', page), { scale: 1.32 }, { scale: 1, duration: 1.5, ease: 'expo.out' }, 0)
      .to($('.sv-bar', dialog), { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0.7)
    reveal(page, 0.45)
  }

  function finish() {
    pages.forEach((p) => { p.hidden = true; gsap.set(p, { clearProps: 'all' }) })
    dialog.close()
    lenis?.start()
    cur = -1
    busy = false
    opener?.focus({ preventScroll: true })
  }

  function close(then) {
    if (busy || !dialog.open) return
    const page = pages[cur]
    scrub?.revert(); scrub = null
    if (RM) { finish(); then?.(); return }
    busy = true
    // Si le service a changé, la page revient derrière le panneau sur la bonne carte
    const card = $(`.svc-hit[data-sv="${page.dataset.sv}"]`)
    if (opener?.matches('.svc-hit') && opener !== card) { syncCard?.(cur); opener = card }
    const r = opener?.getBoundingClientRect() ?? { top: innerHeight / 2, right: innerWidth / 2, bottom: innerHeight / 2, left: innerWidth / 2 }
    page.scrollTop = 0
    gsap.timeline({ onComplete: () => { finish(); then?.() } })
      .to($('.sv-bar', dialog), { autoAlpha: 0, duration: 0.25 }, 0)
      .to($('.sv-first', page), { autoAlpha: 0, duration: 0.3 }, 0)
      .fromTo(page, { clipPath: FULL }, { clipPath: insetOf(r), duration: 0.85, ease: 'expo.inOut' }, 0.05)
      .to($('.sv-ph', page), { scale: 1.28, duration: 0.85, ease: 'expo.inOut' }, 0.05)
  }

  // D'un service à l'autre : coupe en volet, l'ancien recule à contre-sens
  function go(dir) {
    if (busy || cur < 0) return
    const n = pages.length, old = pages[cur], next = (cur + dir + n) % n, page = pages[next]
    scrub?.revert(); scrub = null
    show(next)
    page.focus({ preventScroll: true })
    if (RM) { old.hidden = true; return }
    busy = true
    gsap.set(page, { zIndex: 2 }); gsap.set(old, { zIndex: 1 })
    gsap.timeline({
      onComplete() {
        old.hidden = true
        gsap.set([old, page], { clearProps: 'all' })
        busy = false
        scrub = arm(page)
      },
    })
      .fromTo(page, { clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.95, ease: 'expo.inOut' }, 0)
      .to(old, { xPercent: dir * -22, duration: 0.95, ease: 'expo.inOut' }, 0)
      .fromTo($('.sv-ph', page), { xPercent: dir * 16, scale: 1.2 }, { xPercent: 0, scale: 1, duration: 1.2, ease: 'expo.out' }, 0.1)
    reveal(page, 0.3)
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-sv]:not(.sv-page)')
    if (!t) return
    e.preventDefault()
    e.stopImmediatePropagation()
    open(t.dataset.sv, t)
  }, true)

  dialog.addEventListener('click', (e) => {
    if (e.target.closest('.sv-close')) return close()
    if (e.target.closest('.sv-prev')) return go(-1)
    if (e.target.closest('.sv-next-go, .sv-nxt')) return go(1)
    const devis = e.target.closest('.sv-devis')
    if (devis) {
      e.preventDefault()
      const msg = $('.ct-form textarea')
      if (msg && !msg.value) msg.value = `Ma demande concerne : ${devis.dataset.name}. `
      close(() => goTo($('#contact'), -$('.nav').offsetHeight))
    }
  })
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close() })
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
  })

  return { setSync: (fn) => { syncCard = fn } }
}
