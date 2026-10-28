import { expect, test } from '@playwright/test'

import { temporairement } from '../helpers/temporaire'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'
// Coordonnées des membres de démonstration (seed) : aucune ne doit figurer dans le HTML public.
const COORDONNEES = ['+242 06 512 34 18', '+242 06 877 02 61', '+242 06 903 47 25', 'contact@3mpartners.cg', 'contact@mbongui-rh.cg', 'christelle@kimiacreations.cg']

test.describe('Lot 7 : annuaire', () => {
  test('le HTML des pages publiques ne contient aucune coordonnée', async ({ request }) => {
    for (const chemin of ['/membres', '/membres?ville=pointe-noire', '/membres/khazad', '/membres/3m-partners-conseils', '/']) {
      const r = await request.get(`${BASE}${chemin}`)
      expect(r.ok(), chemin).toBeTruthy()
      const html = await r.text()
      for (const c of COORDONNEES) expect(html, `${chemin} contient ${c}`).not.toContain(c)
    }
    // Une fiche masquée par l'administration ou d'un membre suspendu n'existe pas pour le public (fiches de démonstration modifiées le temps du test).
    await temporairement('companies', 'slug', 'hopital-blanche-gomes', { masqueeParAdmin: true }, async () => {
      expect((await request.get(`${BASE}/membres/hopital-blanche-gomes`)).status()).toBe(404)
    })
    await temporairement('members', 'email', 'contact@bretellesdeleon.cg', { statut: 'suspendu' }, async () => {
      expect((await request.get(`${BASE}/membres/les-bretelles-de-leon`)).status()).toBe(404)
    })
  })

  test('filtres dans l’adresse et fiche publique', async ({ page }) => {
    await page.goto(`${BASE}/membres?secteur=numerique`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toContainText('Trouvez un membre')
    await expect(page.getByText('Khazad')).toBeVisible()
    await expect(page.getByText('Fako Drop')).toHaveCount(0)
    await page.goto(`${BASE}/membres/khazad`, { waitUntil: 'networkidle' })
    await expect(page.getByText('Dirigeant, quartier et taille réservés aux membres abonnés à l’annuaire détaillé.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Se connecter pour contacter' })).toBeVisible()
  })

  test('membre connecté sans abonnement : aucune coordonnée, fiche détaillée réservée, écrire depuis la plateforme', async ({ page }) => {
    await page.goto(`${BASE}/espace-membre/connexion`, { waitUntil: 'networkidle' })
    await page.fill('#mb-mail', 'christelle@kimiacreations.cg')
    await page.fill('#mb-pw', PWD)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL(`${BASE}/espace-membre`)
    await page.goto(`${BASE}/espace-membre/annuaire`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Annuaire détaillé' })).toBeVisible()
    // Ses propres coordonnées peuvent figurer sur ses pages ; celles des autres membres jamais.
    const autres = COORDONNEES.filter((c) => !c.startsWith('christelle'))
    for (const c of autres) expect(await page.content(), `annuaire contient ${c}`).not.toContain(c)
    await page.goto(`${BASE}/membres/khazad`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(`${BASE}/espace-membre/annuaire/khazad`)
    // Décision du 28/10/2026 : les coordonnées ne sont jamais affichées, l'abonnement montre la fiche détaillée.
    for (const c of autres) expect(await page.content(), `fiche contient ${c}`).not.toContain(c)
    await expect(page.getByRole('link', { name: 'Découvrir l’abonnement →' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Écrire à ce membre' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Envoyer le message' })).toBeVisible()
  })
})
