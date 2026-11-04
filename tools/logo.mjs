// Détoure les deux rendus 3D du logo : node tools/logo.mjs
// Le mur est estimé localement, l'ombre portée est écartée (elle change la luminosité, pas la teinte du logo).
import sharp from 'sharp'

const ramp = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)))
const lin = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92 }
const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
const lab = (r, g, b) => {
  const R = lin(r), G = lin(g), B = lin(b)
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), y = f(0.2126 * R + 0.7152 * G + 0.0722 * B), z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

// Mur : médiane par cases hors de la zone du logo, puis comblement progressif
function wallGrid(data, w, h) {
  const S = 32, gw = Math.ceil(w / S), gh = Math.ceil(h / S), grid = [new Float32Array(gw * gh), new Float32Array(gw * gh), new Float32Array(gw * gh)], known = new Uint8Array(gw * gh)
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const cx = (gx + 0.5) * S, cy = (gy + 0.5) * S
    if (cx > 120 && cx < 1290 && cy > 170 && cy < 570) continue
    const vals = [[], [], []]
    for (let y = gy * S; y < Math.min(h, (gy + 1) * S); y += 2) for (let x = gx * S; x < Math.min(w, (gx + 1) * S); x += 2) for (let c = 0; c < 3; c++) vals[c].push(data[(y * w + x) * 3 + c])
    for (let c = 0; c < 3; c++) { vals[c].sort((a, b) => a - b); grid[c][gy * gw + gx] = vals[c][vals[c].length >> 1] }
    known[gy * gw + gx] = 1
  }
  for (let it = 0; it < 500; it++) for (let c = 0; c < 3; c++) for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    const i = gy * gw + gx
    if (known[i]) continue
    let s = 0, n = 0
    if (gx > 0) { s += grid[c][i - 1]; n++ } if (gx < gw - 1) { s += grid[c][i + 1]; n++ } if (gy > 0) { s += grid[c][i - gw]; n++ } if (gy < gh - 1) { s += grid[c][i + gw]; n++ }
    grid[c][i] = s / n
  }
  return (x, y, c) => {
    const gx = Math.min(gw - 1.001, Math.max(0, x / S - 0.5)), gy = Math.min(gh - 1.001, Math.max(0, y / S - 0.5)), x0 = gx | 0, y0 = gy | 0, tx = gx - x0, ty = gy - y0, g = grid[c]
    return (g[y0 * gw + x0] * (1 - tx) + g[y0 * gw + x0 + 1] * tx) * (1 - ty) + (g[(y0 + 1) * gw + x0] * (1 - tx) + g[(y0 + 1) * gw + x0 + 1] * tx) * ty
  }
}

// Composantes connexes d'un masque binaire
function components(mask, w, h) {
  const label = new Int32Array(w * h), comps = [], stack = []
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || label[i]) continue
    const id = comps.length + 1
    let area = 0, x0 = w, x1 = 0, y0 = h, y1 = 0
    stack.push(i); label[i] = id
    while (stack.length) {
      const p = stack.pop(), x = p % w, y = (p / w) | 0
      area++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && mask[q] && !label[q]) { label[q] = id; stack.push(q) }
    }
    comps.push({ id, area, x0, x1, y0, y1 })
  }
  return { label, comps }
}

// Alpha brut d'un rendu
async function rawAlpha(file, mode) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width, h = info.height, wall = wallGrid(data, w, h), a = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = i * 3
    const [L, A, B] = lab(data[p], data[p + 1], data[p + 2])
    const [L0, A0, B0] = lab(wall(x, y, 0), wall(x, y, 1), wall(x, y, 2))
    const dC = Math.hypot(A - A0, B - B0), dL = L - L0
    // Mur clair : le logo est coloré ou très sombre ; l'ombre, elle, reste grise
    // Mur bleu : le logo est plus clair que le mur ; l'ombre, elle, est plus sombre
    a[i] = mode === 'light' ? Math.max(ramp(dC, 11, 22), ramp(-dL, 40, 56)) : (dL < -3 ? 0 : Math.max(ramp(dL, 7, 16), ramp(dC, 34, 50)))
  }
  return { data, w, h, wall, a }
}

// Les deux rendus ont la même géométrie : la flamme se détoure net sur le mur clair, les lettres sur le mur bleu.
const SPLIT = 375
const light = await rawAlpha('_raw/logo-light.jpg', 'light'), dark = await rawAlpha('_raw/logo-dark.jpg', 'dark')
const { w, h } = light, a = new Float32Array(w * h)
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; a[i] = x < SPLIT ? light.a[i] : dark.a[i] }

// Garde les vraies formes, rebouche seulement les micro-trous, jette les poussières
const solid = new Uint8Array(w * h)
for (let i = 0; i < a.length; i++) solid[i] = a[i] > 0.5 ? 1 : 0
const { label, comps } = components(solid, w, h)
const keep = new Set(comps.filter((c) => c.area >= 700).map((c) => c.id))
const inv = new Uint8Array(w * h)
for (let i = 0; i < a.length; i++) inv[i] = keep.has(label[i]) ? 0 : 1
const holes = components(inv, w, h)
const small = new Set(holes.comps.filter((c) => c.area <= 90).map((c) => c.id))
const shape = new Uint8Array(w * h)
for (let i = 0; i < a.length; i++) shape[i] = keep.has(label[i]) || small.has(holes.label[i]) ? 1 : 0
const near = new Uint8Array(w * h)
for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
  const i = y * w + x
  if (shape[i] || shape[i - 1] || shape[i + 1] || shape[i - w] || shape[i + w]) near[i] = 1
}
const alpha = new Float32Array(w * h)
let bx0 = w, bx1 = 0, by0 = h, by1 = 0
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = y * w + x
  alpha[i] = shape[i] ? Math.max(a[i], 0.92) : near[i] ? a[i] : 0
  if (alpha[i] > 0.3) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y) }
}
const pad = 3, box = { left: Math.max(0, bx0 - pad), top: Math.max(0, by0 - pad), width: Math.min(w - Math.max(0, bx0 - pad), bx1 - bx0 + pad * 2 + 1), height: Math.min(h - Math.max(0, by0 - pad), by1 - by0 + pad * 2 + 1) }

for (const [src, out] of [[light, 'logo'], [dark, 'logo-w']]) {
  const rgba = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, p = i * 3, q = i * 4, al = alpha[i]
    // Retire la couleur du mur mêlée aux bords
    for (let c = 0; c < 3; c++) {
      const W = src.wall(x, y, c)
      rgba[q + c] = al > 0.02 ? Math.max(0, Math.min(255, (src.data[p + c] - (1 - al) * W) / al)) : W
    }
    rgba[q + 3] = Math.round(al * 255)
  }
  const buf = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).extract(box).png().toBuffer()
  const res = await sharp(buf).resize({ width: 680 }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(`public/media/${out}.webp`)
  console.log(out, `${res.width}x${res.height}`, Math.round(res.size / 1024) + ' Ko', `source ${box.width}x${box.height}`)
  if (out === 'logo') {
    // La flamme seule : la plus grande forme
    const fl = comps.filter((c) => keep.has(c.id)).sort((p, q) => q.area - p.area)[0]
    const side = Math.max(fl.x1 - fl.x0, fl.y1 - fl.y0) + 16
    await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left: Math.max(0, ((fl.x0 + fl.x1) >> 1) - (side >> 1)), top: Math.max(0, ((fl.y0 + fl.y1) >> 1) - (side >> 1)), width: side, height: side })
      .resize(128, 128).png({ compressionLevel: 9 }).toFile('public/favicon.png')
  }
}
