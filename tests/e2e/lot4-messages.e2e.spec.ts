import { expect, test } from '@playwright/test'

import { login } from '../helpers/login'
import { waitForMail } from '../helpers/mailbox'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'

// Le jeton anti-robot refuse un envoi moins de 3 secondes après l'affichage du formulaire.
const patienter = (page: import('@playwright/test').Page) => page.waitForTimeout(3300)

test.describe.serial('Lot 4 : formulaires et messages', () => {
  const unique = `E2E ${Date.now()}`
  const email = `contact-${Date.now()}@e2e.test`

  test('contact : erreurs sous les champs, saisie conservée', async ({ page }) => {
    await page.goto(`${BASE}/contact`)
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByRole('alert').getByText('Deux champs sont à compléter')).toBeVisible()
    await expect(page.getByText('Indiquez votre nom.')).toBeVisible()
    await expect(page.locator('#b-c-nom')).toBeFocused()
    await page.fill('#b-c-nom', unique)
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.getByText('Indiquez un numéro ou un e-mail.')).toBeVisible()
    await expect(page.locator('#b-c-nom')).toHaveValue(unique)
  })

  test('contact : le motif est prérempli par l’adresse', async ({ page }) => {
    await page.goto(`${BASE}/contact?motif=Presse`)
    await expect(page.getByRole('button', { name: 'Presse', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByText('selon le motif choisi (Presse)')).toBeVisible()
  })

  test('contact : envoi, confirmation et accusé de réception', async ({ page }) => {
    const debut = new Date()
    await page.goto(`${BASE}/contact`)
    await page.fill('#b-c-nom', unique)
    await page.fill('#b-c-mail', email)
    await page.fill('#b-c-msg', 'Bonjour, quelle catégorie choisir pour ma boutique ?')
    await patienter(page)
    await page.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.locator('.okbox').getByText('Message envoyé')).toBeVisible()
    const mail = await waitForMail(email, debut, /bien reçu votre message/)
    expect(mail.text).toContain('responsable membres')
  })

  test('devenir partenaire : envoi et confirmation', async ({ page }) => {
    await page.goto(`${BASE}/devenir-partenaire`)
    await page.fill('#b-p-org', 'Organisation E2E')
    await page.fill('#b-p-nom', 'Contact E2E, directeur')
    await page.fill('#b-p-mail', `partenaire-${Date.now()}@e2e.test`)
    await page.fill('#b-p-msg', 'Nous souhaitons soutenir un atelier.')
    await patienter(page)
    await page.getByRole('button', { name: 'Envoyer la proposition' }).click()
    await expect(page.locator('.okbox').getByText('Proposition envoyée')).toBeVisible()
  })

  test('back-office : le responsable membres reçoit le message, répond par e-mail, le message passe à « Traité »', async ({
    page,
  }) => {
    await login({ page, user: { email: 'beryl.bobanda@rec242.test', password: PWD } })
    await page.goto(`${BASE}/admin/collections/contactMessages`)
    await expect(page.getByRole('heading', { name: 'Messages', level: 1 })).toBeVisible()
    // Routage : la demande de presse ne lui est pas transmise.
    await expect(page.getByText('Ruth Mavoungou, Congo Business Hebdo')).toHaveCount(0)
    await page.getByRole('listitem').filter({ hasText: unique }).click()
    await expect(page.locator('.who-a')).toContainText('Responsable membres')
    const debut = new Date()
    await page.fill('#bb-mrep', 'Bonjour, la catégorie A vous correspond. Bien cordialement.')
    await page.getByRole('button', { name: 'Envoyer la réponse' }).click()
    await expect(page.getByText(/Réponse envoyée par e-mail à/)).toBeVisible()
    const mail = await waitForMail(email, debut, /^Re : /)
    expect(mail.text).toContain('la catégorie A vous correspond')
    await expect(
      page.getByRole('listitem').filter({ hasText: unique }).getByText('Traité'),
    ).toBeVisible()
  })
})
