import { expect, test } from '@playwright/test'
import fs from 'fs'
import { getPayload, type Payload } from 'payload'

import config from '../../src/payload.config.js'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'
const unique = Date.now()
const PDF = fs.readFileSync('sources/logo-rec242.pdf')

/** Formulaire d'inscription personnalisé et aperçu : événement créé pour le test, supprimé à la fin. */
test.describe('Formulaire d’inscription d’un événement', () => {
  let payload: Payload
  let id: number
  let slug: string
  let brouillon: string

  test.beforeAll(async () => {
    payload = await getPayload({ config })
    const creer = (titre: string, statut: string) =>
      payload.create({
        collection: 'events',
        overrideAccess: true,
        data: {
          titre,
          debut: new Date(Date.now() + 10 * 86400e3).toISOString(),
          statut,
          acces: 'tous',
          questions: [
            { libelle: 'Votre repas', type: 'choix-unique', obligatoire: true, options: 'Viande\nPoisson', pour: 'tous' },
            { libelle: 'Vos thèmes', type: 'choix-multiple', options: 'Finance\nExport', pour: 'tous' },
            { libelle: 'Votre justificatif', type: 'fichier', pour: 'visiteurs' },
            { libelle: 'Votre commission', type: 'texte', obligatoire: true, pour: 'membres' },
          ],
        } as never,
      }) as unknown as Promise<{ id: number; slug: string }>
    const e = await creer(`Formulaire E2E ${unique}`, 'publie')
    id = e.id
    slug = e.slug
    brouillon = (await creer(`Brouillon E2E ${unique}`, 'brouillon')).slug
  })

  test.afterAll(async () => {
    const r = await payload.find({ collection: 'registrations', where: { evenement: { equals: id } }, overrideAccess: true, limit: 50 })
    for (const d of r.docs) await payload.db.deleteOne({ collection: 'registrations', where: { id: { equals: d.id } } })
    const f = await payload.find({ collection: 'inscriptionFichiers', overrideAccess: true, limit: 50, sort: '-createdAt' })
    for (const d of f.docs.slice(0, 1)) await payload.delete({ collection: 'inscriptionFichiers', id: d.id, overrideAccess: true })
    await payload.db.deleteMany({ collection: 'events', where: { titre: { contains: String(unique) } } })
  })

  test('un visiteur voit ses questions, les erreurs sous les champs, et s’inscrit avec un fichier', async ({ page }) => {
    await page.goto(`${BASE}/agenda/${slug}`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('group', { name: 'Votre repas' })).toBeVisible()
    await expect(page.getByLabel('Votre commission')).toHaveCount(0)
    await page.fill('#b-ev-nom', 'Visiteur E2E')
    await page.fill('#b-ev-mail', `formulaire-${unique}@e2e.test`)
    await page.waitForTimeout(3500)
    await page.getByRole('button', { name: 'M’inscrire', exact: true }).click()
    await expect(page.getByText('Cette question est obligatoire.')).toBeVisible()
    // La saisie reste en place après une erreur.
    await expect(page.locator('#b-ev-nom')).toHaveValue('Visiteur E2E')
    await page.getByLabel('Poisson').check()
    await page.getByLabel('Export').check()
    await page.getByLabel('Votre justificatif').setInputFiles({ name: 'piece.pdf', mimeType: 'application/pdf', buffer: PDF })
    await page.getByRole('button', { name: 'M’inscrire', exact: true }).click()
    await expect(page.getByText('Inscription confirmée')).toBeVisible()
    const r = await payload.find({ collection: 'registrations', where: { evenement: { equals: id } }, overrideAccess: true, depth: 0 })
    const reponses = (r.docs[0] as unknown as { reponses: { libelle: string; valeur: string; fichier?: number }[] }).reponses
    expect(reponses.map((x) => x.valeur)).toEqual(['Poisson', 'Export', 'piece.pdf'])
    expect(reponses[2].fichier).toBeTruthy()
  })

  test('un fichier qui n’est pas un vrai PDF est refusé', async ({ page }) => {
    await page.goto(`${BASE}/agenda/${slug}`, { waitUntil: 'networkidle' })
    await page.fill('#b-ev-nom', 'Visiteur Deux')
    await page.fill('#b-ev-mail', `formulaire2-${unique}@e2e.test`)
    await page.getByLabel('Viande').check()
    await page.getByLabel('Votre justificatif').setInputFiles({ name: 'faux.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<svg></svg>') })
    await page.getByRole('button', { name: 'M’inscrire', exact: true }).click()
    await expect(page.getByText('Fichier non accepté : PDF, JPG ou PNG.')).toBeVisible()
  })

  test('aperçu : réservé à l’équipe, brouillon visible, formulaire par public, inscription désactivée, réponses au back-office', async ({ page, request }) => {
    expect((await request.get(`${BASE}/apercu?type=events&slug=${brouillon}`, { maxRedirects: 0 })).status()).toBe(403)
    expect((await request.get(`${BASE}/agenda/${brouillon}`)).status()).toBe(404)

    await page.goto(`${BASE}/admin/login`)
    await page.fill('#field-email', 'ange.mouandza@rec242.test')
    await page.fill('#field-password', PWD)
    await page.click('.form-submit button')
    await page.waitForURL(/\/admin\/?$/, { timeout: 60000 })

    await page.goto(`${BASE}/apercu?type=events&slug=${brouillon}`)
    await expect(page).toHaveURL(new RegExp(`/agenda/${brouillon}$`))
    await expect(page.getByText('Aperçu des brouillons')).toBeVisible()
    await expect(page.getByRole('button', { name: 'M’inscrire', exact: true })).toBeDisabled()
    await expect(page.getByRole('group', { name: 'Votre repas' })).toBeVisible()
    await page.getByRole('link', { name: 'Vu par un membre' }).click()
    await expect(page.getByLabel('Votre commission')).toBeVisible()
    await page.goto(`${BASE}/apercu/quitter`)

    await page.goto(`${BASE}/admin/collections/events/${id}`)
    await page.getByRole('button', { name: /3 réponses/ }).or(page.getByText('3 réponses')).first().click()
    await expect(page.getByRole('link', { name: 'piece.pdf' })).toBeVisible()
    const lien = await page.getByRole('link', { name: 'piece.pdf' }).getAttribute('href')
    // Requêtes lancées depuis la page : comme un clic, elles partent du site et la session est reconnue.
    const statut = (u: string) => page.evaluate((x) => fetch(x).then((r) => r.status), u)
    expect(await statut(lien!)).toBe(200)
    expect((await request.get(`${BASE}${lien}`)).status()).toBe(403)

    const texte = await page.evaluate((x) => fetch(x).then((r) => r.text()), `/api/registrations/export?evenement=${id}`)
    expect(texte).toContain('Votre repas')
    expect(texte).toContain('Poisson')
  })
})
