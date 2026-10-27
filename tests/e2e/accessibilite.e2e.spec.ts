import AxeBuilder from '@axe-core/playwright'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Lot 12 : accessibilité. axe-core (WCAG 2.1 A et AA) sur chaque écran du site, de l'espace membre et du back-office,
 * aux deux largeurs des captures ; aucune anomalie grave ou critique tolérée. Puis parcours au clavier.
 * Le détail des anomalies (toutes gravités) est écrit dans test-results/accessibilite.json.
 */

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'
const MEMBRE = 'christelle@kimiacreations.cg'
const ADMIN = 'ange.mouandza@rec242.test'
const LARGEURS = [
  ['ordinateur', 1440, 900],
  ['mobile', 390, 900],
] as const

const SITE = [
  '/',
  '/le-reseau',
  '/le-reseau/gouvernance',
  '/le-reseau/commissions',
  '/le-reseau/antennes',
  '/le-reseau/ecosysteme',
  '/le-reseau/partenaires',
  '/devenir-partenaire',
  '/adherer',
  '/adherer/candidature',
  '/membres',
  '/membres/khazad',
  '/agenda',
  '/agenda/afterwork-des-entrepreneurs-de-brazzaville',
  '/agenda/assemblee-generale-constitutive',
  '/opportunites',
  '/formalisation',
  '/actualites',
  '/actualites/les-adhesions-bientot-ouvertes-en-ligne',
  '/presse',
  '/contact',
  '/recherche?q=formalisation',
  '/plan-du-site',
  '/mentions-legales',
  '/confidentialite',
  '/conditions-utilisation',
  '/page-qui-n-existe-pas',
]
const ESPACE = [
  '/espace-membre',
  '/espace-membre/profil',
  '/espace-membre/evenements',
  '/espace-membre/opportunites',
  '/espace-membre/opportunites/publier',
  '/espace-membre/annuaire',
  '/espace-membre/annuaire/khazad',
  '/espace-membre/experts',
  '/espace-membre/echanges',
  '/espace-membre/cotisation',
  '/espace-membre/documents',
  '/espace-membre/carte',
]
const BO_LISTES = [
  '/admin',
  '/admin/collections/applications',
  '/admin/collections/members',
  '/admin/collections/events',
  '/admin/collections/news',
  '/admin/collections/opportunities',
  '/admin/cotisations',
  '/admin/collections/contactMessages',
  '/admin/collections/pages',
  '/admin/globals/settings',
  '/admin/collections/users',
  '/admin/collections/auditLog',
  '/admin/collections/documents',
  '/admin/collections/commissions',
  '/admin/collections/expertRequests',
]
// Fiches d'édition : premier document de chaque collection (les écrans 04, 06, 08, 10, 20 et 22 de la maquette).
const BO_FICHES = ['applications', 'members', 'events', 'news', 'opportunities', 'pages']

type Anomalie = { ecran: string; regle: string; impact: string; aide: string; cibles: string[] }
const toutes: Anomalie[] = []

async function analyser(page: Page, ecran: string) {
  // Les apparitions au défilement sont désactivées (reducedMotion) : on analyse l'état final de la page.
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('nextjs-portal')
    .analyze()
  for (const v of r.violations)
    toutes.push({
      ecran,
      regle: v.id,
      impact: v.impact ?? 'inconnu',
      aide: v.help,
      cibles: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
    })
}

async function visiter(page: Page, url: string) {
  await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 120000 })
  // Back-office : attendre que les corrections des composants natifs (AccessibiliteNative) soient actives.
  if (url.startsWith('/admin') && !url.startsWith('/admin/login'))
    await page.waitForSelector('html[data-a11y-natif="actif"]', { timeout: 60000 })
  await page.waitForTimeout(300)
}

async function premierId(request: APIRequestContext, token: string, collection: string) {
  const r = await request.get(`${BASE}/api/${collection}?limit=1&depth=0&sort=-createdAt`, {
    headers: { Authorization: `JWT ${token}` },
  })
  return (await r.json()).docs?.[0]?.id as number | undefined
}

test.describe.serial('Lot 12 : accessibilité', () => {
  test.describe.configure({ timeout: 1800000 })

  for (const [suffixe, width, height] of LARGEURS) {
    test.describe(suffixe, () => {
      test.use({ viewport: { width, height }, reducedMotion: 'reduce', locale: 'fr-FR' })

      test(`axe : site public (${suffixe})`, async ({ page }) => {
        for (const url of SITE) {
          await visiter(page, url)
          await analyser(page, `site ${url} (${suffixe})`)
        }
      })

      test(`axe : espace membre (${suffixe})`, async ({ page }) => {
        await visiter(page, '/espace-membre/connexion')
        await analyser(page, `espace /espace-membre/connexion (${suffixe})`)
        await page.fill('#mb-mail', MEMBRE)
        await page.fill('#mb-pw', PWD)
        await page.getByRole('button', { name: 'Se connecter' }).click()
        await page.waitForURL(`${BASE}/espace-membre`, { timeout: 180000 })
        for (const url of ESPACE) {
          await visiter(page, url)
          await analyser(page, `espace ${url} (${suffixe})`)
        }
      })

      test(`axe : back-office (${suffixe})`, async ({ page }) => {
        await visiter(page, '/admin/login')
        await analyser(page, `admin /admin/login (${suffixe})`)
        const r = await page.request.post(`${BASE}/api/users/login`, { data: { email: ADMIN, password: PWD } })
        expect(r.ok()).toBeTruthy()
        const token = (await r.json()).token as string
        const fiches: string[] = []
        for (const c of BO_FICHES) {
          const id = await premierId(page.request, token, c)
          if (id) fiches.push(`/admin/collections/${c}/${id}`)
        }
        for (const url of [...BO_LISTES, ...fiches]) {
          await visiter(page, url)
          await analyser(page, `admin ${url} (${suffixe})`)
        }
      })
    })
  }

  test('aucune anomalie grave ou critique', () => {
    fs.mkdirSync('test-results', { recursive: true })
    fs.writeFileSync(path.join('test-results', 'accessibilite.json'), JSON.stringify(toutes, null, 2))
    const graves = toutes.filter((a) => a.impact === 'serious' || a.impact === 'critical')
    expect(graves, JSON.stringify(graves, null, 2)).toEqual([])
  })
})

/** Élément actif : visible et doté d'un indicateur de focus (contour ou ombre). */
async function focusVisible(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el || el === document.body) return { ok: false, tag: 'body' }
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    const contour = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
    const ombre = s.boxShadow !== 'none'
    return {
      ok: (contour || ombre) && r.width > 0 && r.height > 0,
      tag: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} ${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}`,
    }
  })
}

async function tabulerEtVerifier(page: Page, n: number) {
  const sansFocus: string[] = []
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab')
    const f = await focusVisible(page)
    if (!f.ok) sansFocus.push(f.tag)
  }
  return sansFocus
}

test.describe.serial('Lot 12 : parcours au clavier', () => {
  test.describe.configure({ timeout: 300000 })
  test.use({ reducedMotion: 'reduce', locale: 'fr-FR' })

  test('site : lien d’évitement, navigation, focus visible sur chaque élément', async ({ page }) => {
    await visiter(page, '/')
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveText('Aller au contenu')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#contenu$/)
    await visiter(page, '/')
    expect(await tabulerEtVerifier(page, 40)).toEqual([])
  })

  test('site mobile : ouvrir le menu au clavier', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 })
    await visiter(page, '/')
    const menu = page.getByRole('button', { name: 'Ouvrir ou fermer le menu' })
    await menu.focus()
    await page.keyboard.press('Enter')
    await expect(menu).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(menu).toHaveAttribute('aria-expanded', 'false')
  })

  test('formulaire de contact : chaque champ atteint au clavier, focus visible', async ({ page }) => {
    await visiter(page, '/contact')
    await page.locator('main form').first().locator('input, textarea, select').first().focus()
    expect(await tabulerEtVerifier(page, 10)).toEqual([])
  })

  test('candidature : étape 1 parcourue au clavier, erreurs annoncées sur les champs', async ({ page }) => {
    await visiter(page, '/adherer/candidature')
    const premier = page.locator('main form input, main input').first()
    await premier.focus()
    expect(await tabulerEtVerifier(page, 12)).toEqual([])
    // « Continuer » au clavier sans rien remplir : les champs obligatoires passent en erreur (aria-invalid).
    await page.getByRole('button', { name: 'Continuer' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('main [aria-invalid="true"]').first()).toBeVisible()
  })

  test('animations : coupées par prefers-reduced-motion et par l’interrupteur du pied de page', async ({ browser }) => {
    const reduit = await browser.newContext({ reducedMotion: 'reduce' })
    const p1 = await reduit.newPage()
    await p1.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 120000 })
    expect(await p1.locator('html').getAttribute('data-motion')).toBeNull()
    await reduit.close()
    const normal = await browser.newContext({ reducedMotion: 'no-preference' })
    const p2 = await normal.newPage()
    await p2.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 120000 })
    await expect(p2.locator('html')).toHaveAttribute('data-motion', 'on')
    const bouton = p2.locator('[data-m-toggle]').first()
    await bouton.focus()
    await p2.keyboard.press('Enter')
    expect(await p2.locator('html').getAttribute('data-motion')).toBeNull()
    await expect(bouton).toHaveAttribute('aria-pressed', 'true')
    await normal.close()
  })

  test('espace membre : connexion entièrement au clavier', async ({ page }) => {
    await visiter(page, '/espace-membre/connexion')
    await page.locator('#mb-mail').focus()
    await page.keyboard.type(MEMBRE)
    await page.keyboard.press('Tab')
    await expect(page.locator('#mb-pw')).toBeFocused()
    await page.keyboard.type(PWD)
    await page.keyboard.press('Enter')
    await page.waitForURL(`${BASE}/espace-membre`, { timeout: 180000 })
    expect(await tabulerEtVerifier(page, 25)).toEqual([])
  })

  test('back-office : connexion au clavier, puis navigation avec focus visible', async ({ page }) => {
    await visiter(page, '/admin/login')
    await page.locator('#field-email').focus()
    await page.keyboard.type(ADMIN)
    await page.keyboard.press('Tab')
    await expect(page.locator('#field-password')).toBeFocused()
    await page.keyboard.type(PWD)
    await page.keyboard.press('Enter')
    await page.waitForURL(`${BASE}/admin`, { timeout: 180000 })
    await page.waitForLoadState('networkidle')
    // Le tableau de bord remplace la page de connexion côté client : attendre qu'il soit monté avant de tabuler.
    await page.waitForSelector('html[data-a11y-natif="actif"]', { timeout: 60000 })
    await expect(page.locator('.rec-topbar__title')).toHaveText('Tableau de bord')
    await page.waitForTimeout(500)
    expect(await tabulerEtVerifier(page, 25)).toEqual([])
  })
})
