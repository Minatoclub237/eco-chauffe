// Détourage du technicien : seuille les fantômes semi-transparents, recadre sur le sujet, WebP avec alpha
import sharp from 'sharp'
const src = sharp('_raw/tech-cut.png').ensureAlpha()
const { data, info } = await src.raw().toBuffer({ resolveWithObject: true })
for (let i = 3; i < data.length; i += 4) if (data[i] < 90) data[i] = 0
const clean = await sharp(data, { raw: info }).png().toBuffer()
const t = await sharp(clean).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })
console.log('sujet', t.info.width, t.info.height)
const out = await sharp(t.data).resize({ height: 1300, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile('public/media/tech.webp')
console.log(out.width, out.height, Math.round(out.size / 1024) + ' Ko')
