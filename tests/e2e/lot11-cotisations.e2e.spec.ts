import { expect, test } from '@playwright/test'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'

test.describe.serial('Lot 11 : cotisations et discipline', () => {
  test('espace membre : cotisation, échéancier et reçus ; documents', async ({ page }) => {
    await page.goto(`${BASE}/espace-membre/connexion`, { waitUntil: 'networkidle' })
    await page.fill('#mb-mail', 'christelle@kimiacreations.cg')
    await page.fill('#mb-pw', PWD)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL(`${BASE}/espace-membre`)
    await page.goto(`${BASE}/espace-membre/cotisation`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toHaveText('Cotisation et paiements')
    await expect(page.getByText(/37\s500\sFCFA/).first()).toBeVisible()
    await expect(page.getByText(/PAY-\d{4}/).first()).toBeVisible()
    await page.goto(`${BASE}/espace-membre/documents`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toBeVisible()
  })

  test('back-office : écran Cotisations et tableau de bord', async ({ page, request }) => {
    const r = await request.post(`${BASE}/api/users/login`, { data: { email: 'ange.mouandza@rec242.test', password: PWD } })
    expect(r.ok()).toBeTruthy()
    const { token } = await r.json()
    await page.context().addCookies([{ name: 'payload-token', value: token, url: BASE }])
    await page.goto(`${BASE}/admin/cotisations`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Cotisations', level: 1 })).toBeVisible({ timeout: 60000 })
    await expect(page.getByText('Les Bretelles de Léon').first()).toBeVisible()
    await expect(page.getByText('3 / 3').first()).toBeVisible()
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Tableau de bord', level: 1 })).toBeVisible({ timeout: 60000 })
  })
})
