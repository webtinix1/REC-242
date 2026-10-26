// Audit visuel (1/2) : capture pleine page du site et de l'espace membre à 1440 et 390 px, comme captures/.
// Usage : pnpm audit:visuel (serveur sur http://localhost:3000, de préférence next build + next start).
// Options : node capture.cjs [racine du dépôt] [dossier de sortie] [filtre d'écrans, ex. 01-accueil,14-agenda]
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const repo = path.resolve(process.argv[2] || '.')
const out = path.resolve(process.argv[3] || path.join(repo, '.audit-visuel'))
const filtre = (process.argv[4] || '').split(',').filter(Boolean)
const garder = (nom) => !filtre.length || filtre.some((x) => nom.startsWith(x))
const { chromium } = require(path.join(repo, 'node_modules', '@playwright', 'test'))
const BASE = 'http://localhost:3000'
const PWD = 'Rec242-demo-2026'
const MEMBRE = 'christelle@kimiacreations.cg'

const SITE = [
  ['01-accueil', '/'],
  ['02-reseau', '/le-reseau'],
  ['03-gouvernance', '/le-reseau/gouvernance'],
  ['04-commissions', '/le-reseau/commissions'],
  ['05-antennes', '/le-reseau/antennes'],
  ['06-ecosysteme', '/le-reseau/ecosysteme'],
  ['07-partenaires', '/le-reseau/partenaires'],
  ['08-partenariat', '/devenir-partenaire'],
  ['09-adherer', '/adherer'],
  ['10-candidature', '/adherer/candidature'],
  ['11-merci', '/adherer/merci'],
  ['12-membres', '/membres'],
  ['13-membre', '/membres/khazad'],
  ['14-agenda', '/agenda'],
  ['15-evenement', '/agenda/afterwork-des-entrepreneurs-de-brazzaville'],
  ['16-evenementpasse', '/agenda/assemblee-generale-constitutive'],
  ['17-opportunites', '/opportunites'],
  ['18-formalisation', '/formalisation'],
  ['19-actualites', '/actualites'],
  ['20-article', 'slug:/actualites'],
  ['21-presse', '/presse'],
  ['22-contact', '/contact'],
  ['23-recherche', '/recherche?q=formalisation'],
  ['24-plan', '/plan-du-site'],
  ['25-mentions', '/mentions-legales'],
  ['26-confidentialite', '/confidentialite'],
  ['27-conditions', '/conditions-utilisation'],
  ['28-erreur404', '/page-qui-n-existe-pas'],
]
const MEMBRE_ECRANS = [
  ['01-connexion', '/espace-membre/connexion', false],
  ['02-tableau', '/espace-membre', true],
  ['03-profil', '/espace-membre/profil', true],
  ['04-evenements', '/espace-membre/evenements', true],
  ['05-opportunites', '/espace-membre/opportunites', true],
  ['06-publier', '/espace-membre/opportunites/publier', true],
  ['07-annuaire', '/espace-membre/annuaire', true],
  ['08-fiche', '/espace-membre/annuaire/khazad', true],
  ['09-experts', '/espace-membre/experts', true],
  ['10-messages', '/espace-membre/echanges', true],
  ['11-cotisation', '/espace-membre/cotisation', true],
  ['12-documents', '/espace-membre/documents', true],
  ['13-carte', '/espace-membre/carte', true],
]
// Les références mobiles ont été prises avec une fenêtre de 900 px de haut (barre d'onglets fixe à 831 px).
const LARGEURS = [['ordinateur', 1440, 900], ['mobile', 390, 900]]

async function premierLien(page, liste, passe) {
  await page.goto(BASE + liste, { waitUntil: 'networkidle', timeout: 120000 })
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))
  const prefixe = liste.endsWith('/') ? liste : liste + '/'
  const cands = [...new Set(hrefs.filter((h) => h && h.startsWith(prefixe) && h.split('/').length === prefixe.split('/').length && !h.includes('?')))]
  if (passe) {
    // Un événement passé : on cherche une page de détail qui affiche « passé » / « s'est tenu ».
    for (const h of cands) {
      await page.goto(BASE + h, { waitUntil: 'networkidle', timeout: 120000 })
      const t = (await page.textContent('main')) || ''
      if (/s.est tenu|pass[ée]|en images|compte rendu/i.test(t)) return h
    }
    for (const q of ['?periode=passes', '?passes=1', '/passes']) {
      try {
        await page.goto(BASE + liste + q, { waitUntil: 'networkidle', timeout: 60000 })
        const hs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')))
        const c = hs.find((h) => h && h.startsWith(prefixe) && !cands.includes(h) && !h.includes('?'))
        if (c) return c
      } catch {}
    }
    return null
  }
  return cands[0] || null
}

async function defiler(page) {
  // Déclenche les apparitions au défilement, puis revient en haut.
  await page.evaluate(async () => {
    const h = () => document.documentElement.scrollHeight
    for (let y = 0; y < h(); y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)) }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(800)
}

/** Page Merci : accessible seulement avec le cookie signé posé après l'envoi d'une candidature (même signature que src/lib/adhesion/merci.ts). */
async function cookieMerci(ctx) {
  const env = fs.readFileSync(path.join(repo, '.env'), 'utf8')
  const secret = (env.match(/^PAYLOAD_SECRET=(.*)$/m) || [])[1].trim().replace(/^["']|["']$/g, '')
  const id = process.env.AUDIT_MERCI_ID || '1'
  const jeton = `${id}.${crypto.createHmac('sha256', secret).update(`merci:${id}`).digest('hex').slice(0, 32)}`
  await ctx.addCookies([{ name: 'rec242_merci', value: jeton, domain: 'localhost', path: '/' }])
}

async function capturer(page, url, fichier) {
  const r = await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 120000 })
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
  await defiler(page)
  await page.screenshot({ path: fichier, fullPage: true })
  return r ? r.status() : 0
}

;(async () => {
  fs.mkdirSync(path.join(out, 'site'), { recursive: true })
  fs.mkdirSync(path.join(out, 'espace-membre'), { recursive: true })
  const journal = []
  const browser = await chromium.launch()
  for (const [suffixe, w, h] of LARGEURS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'fr-FR', reducedMotion: 'reduce' })
    await cookieMerci(ctx)
    const page = await ctx.newPage()
    const resolus = {}
    for (const [nom, cible] of SITE) {
      if (!garder(nom)) continue
      let url = cible
      if (cible.startsWith('slug')) {
        const cle = cible
        if (!(cle in resolus)) resolus[cle] = await premierLien(page, cible.split(':')[1], cible.startsWith('slug-passe'))
        url = resolus[cle]
      }
      if (!url) { journal.push({ ecran: `site/${nom}-${suffixe}`, url: cible, erreur: 'page de détail introuvable' }); continue }
      try {
        const st = await capturer(page, url, path.join(out, 'site', `${nom}-${suffixe}.png`))
        journal.push({ ecran: `site/${nom}-${suffixe}`, url, statut: st })
      } catch (e) { journal.push({ ecran: `site/${nom}-${suffixe}`, url, erreur: String(e).slice(0, 200) }) }
    }
    // Espace membre : connexion d'abord (écran 01 capturé déconnecté).
    for (const [nom, cible, auth] of MEMBRE_ECRANS) {
      if (!garder(nom)) continue
      if (auth && !resolus.__connecte) {
        await page.goto(BASE + '/espace-membre/connexion', { waitUntil: 'networkidle', timeout: 120000 })
        await page.fill('#mb-mail', MEMBRE)
        await page.fill('#mb-pw', PWD)
        await page.getByRole('button', { name: 'Se connecter' }).click()
        await page.waitForURL((u) => !u.pathname.includes('connexion'), { timeout: 60000 }).catch(() => {})
        resolus.__connecte = true
      }
      let url = cible
      if (cible.startsWith('slug')) url = await premierLien(page, cible.split(':')[1], false)
      if (!url) { journal.push({ ecran: `espace-membre/${nom}-${suffixe}`, url: cible, erreur: 'page de détail introuvable' }); continue }
      try {
        const st = await capturer(page, url, path.join(out, 'espace-membre', `${nom}-${suffixe}.png`))
        journal.push({ ecran: `espace-membre/${nom}-${suffixe}`, url, statut: st, urlFinale: page.url().replace(BASE, '') })
      } catch (e) { journal.push({ ecran: `espace-membre/${nom}-${suffixe}`, url, erreur: String(e).slice(0, 200) }) }
    }
    await ctx.close()
  }
  await browser.close()
  fs.writeFileSync(path.join(out, 'journal.json'), JSON.stringify(journal, null, 2))
  console.log(journal.filter((j) => j.erreur || (j.statut && j.statut !== 200) || (j.urlFinale && j.urlFinale.includes('connexion') && !j.ecran.includes('01-connexion'))))
  console.log('captures :', journal.filter((j) => !j.erreur).length, '/', journal.length)
})()
