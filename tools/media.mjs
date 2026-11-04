// Prépare les photos (recadrage + WebP) depuis _raw/ : node tools/media.mjs
// Une ligne = un emplacement du site ; chaque source n'apparaît qu'une fois.
import sharp from 'sharp'
const crop = (left, top, width, height) => ({ left, top, width, height })
const jobs = [
  // nom, source, recadrage (px source) ou null, largeur, hauteur, qualité
  ['hero', '32497161', crop(0, 0, 2600, 1577), 2200, null, 78],
  ['hero-1600', '32497161', crop(0, 0, 2600, 1577), 1600, null, 78],
  ['m/hero', '32497161', crop(1130, 0, 1183, 1577), 1080, 1440, 78],
  ['thumb-a', '39317578', crop(500, 250, 1500, 1500), 480, 480, 76],
  ['thumb-b', '5551188', crop(650, 1500, 1300, 1300), 480, 480, 76],
  ['intro', '16509869', null, 1500, null, 78],
  // Panneaux de services sur ordinateur
  ['sv-chauffage', '7859953', crop(500, 760, 1720, 973), 1720, null, 76],
  ['sv-climatisation', '5463575', crop(650, 1065, 1390, 782), 1600, null, 78],
  ['sv-gaz', '39353208', null, 1920, null, 76],
  ['sv-sanitaire', '29226620', null, 1920, null, 76],
  ['sv-ventilation', '20046693', null, 1920, null, 76],
  ['s-pac', '20046693', crop(650, 250, 1100, 1467), 900, 1200, 76],
  ['s-chaudiere', '7859953', crop(800, 150, 1180, 1573), 900, 1200, 76],
  ['s-radiateur', '29226620', crop(700, 100, 1200, 1600), 900, 1200, 76],
  ['s-clim', '5463575', crop(800, 1000, 900, 847), 900, 847, 76],
  ['s-entretien', '39353208', crop(500, 200, 1300, 1733), 900, 1200, 76],
  ['trust', '8486972', crop(250, 0, 1950, 1950), 1200, 1200, 78],
  ['c-radiateur', '5691536', crop(0, 700, 2537, 2700), 1100, null, 76],
  ['c-tuyaux', '6419128', null, 1100, null, 76],
  ['c-facade', '20046691', crop(0, 100, 2100, 1633), 1100, null, 76],
  ['c-salon', '15558114', null, 1100, null, 76],
  ['thermal', '12644994', null, 2200, null, 78],
  ['m/thermal', '12644994', crop(1475, 0, 795, 1727), 1080, 2346, 76],
  ['avis', '6043981', crop(250, 400, 1600, 2000), 1000, 1250, 76],
]
for (const [out, src, c, w, h, q] of jobs) {
  let s = sharp(`_raw/${src}.jpg`)
  if (c) s = s.extract(c)
  s = s.resize(w, h ?? undefined, { fit: 'cover' }).webp({ quality: q, effort: 6 })
  const info = await s.toFile(`public/media/${out}.webp`)
  console.log(out.padEnd(14), `${info.width}x${info.height}`, Math.round(info.size / 1024) + ' Ko')
}
