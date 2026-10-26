// Audit visuel (back-office) : capture pleine page des 22 écrans de l'admin à 1440 et 390 px, comme captures/back-office/.
// Usage : pnpm audit:bo (serveur sur http://localhost:3000, de préférence next build + next start).
// Options : node capture-bo.cjs [racine du dépôt] [dossier de sortie] [filtre, ex. 03-candidatures,04-candidature]
// Compte : ange.mouandza@rec242.test (super administrateur de démonstration). Les écrans de détail ouvrent
// l'enregistrement que montre la maquette, retrouvé par numéro ou par titre avec l'API REST authentifiée.
const path = require('path')
const fs = require('fs')
const repo = path.resolve(process.argv[2] || '.')
const out = path.resolve(process.argv[3] || path.join(repo, '.audit-visuel'))
const filtre = (process.argv[4] || '').split(',').filter(Boolean)
const garder = (nom) => !filtre.length || filtre.some((x) => nom.startsWith(x))
const { chromium } = require(path.join(repo, 'node_modules', '@playwright', 'test'))
const BASE = 'http://localhost:3000'
const EMAIL = process.env.AUDIT_BO_EMAIL || 'ange.mouandza@rec242.test'
const PWD = 'Rec242-demo-2026'

// [nom, route ou résolveur, connecté]
const ECRANS = [
  ['01-connexion', '/admin/login', false],
  ['02-tableau', '/admin', true],
  ['03-candidatures', '/admin/collections/applications', true],
  ['04-candidature', { collection: 'applications', ou: { numero: 41 } }, true],
  ['05-membres', '/admin/collections/members', true],
  ['06-membre', { collection: 'members', ou: { numeroAdherent: 'REC-2026-0137' } }, true],
  ['07-evenements', '/admin/collections/events', true],
  ['08-evenement', { collection: 'events', ou: { titre: 'Afterwork des entrepreneurs de Brazzaville' } }, true],
  ['09-actualites', '/admin/collections/news', true],
  ['10-editeur', { collection: 'news', ou: { titre: 'Les adhésions bientôt ouvertes en ligne' } }, true],
  ['11-opportunites', '/admin/collections/opportunities', true],
  ['12-cotisations', '/admin/cotisations', true],
  ['13-messages', '/admin/collections/contactMessages', true],
  ['14-contenus', '/admin/collections/pages', true],
  ['15-parametres', '/admin/globals/settings', true],
  ['16-utilisateurs', '/admin/collections/users', true],
  ['17-journal', '/admin/collections/auditLog', true],
  ['18-documents', '/admin/collections/documents', true],
  ['19-commissions', '/admin/collections/commissions', true],
  ['20-opportunite', { collection: 'opportunities', ou: { titre: 'Fourniture d’équipements informatiques' } }, true],
  ['21-demandes', '/admin/collections/expertRequests', true],
  ['22-page', { collection: 'pages', ou: { title: 'Antennes' } }, true],
]
const LARGEURS = [['ordinateur', 1440, 900], ['mobile', 390, 900]]

async function defiler(page) {
  await page.evaluate(async () => {
    const h = () => document.documentElement.scrollHeight
    for (let y = 0; y < h(); y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(800)
}

async function resoudre(api, token, { collection, ou }) {
  const [champ, valeur] = Object.entries(ou)[0]
  // Les titres peuvent être localisés ou légèrement différents : on cherche d'abord exact, puis « contient ».
  for (const op of ['equals', 'like']) {
    const r = await api.get(`${BASE}/api/${collection}?limit=1&depth=0&where[${champ}][${op}]=${encodeURIComponent(valeur)}`, { headers: { Authorization: `JWT ${token}` } })
    const j = await r.json().catch(() => ({}))
    if (j.docs && j.docs[0]) return `/admin/collections/${collection}/${j.docs[0].id}`
  }
  return null
}

async function capturer(page, url, fichier) {
  const r = await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 120000 })
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
  await page.evaluate(() => document.fonts.ready)
  await defiler(page)
  await page.screenshot({ path: fichier, fullPage: true })
  return r ? r.status() : 0
}

;(async () => {
  fs.mkdirSync(path.join(out, 'back-office'), { recursive: true })
  const journal = []
  const browser = await chromium.launch()
  for (const [suffixe, w, h] of LARGEURS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'fr-FR', reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    let token = null
    let connecte = false
    for (const [nom, cible, auth] of ECRANS) {
      if (!garder(nom)) continue
      if (auth && !connecte) {
        const r = await ctx.request.post(`${BASE}/api/users/login`, { data: { email: EMAIL, password: PWD } })
        token = (await r.json()).token
        connecte = true
      }
      let url = cible
      if (typeof cible !== 'string') url = await resoudre(ctx.request, token, cible)
      if (!url) { journal.push({ ecran: `back-office/${nom}-${suffixe}`, erreur: 'enregistrement introuvable', cible }); continue }
      try {
        const st = await capturer(page, url, path.join(out, 'back-office', `${nom}-${suffixe}.png`))
        journal.push({ ecran: `back-office/${nom}-${suffixe}`, url, statut: st, urlFinale: page.url().replace(BASE, '') })
      } catch (e) { journal.push({ ecran: `back-office/${nom}-${suffixe}`, url, erreur: String(e).slice(0, 200) }) }
    }
    await ctx.close()
  }
  await browser.close()
  fs.writeFileSync(path.join(out, 'journal-bo.json'), JSON.stringify(journal, null, 2))
  console.log(journal.filter((j) => j.erreur || (j.statut && j.statut !== 200) || (j.urlFinale && j.urlFinale.includes('login') && !j.ecran.includes('01-connexion'))))
  console.log('captures :', journal.filter((j) => !j.erreur).length, '/', journal.length)
})()
