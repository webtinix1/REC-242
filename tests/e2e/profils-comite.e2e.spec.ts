import { expect, test } from '@playwright/test'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'
const PROFIL = '/le-reseau/gouvernance/kamba-eve-ndinga-oba'

test.describe('Profils du comité', () => {
  test('chaque carte du comité ouvre le profil de la personne', async ({ page }) => {
    await page.goto(`${BASE}/le-reseau/gouvernance`)
    const cartes = page.locator('a.cdir-card')
    await expect(cartes.first()).toBeVisible()
    const n = await cartes.count()
    expect(n).toBeGreaterThan(0)
    const nom = await cartes.first().locator('.h-s').innerText()
    await cartes.first().click()
    await expect(page).toHaveURL(/\/le-reseau\/gouvernance\/[a-z0-9-]+$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(nom)
    await expect(page.locator('.subnav').getByRole('link', { name: 'Gouvernance', exact: true })).toHaveClass(/is-on/)
    await page.getByRole('link', { name: 'Retour à la gouvernance' }).click()
    await expect(page).toHaveURL(/\/le-reseau\/gouvernance$/)
  })

  test('le profil de la présidente reprend son parcours, sans coordonnées', async ({ page }) => {
    const r = await page.goto(`${BASE}${PROFIL}`)
    expect(r?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kamba Eve Ndinga-Oba')
    await expect(page.getByText('Présidente fondatrice de REC 242')).toBeVisible()
    for (const titre of ['Profil', 'Direction et engagements', 'Parcours entrepreneurial', 'Banque et gestion', 'Formation', 'Compétences'])
      await expect(page.getByRole('heading', { level: 2, name: titre, exact: true })).toBeVisible()
    await expect(page.getByText('Focus Immobilier')).toBeVisible()
    const html = await page.content()
    expect(html).not.toContain('@yahoo')
    expect(html).not.toContain('—')
  })

  test('une adresse inconnue renvoie la page 404', async ({ request }) => {
    expect((await request.get(`${BASE}/le-reseau/gouvernance/personne-inconnue`)).status()).toBe(404)
  })

  test('sur mobile, la page tient dans la largeur de l’écran', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}${PROFIL}`)
    const debord = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(debord).toBeLessThanOrEqual(0)
  })

  test('le back-office propose l’onglet Profil pour le comité, pas pour un expert', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`)
    await page.fill('#field-email', 'ange.mouandza@rec242.test')
    await page.fill('#field-password', PWD)
    await page.click('.form-submit button')
    await page.waitForURL(/\/admin\/?$/, { timeout: 60000 })
    const ids = await page.evaluate(async () => {
      const lire = (role: string) => fetch(`/api/people?where[role][equals]=${role}&limit=1&depth=0`).then((r) => r.json())
      return [(await lire('fondatrice')).docs[0].id, (await lire('expert')).docs[0].id]
    })
    await page.goto(`${BASE}/admin/collections/people/${ids[0]}`)
    await page.getByRole('button', { name: 'Profil', exact: true }).click()
    await expect(page.locator('#field-presentation')).toHaveValue(/Entrepreneure implantée/)
    await page.goto(`${BASE}/admin/collections/people/${ids[1]}`)
    await expect(page.getByRole('button', { name: 'Fiche', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Profil', exact: true })).toHaveCount(0)
  })
})
