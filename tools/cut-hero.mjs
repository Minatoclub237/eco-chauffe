// Calque du technicien, aligné au pixel sur la photo du héros (mêmes dimensions, pas de recadrage)
import sharp from 'sharp'
for (const [src, out, w, h] of [['_raw/hero-cut.png', 'public/media/hero-fg.webp', 2200, 1334], ['_raw/hero-m-cut.png', 'public/media/m/hero-fg.webp', 1080, 1440]]) {
  const { data, info } = await sharp(src).ensureAlpha().resize(w, h, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  for (let i = 3; i < data.length; i += 4) if (data[i] < 90) data[i] = 0
  const r = await sharp(data, { raw: info }).webp({ quality: 80, alphaQuality: 88, effort: 6 }).toFile(out)
  console.log(out, r.width, r.height, Math.round(r.size / 1024) + ' Ko')
}
// Version 1600 px pour les écrans jusqu'à 1600 px à densité 1 : moins de travail pour le processeur graphique
await sharp('public/media/hero-fg.webp').resize(1600).webp({ quality: 80, alphaQuality: 88, effort: 6 }).toFile('public/media/hero-fg-1600.webp')
