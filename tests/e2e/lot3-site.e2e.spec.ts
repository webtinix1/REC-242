import { expect, test } from '@playwright/test'

const BASE = 'http://localhost:3000'

const PAGES: [string, string][] = [
  ['/', 'Entreprendre au Congo, sans rester seul.'],
  ['/le-reseau', 'Un écosystème où les entrepreneurs ne restent plus isolés.'],
  ['/le-reseau/gouvernance', 'Les femmes et les hommes qui font vivre le réseau'],
  ['/le-reseau/commissions', 'Cinq commissions, une expertise partagée'],
  ['/le-reseau/antennes', 'Un réseau présent dans tout le pays'],
  ['/le-reseau/ecosysteme', 'La place de REC 242 dans l’écosystème entrepreneurial'],
  ['/le-reseau/partenaires', 'Ils soutiennent les entrepreneurs du réseau'],
  ['/formalisation', 'Sortir de l’informel, accompagné.'],
  ['/actualites', 'La vie du réseau'],
  ['/presse', 'Pour les journalistes'],
  ['/plan-du-site', 'Toutes les pages'],
  ['/mentions-legales', 'Mentions légales'],
  ['/confidentialite', 'Politique de confidentialité'],
  ['/conditions-utilisation', 'Conditions d’utilisation de l’espace membre'],
]

test.describe('Lot 3 : site institutionnel', () => {
  for (const [chemin, titre] of PAGES) {
    test(`${chemin} : un seul titre de niveau 1, texte de la maquette`, async ({ page }) => {
      const r = await page.goto(BASE + chemin)
      expect(r?.status()).toBe(200)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('h1')).toHaveText(titre)
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1)
      expect(await page.content()).not.toContain('—')
    })
  }

  test('une adresse inconnue renvoie l’écran 404 avec le statut 404', async ({ page }) => {
    const r = await page.goto(`${BASE}/cette-page-n-existe-pas`)
    expect(r?.status()).toBe(404)
    await expect(page.locator('h1')).toHaveText('Cette page a quitté le cercle')
  })

  test('gouvernance : le filtre par étiquette montre comité et experts qui la portent', async ({
    page,
  }) => {
    await page.goto(`${BASE}/le-reseau/gouvernance`)
    await expect(page.getByText('5 personne(s) · les experts du réseau')).toBeVisible()
    await page.getByRole('button', { name: '#Juridique' }).click()
    await expect(page.getByText('2 personne(s) · #Juridique')).toBeVisible()
  })

  test('actualités : le filtre de type est dans l’adresse', async ({ page }) => {
    await page.goto(`${BASE}/actualites?type=communique`)
    const types = await page.locator('.newsgrid .pill-type').allTextContents()
    expect(types.length).toBeGreaterThan(0)
    expect(types.every((t) => t === 'Communiqué')).toBe(true)
  })

  test('actualité réservée : le visiteur voit le chapeau et l’invitation à se connecter', async ({
    page,
  }) => {
    await page.goto(`${BASE}/actualites/compte-rendu-reserve-reunion-du-comite-de-direction`)
    await expect(page.getByText('Les décisions du mois, réservées aux membres.')).toBeVisible()
    await expect(page.getByText('Article réservé aux membres')).toBeVisible()
  })

  test('recherche : des résultats publics pour « formalisation »', async ({ page }) => {
    await page.goto(`${BASE}/recherche?q=formalisation`)
    await expect(page.locator('.row-card').first()).toBeVisible()
    await expect(page.getByText(/résultat\(s\) pour « formalisation »/)).toBeVisible()
  })

  test('sitemap.xml et robots.txt', async ({ request }) => {
    const s = await request.get(`${BASE}/sitemap.xml`)
    expect(s.status()).toBe(200)
    expect(await s.text()).toContain('/le-reseau/gouvernance')
    const r = await request.get(`${BASE}/robots.txt`)
    expect(await r.text()).toContain('Sitemap:')
  })

  test('données structurées : Organization, NewsArticle et BreadcrumbList sur un article', async ({
    page,
  }) => {
    await page.goto(`${BASE}/actualites/rec-242-tient-son-assemblee-generale-constitutive`)
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
    const types = ld.map((t) => JSON.parse(t)['@type'])
    expect(types).toEqual(expect.arrayContaining(['Organization', 'NewsArticle', 'BreadcrumbList']))
  })

  test('mobile : barre d’onglets et menu plein écran', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    await page.goto(BASE)
    await expect(page.locator('.tabbar')).toBeVisible()
    await page.locator('.tabbar').getByRole('button', { name: /menu/i }).click()
    await expect(page.locator('.sheet')).toBeVisible()
    await ctx.close()
  })
})
