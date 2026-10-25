import { expect, test } from '@playwright/test'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'

test.describe.serial('Lot 10 : experts, échanges, commissions', () => {
  test('espace membre : boîte « Mes échanges », demande reçue à décider, écran Experts', async ({ page }) => {
    await page.goto(`${BASE}/espace-membre/connexion`, { waitUntil: 'networkidle' })
    await page.fill('#mb-mail', 'christelle@kimiacreations.cg')
    await page.fill('#mb-pw', PWD)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL(`${BASE}/espace-membre`)
    await page.goto(`${BASE}/espace-membre/echanges`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toHaveText('Mes échanges', { timeout: 60000 })
    await expect(page.getByText('Léon Massamba').first()).toBeVisible()
    await page.goto(`${BASE}/espace-membre/echanges?onglet=annonces`, { waitUntil: 'networkidle' })
    await expect(page.getByText('Hervé Ondongo').first()).toBeVisible()
    await page.goto(`${BASE}/espace-membre/experts`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toHaveText('Solliciter un expert')
    await expect(page.getByText('Quel statut juridique pour vendre en ligne ?').first()).toBeVisible()
  })

  test('page de réponse d’un expert : un jeton faux renvoie 404', async ({ request }) => {
    expect((await request.get(`${BASE}/experts/reponse/1.1.faux`)).status()).toBe(404)
  })
})
