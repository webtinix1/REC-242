import { expect, test, type APIRequestContext } from '@playwright/test'

import { waitForMail } from '../helpers/mailbox'

const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'
// Les cookies de session ne valent que pour une requête du même site (contrôle CSRF de Payload).
const MEME_ORIGINE = { 'Sec-Fetch-Site': 'same-origin' }
const n = Date.now()
const email = `membre-${n}@e2e.test`

const staff = async (request: APIRequestContext) => {
  const r = await request.post(`${BASE}/api/users/login`, { data: { email: 'beryl.bobanda@rec242.test', password: PWD } })
  expect(r.ok()).toBeTruthy()
  return { Authorization: `JWT ${(await r.json()).token}` }
}

test.describe.serial('Lot 6 : espace membre', () => {
  test.describe.configure({ timeout: 180000 })

  test('candidature acceptée → conversion → activation → connexion → carte', async ({ page, request }) => {
    const headers = await staff(request)
    const [loc, sec] = await Promise.all([
      (await request.get(`${BASE}/api/localities?limit=1`, { headers })).json(),
      (await request.get(`${BASE}/api/sectors?limit=1`, { headers })).json(),
    ])
    const c = await request.post(`${BASE}/api/applications`, {
      headers,
      data: {
        nom: 'Parcours',
        prenom: 'Membre',
        email,
        telephone: `+242 06 ${String(n).slice(-3)} ${String(n).slice(-5, -3)} ${String(n).slice(-7, -5)}`,
        trancheAge: '26-35',
        raisonSociale: `Boutique ${n}`,
        localite: loc.docs[0].id,
        description: 'Activité de test',
        secteurs: [sec.docs[0].id],
        anciennete: '1-3',
        objectifs: ['affaires'],
        categorie: 'B',
        consentement: true,
        acceptationTextes: true,
        autorisations: { annuaire: true },
      },
    })
    expect(c.ok(), await c.text()).toBeTruthy()
    const id = (await c.json()).doc.id
    expect((await request.patch(`${BASE}/api/applications/${id}`, { headers, data: { statut: 'acceptee', pieceVerifiee: true, charteSignee: true } })).ok()).toBeTruthy()
    const debut = new Date()
    const conv = await request.post(`${BASE}/api/applications/${id}/convertir`, { headers, data: {} })
    expect(conv.ok()).toBeTruthy()
    const { numeroAdherent } = await conv.json()
    expect(numeroAdherent).toMatch(/^REC-\d{4}-\d{4}$/)

    const mail = await waitForMail(email, debut, /activez votre espace/)
    const jeton = /espace-membre\/activation\/([\w-]+)/.exec(mail.html)?.[1]
    expect(jeton).toBeTruthy()

    // Activation : mot de passe trop court refusé, conditions obligatoires.
    await page.goto(`${BASE}/espace-membre/activation/${jeton}`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toHaveText('Bienvenue dans le réseau')
    await page.fill('#mb-a1', 'court')
    await page.fill('#mb-a2', 'court')
    await page.getByRole('button', { name: 'Activer mon espace' }).click()
    await expect(page.locator('#mb-a1-err')).toHaveText('10 caractères minimum.')
    await page.fill('#mb-a1', 'Parcours-membre-2026')
    await page.fill('#mb-a2', 'Parcours-membre-2026')
    await page.getByLabel(/conditions d'utilisation/).check()
    await page.getByRole('button', { name: 'Activer mon espace' }).click()
    await page.waitForURL(`${BASE}/espace-membre`, { timeout: 60000 })
    await expect(page.locator('h1')).toHaveText('Bonjour, Membre')

    // Carte : numéro, QR signé, PDF.
    await page.goto(`${BASE}/espace-membre/carte`, { waitUntil: 'networkidle' })
    await expect(page.locator('.bigcard')).toContainText(numeroAdherent)
    await expect(page.locator('.bigcard .qr svg')).toBeVisible()
    const pdf = await page.request.get(`${BASE}/espace-membre/carte/pdf`, { headers: MEME_ORIGINE })
    expect(pdf.headers()['content-type']).toBe('application/pdf')

    // Déconnexion puis reconnexion par le formulaire ; le lien d'activation ne sert plus.
    await page.getByRole('button', { name: 'Se déconnecter' }).first().click()
    await page.waitForURL(/connexion/)
    await page.goto(`${BASE}/espace-membre/activation/${jeton}`, { waitUntil: 'networkidle' })
    await expect(page.locator('h1')).toHaveText("Ce lien n'est plus valable")
    await page.goto(`${BASE}/espace-membre/connexion`, { waitUntil: 'networkidle' })
    await page.fill('#mb-mail', email)
    await page.fill('#mb-pw', 'mauvais-mot-de-passe')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.locator('p.erreur')).toHaveText('E-mail ou mot de passe incorrect.')
    await page.fill('#mb-pw', 'Parcours-membre-2026')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL(`${BASE}/espace-membre`, { timeout: 60000 })
  })

  test('accès protégé, membre suspendu et page profil', async ({ page }) => {
    await page.goto(`${BASE}/espace-membre/profil`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/connexion\?retour=%2Fespace-membre%2Fprofil/)
    // Membre suspendu de démonstration.
    await page.fill('#mb-mail', 'leon.massamba@membres.rec242.test')
    await page.fill('#mb-pw', PWD)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.locator('h1')).toHaveText('Votre accès est suspendu', { timeout: 60000 })

    await page.goto(`${BASE}/espace-membre/connexion?retour=/espace-membre/profil`, { waitUntil: 'networkidle' })
    await page.fill('#mb-mail', 'christelle@kimiacreations.cg')
    await page.fill('#mb-pw', PWD)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await page.waitForURL(`${BASE}/espace-membre/profil`, { timeout: 60000 })
    await expect(page.locator('h1')).toHaveText('Mon profil et mon entreprise')
    await expect(page.locator('.lock').filter({ hasText: 'Raison sociale' })).toContainText('Kimia Créations')
    // Un membre n'a pas accès à l'administration ni aux fiches des autres.
    const autres = await page.request.get(`${BASE}/api/members?limit=50`, { headers: MEME_ORIGINE })
    const j = await autres.json()
    expect(j.docs.map((d: { email: string }) => d.email)).toEqual(['christelle@kimiacreations.cg'])
  })
})
