// La police bouge : Urbanist est variable, chaque lettre a sa propre graisse.
// font-weight = --ws (piloté par le scroll) + --wb (respiration) + --wp (proximité du curseur).

const wrapChars = (text) => [...text].map((ch) => `<span class="c">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')

// Découpe un titre en mots masqués ; les <em> (Instrument Serif, non variable) restent des mots entiers.
export function splitTitle(el) {
  const label = el.textContent.trim().replace(/\s+/g, ' ')
  const out = []
  const words = (text, em) => text.split(/(\s+)/).forEach((part) => {
    if (!part) return
    if (/^\s+$/.test(part)) out.push(' ')
    else out.push(`<span class="w${em ? ' w-em' : ''}"><span class="wi">${em ? part : wrapChars(part)}</span></span>`)
  })
  el.childNodes.forEach((node) => {
    if (node.nodeType === 3) words(node.textContent, false)
    else if (node.tagName === 'EM') words(node.textContent, true)
    else out.push(node.outerHTML)
  })
  el.setAttribute('aria-label', label)
  el.innerHTML = out.join('')
  return { words: [...el.querySelectorAll('.wi')], chars: [...el.querySelectorAll('.c')] }
}

// Fige la largeur des mots à leur graisse finale : une lettre fine ne fait pas remonter un mot à la ligne d'avant.
export function lockWords(root = document) {
  const all = [...root.querySelectorAll('.w')]
  all.forEach((w) => { w.style.minWidth = '' })
  const sizes = all.map((w) => w.getBoundingClientRect().width)
  all.forEach((w, i) => { w.style.minWidth = `${sizes[i]}px` })
}

// Lettres seules, pour un mot que l'on anime à part (héros, titre thermique)
export function splitChars(el) {
  el.innerHTML = wrapChars(el.textContent)
  return [...el.querySelectorAll('.c')]
}

// Proximité : les lettres s'épaississent près du curseur ; au doigt, la vague suit le défilement.
export function proximity(titles, gsap) {
  const touch = matchMedia('(pointer: coarse)').matches
  const active = new Set()
  const pointer = { x: -9999, y: -9999 }
  addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY }, { passive: true })

  const io = new IntersectionObserver((list) => list.forEach((en) => {
    if (en.isIntersecting) active.add(en.target); else active.delete(en.target)
  }), { rootMargin: '10% 0px' })

  const data = new Map()
  titles.forEach((t) => {
    const chars = [...t.querySelectorAll('.c')]
    if (chars.length) { data.set(t, chars.map((el) => ({ el, cur: 0 }))); io.observe(t) }
  })

  const RADIUS = 170, GAIN = 340, vh = () => innerHeight
  gsap.ticker.add(() => {
    active.forEach((t) => {
      const box = t.getBoundingClientRect()
      const px = touch ? box.left + box.width * gsap.utils.clamp(0, 1, 1.15 - box.top / vh()) : pointer.x
      const py = touch ? box.top + box.height / 2 : pointer.y
      const near = !touch && (py < box.top - RADIUS || py > box.bottom + RADIUS)
      data.get(t).forEach((c) => {
        let target = 0
        if (!near) {
          const r = c.el.getBoundingClientRect()
          const dist = Math.hypot(px - (r.left + r.width / 2), touch ? 0 : py - (r.top + r.height / 2))
          target = Math.max(0, 1 - dist / RADIUS) ** 2 * GAIN
        }
        c.cur += (target - c.cur) * 0.16
        const v = Math.abs(c.cur) < 0.5 ? 0 : c.cur
        if (c.last !== Math.round(v)) { c.last = Math.round(v); c.el.style.setProperty('--wp', c.last) }
      })
    })
  })
}
