import { getPayload, type CollectionSlug, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { Role } from '@/access/roles'
import { Media, oublierPortraitsCaches } from '@/collections/Media'
import { celluleCsv } from '@/lib/csv'

/**
 * Lot 12, sécurité (suite) : pièces des candidats, index de recherche, liens et logo d'une fiche, champs de l'équipe
 * dans une opportunité, demandes de modification, médiathèque, filtres sur un contenu réservé, exports CSV.
 * Les membres créés ici ont une adresse @e2e.test et sont supprimés en fin de fichier.
 */
let payload: Payload
const unique = Date.now()
const crees: { collection: CollectionSlug; id: number }[] = []

type Moi = { id: number; collection: 'members'; statut: string; entreprise: number }
let A: Moi

/** Utilisateur de l'équipe fictif : les fonctions d'accès ne lisent que la collection, les rôles et le statut. */
const equipe = (...roles: Role[]) => ({ id: 987654, collection: 'users', roles, statut: 'actif', email: 'x@int.test' }) as never

/** Appel venu de l'API REST (et non d'une action serveur, qui passe par l'API locale). */
const REST = { req: { payloadAPI: 'REST' } } as never

const creer = async (collection: CollectionSlug, data: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
  const d = (await payload.create({ collection, overrideAccess: true, context: { sansEmail: true, skipAudit: true }, data: data as never, ...extra })) as unknown as { id: number }
  crees.push({ collection, id: d.id })
  return d
}

/** Image PNG de 1 × 1 pixel. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64')
const image = (nom: string) => creer('media', { alt: `Image sécu ${nom}` }, { file: { data: PNG, mimetype: 'image/png', name: `secu-${nom}-${unique}.png`, size: PNG.length } })

const refuse = async (p: Promise<unknown>) => {
  await expect(p).rejects.toThrow()
}

beforeAll(async () => {
  payload = await getPayload({ config })
  const m = await creer('members', {
    email: `secu2-A-${unique}@e2e.test`,
    password: 'Mot-de-passe-test-1',
    prenom: 'Secu',
    nom: 'A2',
    categorie: 'B',
    statut: 'actif',
    telephone: `+24206${String(unique).slice(-6)}3`,
  })
  const e = await creer('companies', { nom: `Entreprise sécu 2 ${unique}`, titulaire: m.id, visibilite: { annuaire: false } })
  await payload.update({ collection: 'members', id: m.id, overrideAccess: true, data: { entreprise: e.id } as never, context: { sansMotif: true } })
  A = { id: m.id, collection: 'members', statut: 'actif', entreprise: e.id }
})

afterAll(async () => {
  for (const c of [...crees].reverse()) await payload.delete({ collection: c.collection, id: c.id, overrideAccess: true, context: { sansEmail: true } }).catch(() => null)
})

describe('Lot 12 : sécurité des accès (suite)', () => {
  it('les pièces des candidats ne sont lues que par les rôles qui traitent les dossiers', async () => {
    const lit = (roles: Role[]) => payload.find({ collection: 'pieces', user: equipe(...roles), overrideAccess: false, limit: 0, depth: 0 })
    await refuse(lit(['evenements']))
    await refuse(lit(['editeur']))
    expect((await lit(['membres'])).totalDocs).toBeGreaterThanOrEqual(0)
    expect((await lit(['tresorier'])).totalDocs).toBeGreaterThanOrEqual(0)
  })

  it('l’index de recherche ne s’écrit pas par l’API', async () => {
    const r = await payload.find({ collection: 'search', overrideAccess: true, limit: 1, depth: 0 })
    const entree = r.docs[0] as unknown as { id: number } | undefined
    if (entree) {
      await refuse(payload.update({ collection: 'search', id: entree.id, user: A as never, overrideAccess: false, data: { lien: 'https://hameconnage.example' } as never }))
      await refuse(payload.update({ collection: 'search', id: entree.id, user: equipe('editeur'), overrideAccess: false, data: { title: 'Piraté' } as never }))
      await refuse(payload.delete({ collection: 'search', id: entree.id, user: A as never, overrideAccess: false }))
    }
    await refuse(payload.create({ collection: 'search', user: A as never, overrideAccess: false, data: { title: 'x', doc: { relationTo: 'pages', value: 1 } } as never }))
  })

  it('une fiche refuse un lien non http, un texte trop long et un logo choisi par l’API', async () => {
    const maj = (data: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
      payload.update({ collection: 'companies', id: A.entreprise, user: A as never, overrideAccess: false, data: data as never, ...extra })
    await refuse(maj({ siteWeb: 'javascript:alert(1)' }))
    await refuse(maj({ linkedin: 'data:text/html,<script>alert(1)</script>' }))
    await refuse(maj({ facebook: `https://exemple.cg/${'a'.repeat(400)}` }))
    await refuse(maj({ services: 'x'.repeat(1300) }))
    await maj({ siteWeb: 'https://exemple.cg' })
    // Coordonnées masquées dans les textes publiés par le membre ; « recherches » réservé à l'équipe.
    await maj({ services: 'Appelez le +242 06 123 45 67', recherches: 'Champ de l’équipe' })
    const e = (await payload.findByID({ collection: 'companies', id: A.entreprise, overrideAccess: true, depth: 0 })) as unknown as {
      siteWeb?: string
      services?: string
      recherches?: string | null
      logo?: number | null
    }
    expect(e.siteWeb).toBe('https://exemple.cg')
    expect(e.services).not.toContain('123 45 67')
    expect(e.recherches ?? '').not.toBe('Champ de l’équipe')
    // Logo : le média d'un autre ne se rattache pas par l'API REST.
    const autre = await image('logo-etranger')
    await refuse(maj({ logo: autre.id }, REST))
    const apres = (await payload.findByID({ collection: 'companies', id: A.entreprise, overrideAccess: true, depth: 0 })) as unknown as { logo?: number | null }
    expect(apres.logo ?? null).not.toBe(autre.id)
  })

  it('un membre ne fixe ni le rang ni l’alerte d’une opportunité', async () => {
    const demain = new Date(Date.now() + 7 * 86400e3).toISOString()
    const o = (await payload.create({
      collection: 'opportunities',
      user: A as never,
      overrideAccess: false,
      context: { sansEmail: true },
      data: {
        type: 'partenariat',
        titre: `Annonce sécu 2 ${unique}`,
        description: 'Description de test assez longue.',
        dateLimite: demain,
        statut: 'publiee',
        rang: 1,
        alerteEnvoyee: true,
        publieLe: new Date().toISOString(),
        auteur: 'rec242',
      } as never,
    })) as unknown as { id: number; rang?: number | null; alerteEnvoyee?: boolean; publieLe?: string | null; auteur: string; statut: string }
    crees.push({ collection: 'opportunities', id: o.id })
    expect(o.rang ?? null).toBeNull()
    expect(o.alerteEnvoyee).toBe(false)
    expect(o.publieLe ?? null).toBeNull()
    expect(o.auteur).toBe('membre')
    expect(o.statut).toBe('a-moderer')
  })

  it('une demande de modification n’accepte ni traitement forgé ni justificatif choisi par l’API', async () => {
    const d = (await payload.create({
      collection: 'modificationRequests',
      user: A as never,
      overrideAccess: false,
      data: { champ: 'telephone', nouvelleValeur: '+242060000001', traiteParNom: 'Faux', motifRefus: 'Faux', dateTraitement: new Date().toISOString() } as never,
    })) as unknown as { id: number; traiteParNom?: string | null; motifRefus?: string | null; dateTraitement?: string | null; statut: string }
    crees.push({ collection: 'modificationRequests', id: d.id })
    expect(d.traiteParNom ?? null).toBeNull()
    expect(d.motifRefus ?? null).toBeNull()
    expect(d.dateTraitement ?? null).toBeNull()
    expect(d.statut).toBe('attente')
    const piece = await creer('pieces', { type: 'justificatif' }, { file: { data: PNG, mimetype: 'image/png', name: `secu-piece-${unique}.png`, size: PNG.length } })
    await refuse(
      payload.create({ collection: 'modificationRequests', user: A as never, overrideAccess: false, data: { champ: 'telephone', nouvelleValeur: '+242060000002', justificatif: piece.id } as never, ...(REST as object) }),
    )
  })

  it('la médiathèque : envoi réservé aux rôles qui éditent des contenus, portraits des membres non listés pour un visiteur', async () => {
    await refuse(payload.create({ collection: 'media', user: equipe('tresorier'), overrideAccess: false, data: { alt: 'x' } as never, file: { data: PNG, mimetype: 'image/png', name: `secu-t-${unique}.png`, size: PNG.length } }))
    const portrait = await image('portrait')
    await payload.update({ collection: 'members', id: A.id, overrideAccess: true, data: { photo: portrait.id } as never, context: { sansMotif: true } })
    await refuse(payload.update({ collection: 'media', id: portrait.id, user: equipe('evenements'), overrideAccess: false, data: { alt: 'Piraté' } as never }))
    // La liste des portraits est mise en cache 30 secondes.
    oublierPortraitsCaches()
    const visiteur = await payload.find({ collection: 'media', overrideAccess: false, where: { id: { equals: portrait.id } }, limit: 1, depth: 0 })
    expect(visiteur.totalDocs).toBe(0)
    const equipeLit = await payload.find({ collection: 'media', user: equipe('editeur'), overrideAccess: false, where: { id: { equals: portrait.id } }, limit: 1, depth: 0 })
    expect(equipeLit.totalDocs).toBe(1)
    const membreLit = await payload.find({ collection: 'media', user: A as never, overrideAccess: false, where: { id: { equals: portrait.id } }, limit: 1, depth: 0 })
    expect(membreLit.totalDocs).toBe(1)
    // Le fichier lui-même reste servi (fiche publique de l'annuaire, optimiseur d'images de Next).
    const lecture = Media.access!.read! as (a: unknown) => Promise<unknown>
    expect(await lecture({ req: { payload, user: null }, isReadingStaticFile: true })).toBe(true)
  })

  it('un visiteur ne filtre pas sur le corps d’une actualité réservée', async () => {
    const mot = `motsecret${unique}`
    const n = await creer('news', {
      titre: `Actualité réservée sécu ${unique}`,
      type: 'article',
      chapeau: 'Chapeau public.',
      reserveMembres: true,
      _status: 'published',
      corps: {
        root: {
          type: 'root',
          version: 1,
          direction: 'ltr',
          format: '',
          indent: 0,
          children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'text', version: 1, text: mot, format: 0, detail: 0, mode: 'normal', style: '' }] }],
        },
      },
    })
    let trouves: number[] = []
    try {
      const r = await payload.find({ collection: 'news', where: { 'corps.root.children.children.text': { like: mot } } as never, overrideAccess: false, depth: 0, limit: 10 })
      trouves = r.docs.map((d) => d.id as number)
    } catch {
      trouves = []
    }
    expect(trouves).not.toContain(n.id)
  })

  it('les cellules CSV ne deviennent jamais des formules', () => {
    expect(celluleCsv('=HYPERLINK("https://x","clic")')).toBe(`"'=HYPERLINK(""https://x"",""clic"")"`)
    expect(celluleCsv('+SUM(A1)')).toBe(`'+SUM(A1)`)
    expect(celluleCsv('-2+3')).toBe(`'-2+3`)
    expect(celluleCsv('@cmd')).toBe(`'@cmd`)
    expect(celluleCsv('\tx')).toBe(`'\tx`)
    // Les numéros de téléphone restent lisibles.
    expect(celluleCsv('+242 06 123 45 67')).toBe('+242 06 123 45 67')
    expect(celluleCsv('Nom ordinaire')).toBe('Nom ordinaire')
    expect(celluleCsv('a;b')).toBe('"a;b"')
    expect(celluleCsv('x', true)).toBe('"x"')
    expect(celluleCsv('=1', true)).toBe(`"'=1"`)
    expect(celluleCsv(null, true)).toBe('""')
  })
})
