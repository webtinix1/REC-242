import { expect, test } from '@playwright/test'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'
const n = Date.now()

test.describe.serial('Lot 9 : opportunités', () => {
  test('site : les opportunités réservées ne montrent que leur type et leur date limite', async ({ page, request }) => {
    const html = await (await request.get(`${BASE}/opportunites`)).text()
    expect(html).not.toContain('Sous-traitance en développement web')
    expect(html).not.toContain('Recherche de livreurs à moto')
    await page.goto(`${BASE}/opportunites`, { waitUntil: 'networkidle' })
    await expect(page.getByText('REC 242 cherche des partenaires pour ses ateliers de formalisation').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Se connecter/ }).first()).toBeVisible()
  })

  test('espace membre : publier une annonce, elle part en modération', async ({ page }) => {
    await page.goto(`${BASE}/espace-membre/connexion`, { waitUntil: 'networkidle' })
    await page.fill('#mb-mail', 'christelle@kimiacreations.cg')
    await page.fill('#mb-pw', PWD)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL(`${BASE}/espace-membre`)
    await page.goto(`${BASE}/espace-membre/opportunites`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toHaveText('Opportunités')
    await expect(page.getByText('Votre annonce').first()).toBeVisible()

    await page.goto(`${BASE}/espace-membre/opportunites/publier`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toHaveText('Publier une opportunité')
    const titre = `Annonce E2E ${n}`
    await page.locator('select[name="type"]').selectOption('offre-membre')
    await page.locator('input[name="titre"]').fill(titre)
    await page.locator('textarea[name="description"]').fill('Nous cherchons un partenaire de livraison pour nos commandes en ligne.')
    await page.getByRole('button', { name: /Continuer|Suivant/ }).first().click()
    const demain = new Date(Date.now() + 10 * 86400e3).toISOString().slice(0, 10)
    await page.locator('input[name="dateLimite"]').fill(demain)
    await page.getByRole('button', { name: /Continuer|Suivant/ }).first().click()
    await page.getByRole('button', { name: /Envoyer|Publier|Soumettre/ }).last().click()
    await page.waitForURL(`${BASE}/espace-membre/opportunites`, { timeout: 60000 })
    await expect(page.getByText(titre).first()).toBeVisible()
    await expect(page.getByText('À modérer').first()).toBeVisible()
  })
})
