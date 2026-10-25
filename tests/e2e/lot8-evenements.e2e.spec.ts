import { expect, test } from '@playwright/test'

import { waitForMail } from '../helpers/mailbox'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'
const n = Date.now()

test.describe.serial('Lot 8 : événements', () => {
  test('agenda, inscription visiteur, e-mail avec billet et .ics, billet et annulation par lien', async ({ page }) => {
    await page.goto(`${BASE}/agenda`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByText('Afterwork des entrepreneurs de Brazzaville').first()).toBeVisible()
    await expect(page.getByText('Complet, liste d’attente').first()).toBeVisible()

    await page.goto(`${BASE}/agenda/rencontre-b2b-commerce-et-distribution`, { waitUntil: 'networkidle' })
    const email = `visiteur-${n}@e2e.test`
    const debut = new Date()
    // Le formulaire refuse un envoi trop rapide (anti-robots) : on attend avant d'envoyer.
    await page.waitForTimeout(3500)
    await page.fill('#b-ev-nom', 'Visiteur E2E')
    await page.fill('#b-ev-mail', email)
    await page.getByRole('button', { name: /^M’inscrire$/ }).click()
    await expect(page.getByText('Inscription confirmée')).toBeVisible({ timeout: 60000 })
    const mail = await waitForMail(email, debut, /Inscription confirmée/, 30000)
    const billet = /agenda\/billet\/([\w.-]+)/.exec(mail.html)?.[1]
    const annulation = /agenda\/annulation\/([\w.-]+)/.exec(mail.html)?.[1]
    expect(billet).toBeTruthy()
    await page.goto(`${BASE}/agenda/billet/${billet}`, { waitUntil: 'networkidle' })
    await expect(page.getByText(/B-\d{4}-\d{3}/).first()).toBeVisible()
    await expect(page.locator('svg path').first()).toBeVisible()
    await page.goto(`${BASE}/agenda/annulation/${annulation}`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /Annuler mon inscription/ }).click()
    await expect(page.locator('main')).toContainText(/annulée|annulé/i, { timeout: 30000 })
  })

  test('espace membre : mes inscriptions, billet et liste d’attente', async ({ page }) => {
    await page.goto(`${BASE}/espace-membre/connexion`, { waitUntil: 'networkidle' })
    await page.fill('#mb-mail', 'christelle@kimiacreations.cg')
    await page.fill('#mb-pw', PWD)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL(`${BASE}/espace-membre`)
    await page.goto(`${BASE}/espace-membre/evenements`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toHaveText('Mes événements')
    await expect(page.getByText(/position 2/i).first()).toBeVisible()
    const ics = await page.request.get(`${BASE}/agenda/afterwork-des-entrepreneurs-de-brazzaville/ics`)
    expect(ics.headers()['content-type']).toContain('text/calendar')
  })
})
