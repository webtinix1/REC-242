import fs from 'fs'
import path from 'path'
import { getPayload, type CollectionSlug, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { Role } from '@/access/roles'
import { ouvrirSession } from '@/lib/membres/session'

/**
 * Lot 12, sécurité : droits de lecture et d'écriture par l'API locale avec `overrideAccess: false`, pour le visiteur,
 * deux membres (l'un ne lit jamais les données de l'autre) et chacun des six rôles de docs/04-roles-et-droits.md.
 * Les membres créés ici ont une adresse @e2e.test et sont supprimés en fin de fichier.
 */
let payload: Payload
const unique = Date.now()
const crees: { collection: CollectionSlug; id: number }[] = []

type Moi = { id: number; collection: 'members'; statut: string; entreprise: number }
let A: Moi
let B: Moi

/** Utilisateur de l'équipe fictif : les fonctions d'accès ne lisent que la collection, les rôles et le statut. */
const equipe = (...roles: Role[]) => ({ id: 987654, collection: 'users', roles, statut: 'actif', email: 'x@int.test' }) as never

const creer = async (collection: CollectionSlug, data: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
  const d = (await payload.create({ collection, overrideAccess: true, context: { sansEmail: true, skipAudit: true }, data: data as never, ...extra })) as unknown as { id: number }
  crees.push({ collection, id: d.id })
  return d
}

const membre = async (n: string): Promise<Moi> => {
  const m = await creer('members', {
    email: `secu-${n}-${unique}@e2e.test`,
    password: 'Mot-de-passe-test-1',
    prenom: 'Secu',
    nom: n,
    categorie: 'B',
    statut: 'actif',
    telephone: `+24206${String(unique).slice(-6)}${n === 'A' ? '1' : '2'}`,
  })
  const e = await creer('companies', { nom: `Entreprise sécu ${n} ${unique}`, titulaire: m.id, visibilite: { annuaire: false } })
  await payload.update({ collection: 'members', id: m.id, overrideAccess: true, data: { entreprise: e.id } as never, context: { sansMotif: true } })
  return { id: m.id, collection: 'members', statut: 'actif', entreprise: e.id }
}

/** Nombre de documents lus, ou « refus » si la lecture est interdite. */
const lit = async (collection: CollectionSlug, user: unknown, where?: Record<string, unknown>): Promise<number | 'refus'> => {
  try {
    const r = await payload.find({ collection, user: user as never, overrideAccess: false, depth: 0, limit: 0, where: where as never })
    return r.totalDocs
  } catch {
    return 'refus'
  }
}

const refuse = async (p: Promise<unknown>) => {
  await expect(p).rejects.toThrow()
}

beforeAll(async () => {
  payload = await getPayload({ config })
  A = await membre('A')
  B = await membre('B')
  // Données de A : paiement, échéance, demande de modification, message du réseau, demande à rejoindre une commission.
  await creer('payments', { membre: A.id, objet: 'cotisation', montant: 1000, mode: 'especes', statut: 'en-attente' })
  await creer('networkMessages', { membre: A.id, titre: 'Message sécu', texte: 'Réservé à A.' })
  await creer('modificationRequests', { membre: A.id, champ: 'telephone', nouvelleValeur: '+242060000000' })
})

afterAll(async () => {
  for (const c of [...crees].reverse()) await payload.delete({ collection: c.collection, id: c.id, overrideAccess: true, context: { sansEmail: true } }).catch(() => null)
})

const SENSIBLES: CollectionSlug[] = [
  'members',
  'companies',
  'payments',
  'dues',
  'registrations',
  'opportunityReplies',
  'connectionRequests',
  'expertRequests',
  'networkMessages',
  'modificationRequests',
  'commissionRequests',
  'directoryAds',
  'pieces',
  'applications',
  'auditLog',
  'users',
  'contactMessages',
  'disciplinaryCases',
  'counters',
]

describe('Lot 12 : sécurité des accès', () => {
  it('un visiteur ne lit aucune collection sensible', async () => {
    for (const c of SENSIBLES) expect([c, await lit(c, undefined)]).toEqual([c, 'refus'])
    const docs = await payload.find({ collection: 'documents', overrideAccess: false, limit: 500, depth: 0 })
    expect(docs.docs.every((d) => d.visibilite === 'public')).toBe(true)
    const fichiers = await payload.find({ collection: 'fichiers', overrideAccess: false, limit: 500, depth: 0 })
    expect(fichiers.docs.every((d) => (d as unknown as { visibilite: string }).visibilite === 'public')).toBe(true)
    for (const [c, champ] of [['faq', 'visible'], ['people', 'visible'], ['partners', 'conventionSignee'], ['testimonials', 'accordPublication']] as const) {
      const r = await payload.find({ collection: c, overrideAccess: false, limit: 500, depth: 0 })
      expect(r.docs.every((d) => (d as unknown as Record<string, unknown>)[champ] === true)).toBe(true)
    }
  })

  it('un membre ne lit que ses propres données', async () => {
    // Propriétaire de chaque collection : un membre ne doit jamais voir une ligne d'un autre.
    const proprietaires: [CollectionSlug, string[]][] = [
      ['members', ['id']],
      ['companies', ['titulaire']],
      ['payments', ['membre']],
      ['dues', ['membre']],
      ['registrations', ['membre']],
      ['expertRequests', ['membre']],
      ['modificationRequests', ['membre']],
      ['commissionRequests', ['membre']],
      ['directoryAds', ['membre']],
      ['connectionRequests', ['demandeur', 'destinataire']],
    ]
    for (const [c, champs] of proprietaires) {
      const r = await payload.find({ collection: c, user: B as never, overrideAccess: false, depth: 0, limit: 500 })
      for (const d of r.docs as unknown as Record<string, unknown>[]) {
        const ids = champs.map((k) => (d[k] && typeof d[k] === 'object' ? (d[k] as { id: number }).id : d[k]))
        expect([c, ids.includes(B.id)]).toEqual([c, true])
      }
    }
    const msgs = await payload.find({ collection: 'networkMessages', user: B as never, overrideAccess: false, depth: 0, limit: 500 })
    expect(msgs.docs.every((d) => (d as unknown as { tous?: boolean }).tous || (d as unknown as { membre?: number }).membre === B.id)).toBe(true)
    const reps = await payload.find({ collection: 'opportunityReplies', user: B as never, overrideAccess: false, depth: 1, limit: 500 })
    for (const d of reps.docs as unknown as { membre?: number | { id: number }; opportunite?: { membre?: number | { id: number } } }[]) {
      const id = (x?: number | { id: number }) => (x && typeof x === 'object' ? x.id : x)
      expect(id(d.membre) === B.id || id(d.opportunite?.membre) === B.id).toBe(true)
    }
    // Les données de A existent, mais B ne les voit pas.
    expect(await lit('payments', A, { membre: { equals: A.id } })).toBeGreaterThan(0)
    expect(await lit('payments', B, { membre: { equals: A.id } })).toBe(0)
    expect(await lit('networkMessages', B, { membre: { equals: A.id } })).toBe(0)
    expect(await lit('modificationRequests', B, { membre: { equals: A.id } })).toBe(0)
    await refuse(payload.findByID({ collection: 'members', id: A.id, user: B as never, overrideAccess: false }))
    await refuse(payload.findByID({ collection: 'companies', id: A.entreprise, user: B as never, overrideAccess: false }))
    // Documents : jamais le document personnel d'un autre membre ni ceux du comité.
    const docs = await payload.find({ collection: 'documents', user: B as never, overrideAccess: false, limit: 500, depth: 0 })
    for (const d of docs.docs as unknown as { visibilite: string; membre?: number | { id: number } }[]) {
      expect(d.visibilite).not.toBe('comite')
      if (d.visibilite === 'personnel') expect(typeof d.membre === 'object' ? d.membre?.id : d.membre).toBe(B.id)
    }
    const fichiers = await payload.find({ collection: 'fichiers', user: B as never, overrideAccess: false, limit: 500, depth: 0 })
    for (const f of fichiers.docs as unknown as { visibilite: string; proprietaire?: number; destinataire?: number }[])
      if (f.visibilite === 'prive') expect([f.proprietaire, f.destinataire]).toContain(B.id)
    // Collections de l'équipe.
    for (const c of ['pieces', 'applications', 'auditLog', 'users', 'contactMessages', 'disciplinaryCases', 'counters'] as CollectionSlug[])
      expect([c, await lit(c, B)]).toEqual([c, 'refus'])
  })

  it('un membre n’écrit ni chez un autre, ni dans les champs vérifiés, ni dans les collections de l’équipe', async () => {
    await refuse(payload.update({ collection: 'members', id: A.id, user: B as never, overrideAccess: false, data: { fonction: 'Piraté' } as never }))
    await refuse(payload.update({ collection: 'companies', id: A.entreprise, user: B as never, overrideAccess: false, data: { services: 'Piraté' } as never }))
    // Champs vérifiés : ignorés (ils ne changent que par une demande validée).
    await payload.update({ collection: 'members', id: B.id, user: B as never, overrideAccess: false, data: { telephone: '+242069999999', statut: 'actif', numeroAdherent: 'REC-PIRATE' } as never })
    const b = (await payload.findByID({ collection: 'members', id: B.id, overrideAccess: true })) as unknown as { telephone: string; numeroAdherent?: string }
    expect(b.telephone).not.toBe('+242069999999')
    expect(b.numeroAdherent).not.toBe('REC-PIRATE')
    await payload.update({ collection: 'companies', id: B.entreprise, user: B as never, overrideAccess: false, data: { nom: 'Raison piratée', masqueeParAdmin: false } as never })
    expect(((await payload.findByID({ collection: 'companies', id: B.entreprise, overrideAccess: true })) as unknown as { nom: string }).nom).not.toBe('Raison piratée')
    await refuse(payload.create({ collection: 'payments', user: B as never, overrideAccess: false, data: { membre: B.id, objet: 'cotisation', montant: 1, mode: 'especes', statut: 'paye' } as never }))
    await refuse(payload.create({ collection: 'dues', user: B as never, overrideAccess: false, data: { membre: B.id } as never }))
    await refuse(payload.create({ collection: 'networkMessages', user: B as never, overrideAccess: false, data: { tous: true, titre: 'x', texte: 'x' } as never }))
    await refuse(payload.create({ collection: 'fichiers', user: B as never, overrideAccess: false, data: { visibilite: 'public' } as never }))
    await refuse(payload.update({ collection: 'users', id: 1, user: B as never, overrideAccess: false, data: { roles: ['superadmin'] } as never }))
    await refuse(payload.updateGlobal({ slug: 'settings', user: B as never, overrideAccess: false, data: { seo: { titre: 'Piraté' } } as never }))
  })

  it('une pièce jointe envoyée par un membre est forcément l’une des siennes', async () => {
    // Un vrai PDF : Payload contrôle le type réel du fichier.
    const pdf = fs.readFileSync(path.resolve(process.cwd(), 'seed/fichiers/charte-adherent.pdf'))
    const f = await creer('fichiers', { visibilite: 'prive', proprietaire: A.id }, { file: { data: pdf, mimetype: 'application/pdf', name: `secu-${unique}.pdf`, size: pdf.length } })
    const demain = new Date(Date.now() + 7 * 86400e3).toISOString()
    await expect(
      payload.create({
        collection: 'opportunities',
        user: B as never,
        overrideAccess: false,
        data: { type: 'partenariat', titre: `Annonce E2E sécu ${unique}`, description: 'Description de test assez longue.', dateLimite: demain, statut: 'brouillon', pieceJointe: f.id } as never,
      }),
    ).rejects.toThrow(/Pièce jointe/)
    await refuse(payload.findByID({ collection: 'fichiers', id: f.id, user: B as never, overrideAccess: false }))
    expect((await payload.findByID({ collection: 'fichiers', id: f.id, user: A as never, overrideAccess: false })).id).toBe(f.id)
  })

  it('chaque rôle de l’équipe n’a que les droits de la matrice', async () => {
    // true : lecture permise ; false : refus.
    const attendu: Record<Role, Partial<Record<CollectionSlug, boolean>>> = {
      superadmin: { members: true, payments: true, dues: true, applications: true, auditLog: true, users: true, disciplinaryCases: true, connectionRequests: true, directoryAds: true, counters: true },
      admin: { members: true, payments: true, dues: true, applications: true, auditLog: true, users: true, disciplinaryCases: true, connectionRequests: true, counters: false },
      editeur: { members: false, companies: false, payments: false, dues: false, applications: false, auditLog: false, pieces: false, disciplinaryCases: false, connectionRequests: false, expertRequests: false, registrations: false, commissionRequests: true, directoryAds: false },
      evenements: { members: true, registrations: true, payments: false, dues: false, applications: false, auditLog: false, pieces: true, disciplinaryCases: false, connectionRequests: false, expertRequests: false, networkMessages: false, commissionRequests: false, directoryAds: false },
      membres: { members: true, applications: true, payments: true, dues: true, registrations: true, disciplinaryCases: true, connectionRequests: true, expertRequests: true, commissionRequests: true, directoryAds: true, auditLog: false, users: true },
      tresorier: { members: true, applications: true, payments: true, dues: true, directoryAds: true, disciplinaryCases: false, connectionRequests: false, expertRequests: false, registrations: false, auditLog: false },
    }
    for (const [role, lignes] of Object.entries(attendu) as [Role, Partial<Record<CollectionSlug, boolean>>][])
      for (const [c, ok] of Object.entries(lignes) as [CollectionSlug, boolean][]) {
        const r = await lit(c, equipe(role))
        expect([role, c, r !== 'refus']).toEqual([role, c, ok])
      }
    // L'équipe d'un rôle « utilisateurs » autre que super admin ne voit que son propre compte.
    expect(await lit('users', equipe('membres'))).toBe(0)
    // Écritures réservées.
    await refuse(payload.create({ collection: 'users', user: equipe('admin'), overrideAccess: false, data: { email: `x-${unique}@int.test`, name: 'x', password: 'Mot-de-passe-test-2026', roles: ['admin'] } as never }))
    await refuse(payload.create({ collection: 'disciplinaryCases', user: equipe('membres'), overrideAccess: false, data: { membre: A.id } as never }))
    await refuse(payload.create({ collection: 'payments', user: equipe('membres'), overrideAccess: false, data: { membre: A.id, objet: 'cotisation', montant: 1, mode: 'especes' } as never }))
    await refuse(payload.update({ collection: 'members', id: A.id, user: equipe('tresorier'), overrideAccess: false, data: { fonction: 'x' } as never }))
    await refuse(payload.update({ collection: 'members', id: A.id, user: equipe('evenements'), overrideAccess: false, data: { fonction: 'x' } as never }))
    await refuse(payload.update({ collection: 'members', id: A.id, user: equipe('editeur'), overrideAccess: false, data: { fonction: 'x' } as never }))
    // Un compte désactivé n'a plus aucun droit.
    const desactive = { id: 987654, collection: 'users', roles: ['superadmin'], statut: 'desactive' } as never
    expect(await lit('members', desactive)).toBe('refus')
  })

  it('l’éditeur ne modifie pas les paramètres et le public ne lit pas les alertes', async () => {
    const avant = (await payload.findGlobal({ slug: 'settings', overrideAccess: true })) as unknown as { adresse?: string }
    await payload.updateGlobal({ slug: 'settings', user: equipe('editeur'), overrideAccess: false, context: { skipAudit: true }, data: { adresse: `Adresse pirate ${unique}` } as never })
    const apres = (await payload.findGlobal({ slug: 'settings', overrideAccess: true })) as unknown as { adresse?: string }
    expect(apres.adresse).toBe(avant.adresse)
    const complet = (await payload.findGlobal({ slug: 'settings', overrideAccess: true })) as unknown as { alertes?: Record<string, unknown> }
    await payload.updateGlobal({
      slug: 'settings',
      overrideAccess: true,
      context: { skipAudit: true },
      data: { alertes: { ...complet.alertes, adresseAlerte: 'alerte@int.test', reponsesTypes: [{ titre: 'Interne', texte: 'Texte interne' }] } } as never,
    })
    try {
      const pub = (await payload.findGlobal({ slug: 'settings', overrideAccess: false })) as unknown as { alertes?: Record<string, unknown> }
      expect(pub.alertes?.adresseAlerte).toBeUndefined()
      // Payload remplace un tableau illisible par une liste vide.
      expect(pub.alertes?.reponsesTypes ?? []).toEqual([])
      const vu = (await payload.findGlobal({ slug: 'settings', user: equipe('membres'), overrideAccess: false })) as unknown as { alertes?: { reponsesTypes?: unknown[] } }
      expect(vu.alertes?.reponsesTypes).toHaveLength(1)
    } finally {
      await payload.updateGlobal({ slug: 'settings', overrideAccess: true, context: { skipAudit: true }, data: { alertes: complet.alertes } as never })
    }
  })

  it('suspendre un membre ferme ses sessions ouvertes', async () => {
    await ouvrirSession(payload, B.id)
    const lire = async () => ((await payload.db.findOne({ collection: 'members', where: { id: { equals: B.id } } })) as unknown as { sessions?: unknown[] }).sessions ?? []
    expect((await lire()).length).toBeGreaterThan(0)
    await payload.update({ collection: 'members', id: B.id, overrideAccess: true, context: { sansMotif: true }, data: { statut: 'suspendu', motifStatut: 'Test' } as never })
    expect(await lire()).toHaveLength(0)
  })
})
