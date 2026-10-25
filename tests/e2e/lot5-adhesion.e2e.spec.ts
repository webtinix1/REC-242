import { expect, test, type Page } from '@playwright/test'

import { login } from '../helpers/login'
import { waitForMail } from '../helpers/mailbox'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'
const DOUBLON =
  "Une demande d'adhésion est déjà enregistrée avec ces coordonnées. Veuillez contacter l'administration si vous pensez qu'il s'agit d'une erreur."

const n = Date.now()
const email = `candidat-${n}@e2e.test`
const telephone = `06${String(n).slice(-7)}`

const etape1 = async (page: Page, mail: string, tel: string) => {
  await page.fill('#b-nom', 'Essai')
  await page.fill('#b-prenom', 'Candidat')
  await page.fill('#b-tel', tel)
  await page.fill('#b-mail', mail)
  await page.selectOption('#b-age', '26-35')
  await page.getByRole('button', { name: 'Continuer' }).click()
}

test.describe.serial('Lot 5 : adhésion', () => {
  test.describe.configure({ timeout: 120000 })

  test('Adhérer : montants calculés depuis les Paramètres', async ({ page }) => {
    await page.goto(`${BASE}/adherer`)
    await expect(page.locator('h1')).toHaveText('Rejoignez le cercle.')
    const b = page.locator('.catcard').filter({ hasText: 'Établissement, commerçant formalisé' })
    await expect(b.locator('.price')).toHaveText('90 000 FCFA')
    await expect(b).toContainText('ou deux tranches de 37 500 FCFA sous 3 mois')
    await b.getByRole('link', { name: 'Choisir B' }).click()
    await expect(page).toHaveURL(/categorie=B/)
  })

  test('candidature complète : paiement mobile, page Merci, reçu et e-mails', async ({ page }) => {
    const debut = new Date()
    await page.goto(`${BASE}/adherer/candidature?categorie=B`)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await etape1(page, email, telephone)

    await expect(page.getByRole('heading', { name: 'Votre entreprise' })).toBeVisible()
    await page.fill('#b-rs', 'Boutique E2E')
    await page.fill('#b-desc', 'Vente de pagnes au marché Total.')
    for (const s of ['Commerce', 'Services', 'Artisanat'])
      await page.getByRole('button', { name: s, exact: true }).click()
    await page.getByRole('button', { name: 'Transport', exact: true }).click()
    await expect(
      page.getByText('Trois secteurs au maximum. Retirez-en un pour en choisir un autre.'),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Continuer' }).click()

    await expect(page.getByRole('heading', { name: 'Votre projet avec REC 242' })).toBeVisible()
    await page.getByRole('button', { name: '1 à 3 ans' }).click()
    await page.getByRole('button', { name: 'Visibilité' }).click()
    await page.getByRole('button', { name: 'Continuer' }).click()

    await expect(page.getByRole('heading', { name: 'Votre paiement' })).toBeVisible()
    await page.getByRole('button', { name: /En deux tranches/ }).click()
    await expect(page.locator('.card-soft .line').last()).toContainText('52 500 FCFA')
    await page.fill('#b-momo', '06 555 12 34')
    await page.getByRole('button', { name: 'Continuer' }).click()

    await expect(page.getByRole('heading', { name: 'Vérifier et envoyer' })).toBeVisible()
    await page.getByRole('button', { name: 'Envoyer ma candidature' }).click()
    await expect(
      page.getByText('Cochez les deux cases pour envoyer votre candidature.'),
    ).toBeVisible()
    await page.getByRole('button', { name: /J’accepte que mes données/ }).click()
    await page.getByRole('button', { name: /J’ai lu les statuts/ }).click()
    // Le jeton anti-robot refuse un envoi trop rapide après l'affichage de la page.
    await page.waitForTimeout(1500)
    await page.getByRole('button', { name: 'Envoyer ma candidature' }).click()

    await expect(page).toHaveURL(/\/adherer\/merci/, { timeout: 30000 })
    await expect(page.locator('h1')).toHaveText('Candidature envoyée')
    const dossier = (await page.locator('.dossier').textContent())?.trim() ?? ''
    expect(dossier).toMatch(/^REC-C-\d{4}-\d{4}$/)
    await expect(
      page.getByText(/Paiement reçu : le reçu PAY-\d{4} vous a été envoyé par e-mail\./),
    ).toBeVisible({ timeout: 30000 })

    const confirmation = await waitForMail(email, debut, /est bien reçue/)
    expect(confirmation.subject).toContain(dossier)
    expect(confirmation.text).toContain('en catégorie B')
    await waitForMail('rec242.contact@gmail.com', debut, /Nouvelle candidature/).catch(async () =>
      waitForMail('Rec242.Contact@gmail.com', debut, /Nouvelle candidature/),
    )
    const recu = await waitForMail(email, debut, /^Reçu PAY-\d{4}/)
    expect(recu.text).toContain('52 500 FCFA')
  })

  test('doublon : message exact à l’étape 1', async ({ page }) => {
    await page.goto(`${BASE}/adherer/candidature`)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await etape1(page, email.toUpperCase(), '06 000 00 01')
    await expect(page.getByText(DOUBLON)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Vous' })).toBeVisible()
  })

  test('la page Merci n’est accessible que juste après l’envoi', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(`${BASE}/adherer/merci`)
    await expect(page).toHaveURL(`${BASE}/adherer`)
    await ctx.close()
  })

  test('back-office : le responsable membres fait passer le dossier de « Reçue » à « Acceptée »', async ({
    page,
  }) => {
    await login({ page, user: { email: 'beryl.bobanda@rec242.test', password: PWD } })
    await page.goto(`${BASE}/admin/collections/applications?statut=recue`)
    const href = await page
      .getByRole('row')
      .filter({ hasText: 'Boutique E2E' })
      .first()
      .getByRole('link', { name: 'Ouvrir' })
      .getAttribute('href')
    await page.goto(BASE + href, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Candidat Essai' })).toBeVisible({
      timeout: 60000,
    })
    await page.getByRole('button', { name: 'En examen', exact: true }).click()
    await expect(page.getByText('Statut mis à jour.')).toBeVisible({ timeout: 20000 })
    await page.waitForLoadState('networkidle')
    await page.getByLabel('Pièce d’identité vérifiée en main propre').check()
    await page.getByLabel('Charte de l’adhérent signée').check()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Acceptée', exact: true }).click()
    await expect(page.locator('.head-card .rec-badge')).toHaveText('Acceptée', { timeout: 20000 })
    await expect(page.getByRole('button', { name: 'Convertir en membre' })).toBeEnabled()
    await expect(page.locator('.tl').first()).toContainText('Statut : Acceptée')
  })
})
