// Audit visuel (2/2) : compare chaque capture à sa référence (captures/ du dépôt).
// Usage : node compare.cjs [racine du dépôt] [dossier des captures]
// ZONES=back-office (ou site,espace-membre,back-office) choisit les zones ; par défaut site et espace-membre.
// Produit : mesures.json, et pour chaque écran un côte-à-côte réduit (cote/<écran>.webp).
const path = require('path')
const fs = require('fs')
const repo = path.resolve(process.argv[2] || '.')
const dir = path.resolve(process.argv[3] || path.join(repo, '.audit-visuel'))
const sharp = require(path.join(repo, 'node_modules', 'sharp'))

const SEUIL = 40 // écart RVB cumulé au-delà duquel un pixel compte comme différent

async function brut(f, w) {
  const { data, info } = await sharp(f).resize({ width: w }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

function ecart(a, b, w, y0, y1) {
  let diff = 0, n = 0
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])
      if (d > SEUIL) diff++
      n++
    }
  }
  return n ? diff / n : 0
}

;(async () => {
  const mesures = []
  fs.mkdirSync(path.join(dir, 'cote'), { recursive: true })
  for (const zone of (process.env.ZONES || 'site,espace-membre').split(',')) {
    const refs = fs.readdirSync(path.join(repo, 'captures', zone)).filter((f) => f.endsWith('.webp'))
    for (const f of refs) {
      const nom = f.replace('.webp', '')
      if (process.env.FILTRE && !process.env.FILTRE.split(',').some((x) => nom.startsWith(x))) continue
      // REF=<dossier> : compare à un rendu de la maquette (plancher.cjs) au lieu de captures/, pour écarter le bruit du moteur.
      const refF = process.env.REF ? path.join(path.resolve(process.env.REF), zone, nom + '.png') : path.join(repo, 'captures', zone, f)
      const impF = path.join(dir, zone, nom + '.png')
      const largeur = nom.endsWith('mobile') ? 390 : 1440
      const ecranH = nom.endsWith('mobile') ? 844 : 900
      if (!fs.existsSync(impF)) { mesures.push({ ecran: `${zone}/${nom}`, manquant: true }); continue }
      // Cible : premier écran ≤ 2 % de pixels différents, hauteur à ±1 %.
      const a = await brut(refF, largeur)
      const b = await brut(impF, largeur)
      const h = Math.min(a.h, b.h)
      mesures.push({
        ecran: `${zone}/${nom}`,
        hauteurRef: a.h,
        hauteurInt: b.h,
        rapportHauteur: +(b.h / a.h).toFixed(2),
        ecartPremierEcran: +(ecart(a, b, largeur, 0, Math.min(ecranH, h)) * 100).toFixed(1),
        ecartCommun: +(ecart(a, b, largeur, 0, h) * 100).toFixed(1),
      })
      // Côte-à-côte : référence à gauche, intégration à droite, hauteur bornée, réduit.
      const echelle = largeur === 1440 ? 0.5 : 1
      const W = Math.round(largeur * echelle)
      const H = Math.min(Math.round(Math.max(a.h, b.h) * echelle), 6000)
      const prep = async (src) => {
        const { data, info } = await sharp(src).resize({ width: W }).png().toBuffer({ resolveWithObject: true })
        return sharp(data).extract({ left: 0, top: 0, width: info.width, height: Math.min(H, info.height) }).png().toBuffer()
      }
      const [ra, rb] = await Promise.all([prep(refF), prep(impF)])
      await sharp({ create: { width: W * 2 + 24, height: H, channels: 3, background: '#ff00ff' } })
        .composite([{ input: ra, left: 0, top: 0 }, { input: rb, left: W + 24, top: 0 }])
        .webp({ quality: 70 })
        .toFile(path.join(dir, 'cote', `${zone}__${nom}.webp`))
    }
  }
  fs.writeFileSync(path.join(dir, 'mesures.json'), JSON.stringify(mesures, null, 2))
  mesures.sort((x, y) => (y.ecartPremierEcran || 0) - (x.ecartPremierEcran || 0))
  const ok = (m) => !m.manquant && m.ecartPremierEcran <= 2 && Math.abs(m.hauteurInt / m.hauteurRef - 1) <= 0.01
  console.log(`Conformes : ${mesures.filter(ok).length} / ${mesures.length}`)
  for (const m of mesures) console.log(m.manquant ? `${m.ecran}  MANQUANT` : `${m.ecran.padEnd(42)} 1er écran ${String(m.ecartPremierEcran).padStart(5)} %  commun ${String(m.ecartCommun).padStart(5)} %  hauteur ${m.hauteurRef}→${m.hauteurInt} (×${m.rapportHauteur})`)
})()
