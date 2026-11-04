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
  const all = [...root.querySelectorAll('.t .w, .fill .w')]
  all.forEach((w) => { w.style.width = ''; w.style.height = ''; w.style.contain = '' })
  const sizes = all.map((w) => [w.offsetWidth, w.offsetHeight])
  all.forEach((w, i) => {
    if (!sizes[i][0]) return
    w.style.width = `${sizes[i][0]}px`
    w.style.height = `${sizes[i][1]}px`
    w.style.contain = 'layout size'
  })
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
  // Centre de chaque lettre par rapport au titre : mesuré une fois, à l'arrivée à l'écran
  const measure = (t) => {
    const b = t.getBoundingClientRect()
    data.get(t).forEach((c) => {
      const r = c.el.getBoundingClientRect()
      c.dx = r.left + r.width / 2 - b.left
      c.dy = r.top + r.height / 2 - b.top
    })
    t._w = b.width
    t._h = b.height
    t._docTop = b.top + scrollY
    t._measured = true
  }
  addEventListener('resize', () => titles.forEach((t) => { t._measured = false }))

  let lastKey = ''
  gsap.ticker.add(() => {
    if (!active.size) return
    // Rien n'a bougé et toutes les lettres sont revenues : aucun calcul
    const key = touch ? `${scrollY}` : `${pointer.x},${pointer.y},${scrollY}`
    let moving = key !== lastKey
    lastKey = key
    active.forEach((t) => {
      const list = data.get(t)
      if (!moving && !t._settling) return
      if (!t._measured) measure(t)
      const box = touch ? null : t.getBoundingClientRect()
      const px = touch ? t._w * gsap.utils.clamp(0, 1, 1.15 - (t._docTop - scrollY) / vh()) : pointer.x - box.left
      const py = touch ? 0 : pointer.y - box.top
      // Au doigt, la vague n'a pas bougé d'un pixel utile : on ne recalcule rien
      if (touch && !t._settling && t._px !== undefined && Math.abs(px - t._px) < 5) return
      t._px = px
      const far = !touch && (py < -RADIUS || py > t._h + RADIUS)
      let settling = false
      list.forEach((c) => {
        let target = 0
        if (!far) {
          const dist = touch ? Math.abs(px - c.dx) : Math.hypot(px - c.dx, py - c.dy)
          target = Math.max(0, 1 - dist / RADIUS) ** 2 * GAIN
        }
        c.cur += (target - c.cur) * 0.16
        if (Math.abs(target - c.cur) > 1) settling = true
        const v = Math.round((Math.abs(c.cur) < 0.5 ? 0 : c.cur) / 25) * 25
        if (c.last !== v) { c.last = v; c.el.style.setProperty('--wp', v) }
      })
      t._settling = settling
    })
  })
}
