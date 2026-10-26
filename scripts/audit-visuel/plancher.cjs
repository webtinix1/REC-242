// Audit visuel (3/3) : plancher de mesure. Capture la maquette elle-même (maquette/<zone>/?page=…) dans les mêmes
// conditions que l'intégration et la compare à captures/. L'écart obtenu est celui du seul moteur de rendu
// (anticrénelage, lissage des polices, images redimensionnées) : un écran intégré ne peut pas descendre en dessous.
// SANS_DEMO=1 retire en plus les contrôles « Démo » de la maquette (boutons .demo, bascule « Vue visiteur / Vue membre
// connecté ») : on obtient la maquette telle que l'application doit la rendre, référence des écarts réels.
// Usage : node scripts/audit-visuel/plancher.cjs [racine du dépôt] [dossier de sortie] [filtre]
// ZONES=back-office (ou site,espace-membre,back-office) choisit les zones ; par défaut site et espace-membre.
const path = require('path')
const fs = require('fs')
const { pathToFileURL } = require('url')
const repo = path.resolve(process.argv[2] || '.')
const out = path.resolve(process.argv[3] || path.join(repo, '.audit-visuel', 'maquette'))
const filtre = (process.argv[4] || '').split(',').filter(Boolean)
const { chromium } = require(path.join(repo, 'node_modules', '@playwright', 'test'))

;(async () => {
  const browser = await chromium.launch()
  for (const zone of (process.env.ZONES || 'site,espace-membre').split(',')) {
    fs.mkdirSync(path.join(out, zone), { recursive: true })
    const refs = fs.readdirSync(path.join(repo, 'captures', zone)).filter((f) => f.endsWith('.webp'))
    for (const f of refs) {
      const nom = f.replace('.webp', '')
      if (filtre.length && !filtre.some((x) => nom.startsWith(x))) continue
      const m = /^\d+-(.+)-(ordinateur|mobile)$/.exec(nom)
      if (!m) continue
      const [, page, largeur] = m
      const ctx = await browser.newContext({
        viewport: largeur === 'mobile' ? { width: 390, height: 900 } : { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        locale: 'fr-FR',
        reducedMotion: 'reduce',
      })
      const p = await ctx.newPage()
      const url = pathToFileURL(path.join(repo, 'maquette', zone, 'index.html')).href + '?page=' + page
      await p.goto(url, { waitUntil: 'networkidle' })
      await p.evaluate(async () => {
        await document.fonts.ready
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 60))
        }
        window.scrollTo(0, 0)
      })
      if (process.env.SANS_DEMO)
        await p.evaluate(() => {
          document.querySelectorAll('.demo').forEach((e) => e.remove())
          document.querySelectorAll('.seg').forEach((e) => /Vue visiteur/.test(e.textContent || '') && e.remove())
        })
      await p.waitForTimeout(400)
      await p.screenshot({ path: path.join(out, zone, nom + '.png'), fullPage: true })
      await ctx.close()
    }
  }
  await browser.close()
})()
