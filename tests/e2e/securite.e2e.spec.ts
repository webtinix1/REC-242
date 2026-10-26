import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Lot 12, sécurité : en-têtes HTTP, pages protégées, API REST pour le visiteur, un membre contre un autre membre,
 * chacun des six rôles (docs/04-roles-et-droits.md, recette 20) et refus des requêtes d'une autre origine (CSRF).
 * Lecture seule sur les données de démonstration ; aucune donnée n'est créée.
 */
const BASE = 'http://localhost:3000'
const PWD = process.env.SEED_PASSWORD || 'Rec242-demo-2026'
const MEMBRE = 'christelle@kimiacreations.cg'

const connexion = async (request: APIRequestContext, collection: 'users' | 'members', email: string) => {
  const r = await request.post(`${BASE}/api/${collection}/login`, { data: { email, password: PWD } })
  expect(r.ok(), `connexion ${email}`).toBeTruthy()
  const j = await r.json()
  return { token: j.token as string, id: j.user.id as number }
}
const jwt = (token: string) => ({ Authorization: `JWT ${token}` })
const statut = async (request: APIRequestContext, chemin: string, token?: string) =>
  (await request.get(`${BASE}${chemin}`, { headers: token ? jwt(token) : {}, maxRedirects: 0 })).status()

test.describe.serial('Lot 12 : sécurité', () => {
  test('en-têtes de sécurité sur le site, l’espace membre, l’admin et l’API', async ({ request }) => {
    for (const chemin of ['/', '/espace-membre/connexion', '/admin/login', '/api/pages?limit=1']) {
      const r = await request.get(`${BASE}${chemin}`, { maxRedirects: 0 })
      const h = r.headers()
      expect(h['content-security-policy'], chemin).toContain("default-src 'self'")
      expect(h['content-security-policy'], chemin).toContain("frame-ancestors 'self'")
      expect(h['content-security-policy'], chemin).toContain("object-src 'none'")
      expect(h['x-content-type-options'], chemin).toBe('nosniff')
      expect(h['x-frame-options'], chemin).toBe('SAMEORIGIN')
      expect(h['referrer-policy'], chemin).toBe('strict-origin-when-cross-origin')
      // La caméra n'est ouverte qu'à l'admin (scanner de pointage).
      expect(h['permissions-policy'], chemin).toContain(chemin.startsWith('/admin') ? 'camera=(self)' : 'camera=()')
    }
  })

  test('pages protégées sans session', async ({ request }) => {
    for (const chemin of ['/espace-membre', '/espace-membre/profil', '/espace-membre/cotisation', '/espace-membre/echanges']) {
      const r = await request.get(`${BASE}${chemin}`, { maxRedirects: 0 })
      expect([307, 308, 303, 302], chemin).toContain(r.status())
      expect(r.headers().location, chemin).toContain('/espace-membre/connexion')
    }
    for (const chemin of ['/espace-membre/mes-donnees', '/espace-membre/carte/pdf', '/espace-membre/cotisation/recu/1'])
      expect(await statut(request, chemin), chemin).toBeGreaterThanOrEqual(300)
    // L'admin redirige vers la connexion, par un en-tête ou, une fois le rendu commencé, dans le flux de la page (NEXT_REDIRECT).
    const admin = await request.get(`${BASE}/admin`, { maxRedirects: 0 })
    if (admin.status() === 200) expect(await admin.text()).toContain('NEXT_REDIRECT;replace;/admin/login;')
    else {
      expect([302, 303, 307, 308]).toContain(admin.status())
      expect(admin.headers().location).toContain('/admin/login')
    }
    expect(await statut(request, '/apercu?type=pages&slug=accueil')).toBe(403)
  })

  test('le visiteur ne lit rien de réservé par l’API', async ({ request }) => {
    for (const c of ['members', 'companies', 'payments', 'dues', 'registrations', 'opportunityReplies', 'connectionRequests', 'expertRequests', 'networkMessages', 'modificationRequests', 'pieces', 'applications', 'auditLog', 'users', 'contactMessages', 'disciplinaryCases', 'commissionRequests', 'directoryAds'])
      expect(await statut(request, `/api/${c}?limit=1`), c).toBe(403)
    const docs = await (await request.get(`${BASE}/api/documents?limit=200&depth=0`)).json()
    expect(docs.docs.every((d: { visibilite: string }) => d.visibilite === 'public')).toBe(true)
    const fichiers = await (await request.get(`${BASE}/api/fichiers?limit=200&depth=0`)).json()
    expect(fichiers.docs.every((d: { visibilite: string }) => d.visibilite === 'public')).toBe(true)
    const settings = await (await request.get(`${BASE}/api/globals/settings`)).json()
    expect(settings.whatsapp?.lienGroupe).toBeUndefined()
    expect(settings.alertes?.adresseAlerte).toBeUndefined()
    expect(await statut(request, '/api/admin-badges')).toBe(401)
    expect(await statut(request, '/api/members/export')).toBe(403)
    expect(await statut(request, '/api/payments/export')).toBe(403)
  })

  test('un document réservé n’est pas téléchargeable sans session', async ({ request }) => {
    const { token } = await connexion(request, 'members', MEMBRE)
    const reserves = await (await request.get(`${BASE}/api/documents?where[visibilite][equals]=membres&limit=1&depth=0`, { headers: jwt(token) })).json()
    test.skip(!reserves.docs.length, 'aucun document réservé aux membres dans les données de démonstration')
    const d = reserves.docs[0] as { id: number; filename: string }
    expect(await statut(request, `/api/documents/${d.id}/telecharger`)).toBe(404)
    expect(await statut(request, `/api/documents/file/${encodeURIComponent(d.filename)}`)).toBeGreaterThanOrEqual(400)
    expect(await statut(request, `/api/documents/${d.id}/telecharger`, token)).toBe(200)
  })

  test('un membre ne lit ni ne modifie les données d’un autre membre', async ({ request }) => {
    const moi = await connexion(request, 'members', MEMBRE)
    const resp = await connexion(request, 'users', 'beryl.bobanda@rec242.test')
    const tous = await (await request.get(`${BASE}/api/members?limit=50&depth=0`, { headers: jwt(resp.token) })).json()
    const autre = (tous.docs as { id: number; entreprise?: number }[]).find((m) => m.id !== moi.id && m.entreprise)
    expect(autre).toBeTruthy()

    const h = jwt(moi.token)
    const membres = await (await request.get(`${BASE}/api/members?limit=100&depth=0`, { headers: h })).json()
    expect(membres.docs.map((m: { id: number }) => m.id)).toEqual([moi.id])
    expect([403, 404]).toContain(await statut(request, `/api/members/${autre!.id}`, moi.token))
    expect([403, 404]).toContain(await statut(request, `/api/companies/${autre!.entreprise}`, moi.token))
    for (const c of ['payments', 'dues', 'registrations', 'modificationRequests', 'expertRequests', 'commissionRequests', 'directoryAds']) {
      const r = await (await request.get(`${BASE}/api/${c}?limit=200&depth=0`, { headers: h })).json()
      expect(r.docs.every((d: { membre?: number }) => d.membre === moi.id), c).toBe(true)
    }
    const rel = await (await request.get(`${BASE}/api/connectionRequests?limit=200&depth=0`, { headers: h })).json()
    expect(rel.docs.every((d: { demandeur: number; destinataire: number }) => d.demandeur === moi.id || d.destinataire === moi.id)).toBe(true)
    const msgs = await (await request.get(`${BASE}/api/networkMessages?limit=200&depth=0`, { headers: h })).json()
    expect(msgs.docs.every((d: { membre?: number; tous?: boolean }) => d.tous || d.membre === moi.id)).toBe(true)
    for (const c of ['pieces', 'applications', 'auditLog', 'users', 'contactMessages', 'disciplinaryCases'])
      expect(await statut(request, `/api/${c}?limit=1`, moi.token), c).toBe(403)

    // Écritures refusées chez un autre membre ; champs vérifiés ignorés sur sa propre fiche.
    const patch = (chemin: string, data: unknown) => request.patch(`${BASE}${chemin}`, { headers: h, data })
    expect((await patch(`/api/members/${autre!.id}`, { fonction: 'Piraté' })).ok()).toBeFalsy()
    expect((await patch(`/api/companies/${autre!.entreprise}`, { services: 'Piraté' })).ok()).toBeFalsy()
    const avant = await (await request.get(`${BASE}/api/members/${moi.id}?depth=0`, { headers: h })).json()
    await patch(`/api/members/${moi.id}`, { telephone: '+242069999999', numeroAdherent: 'REC-PIRATE', statut: 'actif' })
    const apres = await (await request.get(`${BASE}/api/members/${moi.id}?depth=0`, { headers: h })).json()
    expect(apres.telephone).toBe(avant.telephone)
    expect(apres.numeroAdherent).toBe(avant.numeroAdherent)
    expect((await request.post(`${BASE}/api/payments`, { headers: h, data: { membre: moi.id, objet: 'cotisation', montant: 1, mode: 'especes' } })).status()).toBe(403)
  })

  test('chaque rôle de l’équipe lit selon la matrice', async ({ request }) => {
    const matrice: Record<string, Record<string, boolean>> = {
      'ange.mouandza@rec242.test': { members: true, payments: true, auditLog: true, users: true, disciplinaryCases: true, applications: true },
      'eve@rec242.test': { members: true, payments: true, auditLog: true, disciplinaryCases: true, counters: false },
      'yohan.dinga@rec242.test': { members: false, payments: false, applications: false, auditLog: false, disciplinaryCases: false, connectionRequests: false, registrations: false },
      'pathurel.nkoua@rec242.test': { members: true, registrations: true, payments: false, dues: false, applications: false, disciplinaryCases: false, connectionRequests: false, expertRequests: false, directoryAds: false },
      'beryl.bobanda@rec242.test': { members: true, applications: true, payments: true, dues: true, disciplinaryCases: true, connectionRequests: true, auditLog: false },
      'tresorier@rec242.test': { members: true, applications: true, payments: true, dues: true, disciplinaryCases: false, connectionRequests: false, auditLog: false },
    }
    for (const [email, lignes] of Object.entries(matrice)) {
      const { token } = await connexion(request, 'users', email)
      for (const [c, ok] of Object.entries(lignes)) {
        const s = await statut(request, `/api/${c}?limit=1&depth=0`, token)
        expect([email, c, s === 200]).toEqual([email, c, ok])
      }
    }
  })

  test('une requête d’une autre origine n’utilise pas le cookie de session (CSRF)', async ({ request }) => {
    const { token, id } = await connexion(request, 'members', MEMBRE)
    const cookie = { Cookie: `payload-token=${token}` }
    const meme = await (await request.get(`${BASE}/api/members/me`, { headers: { ...cookie, Origin: BASE } })).json()
    expect(meme.user?.id).toBe(id)
    const autre = await (await request.get(`${BASE}/api/members/me`, { headers: { ...cookie, Origin: 'https://evil.example' } })).json()
    expect(autre.user).toBeNull()
    const sansOrigine = await (await request.get(`${BASE}/api/members/me`, { headers: { ...cookie, 'Sec-Fetch-Site': 'cross-site' } })).json()
    expect(sansOrigine.user).toBeNull()
    const ecriture = await request.patch(`${BASE}/api/members/${id}`, { headers: { ...cookie, Origin: 'https://evil.example' }, data: { fonction: 'CSRF' } })
    expect(ecriture.ok()).toBeFalsy()
  })

  test('un lien d’e-mail vers l’espace membre passe par la page d’ouverture du site', async ({ request }) => {
    const { token } = await connexion(request, 'members', MEMBRE)
    const r = await request.get(`${BASE}/espace-membre/profil`, {
      headers: { Cookie: `payload-token=${token}`, 'Sec-Fetch-Site': 'cross-site', 'Sec-Fetch-Mode': 'navigate' },
      maxRedirects: 0,
    })
    expect(r.status()).toBe(307)
    expect(r.headers().location).toContain('/espace-membre/ouverture?vers=%2Fespace-membre%2Fprofil')
    // La page d'ouverture ne suit que des adresses de l'espace membre.
    const html = await (await request.get(`${BASE}/espace-membre/ouverture?vers=https://evil.example`)).text()
    expect(html).toContain('url=/espace-membre"')
  })
})
