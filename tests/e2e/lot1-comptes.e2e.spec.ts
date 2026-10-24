import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { waitForMail } from '../helpers/mailbox'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'

async function loginAs(page: import('@playwright/test').Page, email: string, password = PWD) {
  await page.goto(`${BASE}/admin/login`)
  await page.fill('#field-email', email)
  await page.fill('#field-password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE}/admin`)
}

test.describe.configure({ timeout: 60000 })

test.describe('Lot 1 : comptes, rôles, journal', () => {
  test.beforeAll(async () => {
    const payload = await getPayload({ config })
    await payload.db.deleteMany({ collection: 'users', where: { email: { in: ['invite@e2e.test', 'curl@e2e.test'] } } })
  })

  test('le menu suit les droits du rôle', async ({ page }) => {
    await loginAs(page, 'beryl.bobanda@rec242.test')
    const nav = page.locator('.rec-nav')
    await expect(nav.getByText('Tableau de bord')).toBeVisible()
    await expect(nav.getByText('Journal')).toHaveCount(0)
    await expect(nav.getByText('Utilisateurs et rôles')).toHaveCount(0)

    await page.context().clearCookies()
    await loginAs(page, 'ange.mouandza@rec242.test')
    await expect(page.locator('.rec-nav').getByText('Journal')).toBeVisible()
    await expect(page.locator('.rec-nav').getByText('Utilisateurs et rôles')).toBeVisible()
  })

  test('invitation : e-mail, création du mot de passe, première connexion', async ({ page, browser }) => {
    await loginAs(page, 'ange.mouandza@rec242.test')
    await page.goto(`${BASE}/admin/collections/users`)
    await expect(page.getByRole('heading', { name: 'Matrice des permissions' })).toBeVisible()
    const since = new Date()
    // Le bouton peut être cliqué avant l'hydratation : on réessaie jusqu'à l'ouverture du formulaire.
    await expect(async () => {
      await page.getByRole('button', { name: 'Inviter un utilisateur' }).click()
      await expect(page.locator('#inv-name')).toBeVisible({ timeout: 1000 })
    }).toPass({ timeout: 15000 })
    await page.fill('#inv-name', 'Invitée Test')
    await page.fill('#inv-email', 'invite@e2e.test')
    await page.locator('.rec-fieldset label', { hasText: 'Éditeur' }).locator('input').check()
    await page.getByRole('button', { name: 'Envoyer l’invitation' }).click()
    await expect(page.getByText('Invitation envoyée')).toBeVisible()

    const mail = await waitForMail('invite@e2e.test', since, /invité/)
    const link = mail.html.match(/href="([^"]+\/admin\/reset\/[^"]+)"/)?.[1]
    expect(link).toBeTruthy()

    const ctx = await browser.newContext()
    const p2 = await ctx.newPage()
    await p2.goto(link!)
    const newPwd = 'Nouveau-mot-de-passe-2026'
    await p2.locator('input[type="password"]').first().fill(newPwd)
    await p2.locator('input[type="password"]').nth(1).fill(newPwd)
    await p2.click('button[type="submit"]')
    await p2.waitForURL(/\/admin(\/login)?$/)
    if (p2.url().endsWith('/login')) {
      await p2.fill('#field-email', 'invite@e2e.test')
      await p2.fill('#field-password', newPwd)
      await p2.click('button[type="submit"]')
      await p2.waitForURL(`${BASE}/admin`)
    }
    const payload = await getPayload({ config })
    const u = await payload.find({ collection: 'users', where: { email: { equals: 'invite@e2e.test' } }, overrideAccess: true })
    expect(u.docs[0]?.statut).toBe('actif')
    await ctx.close()
  })

  test('le journal se filtre par catégorie', async ({ page }) => {
    await loginAs(page, 'ange.mouandza@rec242.test')
    await page.goto(`${BASE}/admin/collections/auditLog`)
    await expect(async () => {
      await page.getByRole('button', { name: 'Connexions' }).click()
      await expect(page).toHaveURL(/categorie/, { timeout: 1500 })
    }).toPass({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Connexions' })).toHaveAttribute('aria-pressed', 'true')
  })
})
