import { createLocalReq, getPayload, type CollectionSlug, type Endpoint, type Payload, type PayloadRequest } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const entetes = vi.hoisted(() => ({ ip: '203.0.113.1' }))
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': entetes.ip }),
  draftMode: async () => ({ isEnabled: false }),
  cookies: async () => ({ get: () => undefined, getAll: () => [] }),
}))

import { envoyerContact } from '@/app/(site)/contact/actions'
import { Applications } from '@/collections/Applications'
import { ContactMessages } from '@/collections/ContactMessages'
import { DisciplinaryCases } from '@/collections/DisciplinaryCases'
import { Dues } from '@/collections/Dues'
import { getTemplate } from '@/emails/send'
import { renderEmail } from '@/emails/render'
import { autoriserEnvoi, jetonFormulaire } from '@/lib/antispam'
import { ficheAnnuaire, listerAnnuaire } from '@/lib/annuaire/donnees'
import { creerEcheance } from '@/lib/cotisations/service'
import { DELAI_DEFENSE_JOURS, plusJours, refusTransition } from '@/lib/discipline/regles'
import { ajouterJoursOuvres, DELAI_JOURS_OUVRES } from '@/lib/experts/delais'
import { numeroDossier } from '@/lib/compteurs'

/**
 * Recette (docs/12-recette.md) : points qui n'avaient pas encore de test automatique. Chaque attente renvoie à la
 * section de docs/05-regles-metier.md ou de docs/12-recette.md qui la fonde.
 *
 * Données : membres en `@test.rec242.test`, candidatures « Boutique 17… », comptes de l'équipe en `@e2e.test`
 * (reconnus par src/seed/purge.ts). Les événements, messages de contact et entrées du journal créés ici ne sont pas
 * purgés automatiquement : ils sont supprimés en fin de fichier.
 *
 * Les e-mails sont interceptés au point d'envoi unique (`payload.sendEmail`) : rien ne part vers Mailpit.
 */

let payload: Payload
const unique = Date.now()
const HEURE = 3600 * 1000
const JOUR = 86400e3
const PWD = 'Mot-de-passe-test-2026'
const crees: Partial<Record<CollectionSlug, number[]>> = {}
const noter = (c: CollectionSlug, id: number | string) => (crees[c] ??= []).push(Number(id))

type Email = { to: string | string[]; cc?: string | string[]; subject: string; html: string; text: string }
let envoi: ReturnType<typeof vi.spyOn>
const envoyes = (): Email[] => (envoi.mock.calls as unknown[][]).map((c) => c[0] as Email)
const pour = (adresse: string) => envoyes().filter((e) => [e.to].flat().includes(adresse))

type Equipe = { id: number; collection: 'users'; email: string; name: string; roles: string[] }
const equipe: Record<'admin' | 'membres' | 'tresorier', Equipe> = {} as never

const creerEquipe = async (role: 'admin' | 'membres' | 'tresorier'): Promise<Equipe> => {
  const email = `recette-${role}-${unique}@e2e.test`
  const u = await payload.create({
    collection: 'users',
    overrideAccess: true,
    context: { skipAudit: true },
    data: { name: `Recette ${role}`, email, password: PWD, roles: [role] as never, statut: 'actif' } as never,
  })
  noter('users', u.id)
  return { ...(u as unknown as Equipe), collection: 'users' }
}

/** Appelle un endpoint de collection comme le ferait l'admin, avec les droits de `user`. */
const appeler = async (endpoints: Endpoint[], chemin: string, user: Equipe, params: Record<string, string>, corps: unknown = {}, methode = 'post') => {
  const e = endpoints.find((x) => x.path === chemin && x.method === methode) as Endpoint
  const req = (await createLocalReq({ user: user as never }, payload)) as PayloadRequest
  req.routeParams = params
  req.json = async () => corps
  return (await e.handler(req)).json()
}

const base = async () => {
  const [loc, sec] = await Promise.all([
    payload.find({ collection: 'localities', limit: 1, overrideAccess: true }),
    payload.find({ collection: 'sectors', limit: 1, overrideAccess: true }),
  ])
  return { localite: loc.docs[0].id, secteurs: sec.docs.map((s) => s.id) }
}

const telephone = (n: number) => `+24206${String(unique).slice(-6)}${n}`

const candidature = async (n: number) => {
  const b = await base()
  const d = await payload.create({
    collection: 'applications',
    overrideAccess: true,
    context: { sansEmail: true },
    data: {
      nom: 'Recette',
      prenom: `Candidat${n}`,
      email: `candidat${n}-${unique}@test.rec242.test`,
      telephone: telephone(n),
      trancheAge: '26-35',
      raisonSociale: `Boutique ${unique}${n}`,
      localite: b.localite,
      description: 'Activité de test de recette',
      secteurs: b.secteurs,
      anciennete: '1-3',
      objectifs: ['affaires'],
      categorie: 'B',
      consentement: true,
      acceptationTextes: true,
    } as never,
  })
  noter('applications', d.id)
  return d as unknown as { id: number; numero: number; email: string; statut: string }
}

type Membre = { id: number; collection: 'members'; email: string; telephone: string; entreprise: number; slug: string }

const membre = async (n: number, vis: Record<string, boolean>, extra: Record<string, unknown> = {}): Promise<Membre> => {
  const e = await payload.create({ collection: 'companies', overrideAccess: true, data: { nom: `Fiche ${unique}${n}`, visibilite: vis } as never })
  noter('companies', e.id)
  const m = await payload.create({
    collection: 'members',
    overrideAccess: true,
    data: {
      email: `recette${n}-${unique}@test.rec242.test`,
      password: 'Mot-de-passe-test-1',
      prenom: 'Recette',
      nom: `Membre${n}`,
      telephone: telephone(n),
      categorie: 'B',
      statut: 'actif',
      entreprise: e.id,
      ...extra,
    } as never,
  })
  noter('members', m.id)
  await payload.update({ collection: 'companies', id: e.id, data: { titulaire: m.id } as never, overrideAccess: true })
  const mm = m as unknown as { email: string; telephone: string }
  return { id: m.id as number, collection: 'members', email: mm.email, telephone: mm.telephone, entreprise: e.id as number, slug: (e as unknown as { slug: string }).slug }
}

const journal = async (action: string, user: Equipe) =>
  (
    await payload.find({
      collection: 'auditLog',
      overrideAccess: true,
      depth: 0,
      where: { and: [{ action: { equals: action } }, { auteur: { equals: user.id } }] },
    })
  ).docs

let compteurRecuAvant: number | null = null
let numeroRecuCree: number | null = null

beforeAll(async () => {
  payload = await getPayload({ config })
  envoi = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
  equipe.admin = await creerEquipe('admin')
  equipe.membres = await creerEquipe('membres')
  equipe.tresorier = await creerEquipe('tresorier')
})

beforeEach(() => {
  envoi.mockClear()
})

afterAll(async () => {
  envoi?.mockRestore()
  const del = async (collection: CollectionSlug, ids?: number[]) => {
    if (ids?.length) await payload.db.deleteMany({ collection, where: { id: { in: ids } } }).catch(() => null)
  }
  // Journal : les actions des comptes de recette (le journal n'est jamais supprimable par l'API, d'où l'accès direct).
  if (crees.users?.length) await payload.db.deleteMany({ collection: 'auditLog', where: { auteur: { in: crees.users } } }).catch(() => null)
  for (const c of ['registrations', 'events', 'connectionRequests', 'disciplinaryCases', 'payments', 'dues', 'applications', 'members', 'companies', 'contactMessages', 'users'] as CollectionSlug[])
    await del(c, crees[c])
  // Reçus numérotés sans trou (docs/05 §4) : le numéro consommé par le paiement de test est rendu s'il est le dernier.
  if (numeroRecuCree && compteurRecuAvant !== null) {
    const c = await payload.find({ collection: 'counters', where: { name: { equals: 'recu' } }, limit: 1, overrideAccess: true })
    if ((c.docs[0] as unknown as { value: number } | undefined)?.value === numeroRecuCree)
      await payload.db.updateMany({ collection: 'counters', where: { name: { equals: 'recu' } }, data: { value: compteurRecuAvant } })
  }
})

describe('Recette : traitement des candidatures (docs/12 §4 et §5)', () => {
  it('refus : e-mail de refus au candidat, paiement en « remboursement à traiter », trésorier prévenu', async () => {
    const d = await candidature(3)
    // Un paiement confirmé avant le refus (première tranche B : 15 000 + 37 500, docs/05 §1).
    const c = await payload.find({ collection: 'counters', where: { name: { equals: 'recu' } }, limit: 1, overrideAccess: true })
    compteurRecuAvant = (c.docs[0] as unknown as { value: number } | undefined)?.value ?? 0
    const p = await payload.create({
      collection: 'payments',
      overrideAccess: true,
      data: { candidature: d.id, objet: 'adhesion-tranche', montant: 52500, mode: 'mtn', statut: 'paye' } as never,
    })
    noter('payments', p.id)
    numeroRecuCree = (p as unknown as { numero: number }).numero
    envoi.mockClear()

    const A = Applications.endpoints as Endpoint[]
    const params = { id: String(d.id) }
    // docs/05 §3 : « Refusée (motif obligatoire, e-mail courtois) ». Sans motif : refus de l'action.
    await expect(appeler(A, '/:id/statut', equipe.membres, params, { statut: 'refusee', motif: '' })).rejects.toThrow(/motif/)
    // Même enchaînement que l'écran du dossier : brouillon du modèle « Refus motivé », motif inséré, envoi.
    const brouillon = (await appeler(A, '/:id/email/:modele', equipe.membres, { ...params, modele: 'refus' }, {}, 'get')) as { objet: string; corps: string }
    const motif = 'Activité hors du périmètre de l’association'
    const corps = brouillon.corps.replace(/Motif : [^\n]*?\./, `Motif : ${motif}.`)
    await appeler(A, '/:id/statut', equipe.membres, params, { statut: 'refusee', motif, objet: brouillon.objet, corps })

    const apres = (await payload.findByID({ collection: 'applications', id: d.id, overrideAccess: true, depth: 0 })) as unknown as {
      statut: string
      motifRefus: string
      emails: { modele: string; auteur: string }[]
      historique: { action: string; auteur: string }[]
    }
    expect(apres.statut).toBe('refusee')
    expect(apres.motifRefus).toBe(motif)
    // E-mail de refus au candidat, avec le motif.
    const refus = pour(d.email)
    expect(refus).toHaveLength(1)
    expect(refus[0].subject).toBe(brouillon.objet)
    expect(refus[0].text).toContain(motif)
    expect(apres.emails.at(-1)).toMatchObject({ modele: 'Refus motivé', auteur: equipe.membres.name })
    // docs/05 §3 : « le paiement passe au statut “remboursement à traiter” et le trésorier est prévenu ».
    const paiement = (await payload.findByID({ collection: 'payments', id: p.id, overrideAccess: true })) as unknown as { statut: string; montant: number }
    expect(paiement.statut).toBe('remboursement')
    expect(paiement.montant).toBe(52500)
    const alerte = pour(equipe.tresorier.email)
    expect(alerte).toHaveLength(1)
    expect(alerte[0].text).toContain(numeroDossier(d.numero))
    // Changement horodaté, attribué et inscrit au journal (docs/05 §3).
    expect(apres.historique.some((h) => h.action === 'Statut : Refusée' && h.auteur === equipe.membres.name)).toBe(true)
    expect(await journal(`Dossier ${numeroDossier(d.numero)} : statut « Refusée »`, equipe.membres)).toHaveLength(1)
  })

  it('demande de complément : e-mail au candidat, statut « Complément demandé », historique et journal', async () => {
    const d = await candidature(4)
    const A = Applications.endpoints as Endpoint[]
    const params = { id: String(d.id) }
    const brouillon = (await appeler(A, '/:id/email/:modele', equipe.membres, { ...params, modele: 'complement' }, {}, 'get')) as { objet: string; corps: string }
    expect(brouillon.corps).toContain('…')
    const piece = 'une copie de votre registre de commerce'
    const corps = brouillon.corps.replace('…', piece)
    await appeler(A, '/:id/email', equipe.membres, params, { modele: 'complement', objet: brouillon.objet, corps })

    // docs/05 §3 : « Complément demandé (e-mail au candidat) ».
    const mails = pour(d.email)
    expect(mails).toHaveLength(1)
    expect(mails[0].text).toContain(piece)
    const apres = (await payload.findByID({ collection: 'applications', id: d.id, overrideAccess: true, depth: 0 })) as unknown as {
      statut: string
      emails: { modele: string; objet: string; auteur: string; date: string }[]
      historique: { action: string; auteur: string; date: string }[]
    }
    expect(apres.statut).toBe('complement')
    expect(apres.emails.at(-1)).toMatchObject({ modele: 'Demande de complément', objet: mails[0].subject, auteur: equipe.membres.name })
    // « Chaque changement est horodaté, attribué à un utilisateur et inscrit au journal. »
    const h = apres.historique.find((x) => x.action === 'Statut : Complément demandé')
    expect(h?.auteur).toBe(equipe.membres.name)
    expect(Number.isNaN(new Date(String(h?.date)).getTime())).toBe(false)
    expect(apres.historique.some((x) => x.action === 'E-mail « Demande de complément » envoyé')).toBe(true)
    expect(await journal(`Dossier ${numeroDossier(d.numero)} : statut « Complément demandé »`, equipe.membres)).toHaveLength(1)
  })
})

describe('Recette : annuaire et mises en relation (docs/12 §9 et §15)', () => {
  it('mise en relation refusée : statut « Refusée » sans motif, aucune coordonnée partagée', async () => {
    const a = await membre(5, { annuaire: true, telephone: true, whatsapp: true, email: true })
    const b = await membre(6, { annuaire: true, telephone: true, whatsapp: true, email: true })
    const r = await payload.create({
      collection: 'connectionRequests',
      user: a as never,
      overrideAccess: false,
      data: { entreprise: b.entreprise, message: 'Bonjour, je cherche un partenaire de recette.' } as never,
    })
    noter('connectionRequests', r.id)
    envoi.mockClear()
    // docs/05 §9 : « un refus est envoyé sans motif » ; aucun motif n'est exigé du membre contacté.
    const refusee = await payload.update({ collection: 'connectionRequests', id: r.id, user: b as never, overrideAccess: false, data: { statut: 'refusee' } as never })
    expect((refusee as unknown as { statut: string; dateReponse?: string }).statut).toBe('refusee')
    expect((refusee as unknown as { dateReponse?: string }).dateReponse).toBeTruthy()
    // Aucune coordonnée n'est transmise, ni avant ni après la réponse (messagerie de la plateforme).
    const vuParA = await payload.findByID({ collection: 'connectionRequests', id: r.id, user: a as never, overrideAccess: false, depth: 2 })
    const json = JSON.stringify(vuParA)
    expect(json).not.toContain(b.email)
    expect(json).not.toContain(b.telephone)
    // Le demandeur est prévenu du refus, sans motif ni coordonnées.
    const mails = pour(a.email)
    expect(mails).toHaveLength(1)
    expect(mails[0].text).toContain('aucun motif')
    expect(mails[0].text + mails[0].html).not.toContain(b.email)
    expect(mails[0].text + mails[0].html).not.toContain(b.telephone.slice(4))
    // Une fois refusée, la demande ne peut plus être acceptée par le destinataire.
    await expect(payload.update({ collection: 'connectionRequests', id: r.id, user: b as never, overrideAccess: false, data: { statut: 'acceptee' } as never })).rejects.toThrow()
  })

  it('un membre devenu « ancien » par constat de perte quitte l’annuaire', async () => {
    const m = await membre(7, { annuaire: true, telephone: true }, { dateAdhesion: new Date(Date.now() - 120 * JOUR).toISOString(), cotisation: { droit: 15000, montant: 75000, tranches: 2 } })
    const q = `${unique}7`
    expect((await listerAnnuaire({ q, page: 1 }, false)).cartes.map((c) => c.slug)).toEqual([m.slug])
    const id = (await creerEcheance(payload, m.id, new Date(Date.now() - 120 * JOUR), true)) as number
    noter('dues', id)
    const trois = [1, 2, 3].map((numero) => ({ numero, date: new Date(Date.now() - (70 - numero * 16) * JOUR).toISOString() }))
    await payload.update({ collection: 'dues', id, overrideAccess: true, context: { rapprochement: true }, data: { relances: trois } as never })
    await appeler(Dues.endpoints as Endpoint[], '/:id/constater', equipe.admin, { id: String(id) }, { pv: `PV-recette-${unique}` })
    // docs/05 §4 : « passe au statut “ancien membre”, sa fiche quitte l'annuaire » ; docs/12 §15.
    const fin = (await payload.findByID({ collection: 'members', id: m.id, overrideAccess: true })) as unknown as { statut: string }
    expect(fin.statut).toBe('ancien')
    expect((await listerAnnuaire({ q, page: 1 }, false)).cartes).toHaveLength(0)
    expect((await listerAnnuaire({ q, page: 1 }, true)).cartes).toHaveLength(0)
    expect(await ficheAnnuaire(m.slug, false)).toBeNull()
    expect(await ficheAnnuaire(m.slug, true)).toBeNull()
    // Le membre est informé par écrit (docs/05 §4).
    expect(pour(m.email)).toHaveLength(1)
  })
})

describe('Recette : événements (docs/12 §10)', () => {
  it('promotion depuis la liste d’attente : l’e-mail « place libérée » part à la personne promue', async () => {
    const titre = `Atelier recette ${unique}`
    const e = await payload.create({
      collection: 'events',
      overrideAccess: true,
      data: { titre, debut: new Date(Date.now() + 5 * JOUR).toISOString(), capacite: 1, statut: 'publie', acces: 'tous' } as never,
    })
    noter('events', e.id)
    const inscrire = async (n: number) => {
      const r = await payload.create({
        collection: 'registrations',
        overrideAccess: true,
        context: { visiteur: true, sansEmail: true },
        data: { evenement: e.id, visiteur: { nom: `Visiteur ${n}`, email: `recette-visiteur${n}-${unique}@test.rec242.test` } } as never,
      })
      noter('registrations', r.id)
      return r as unknown as { id: number; statut: string }
    }
    const premier = await inscrire(1)
    const second = await inscrire(2)
    expect(second.statut).toBe('attente')
    envoi.mockClear()
    // Annulation réelle, sans le contexte `sansEmail` : la promotion envoie l'e-mail (docs/05 §7).
    await payload.update({ collection: 'registrations', id: premier.id, overrideAccess: true, data: { statut: 'annule' } as never })
    const promu = (await payload.findByID({ collection: 'registrations', id: second.id, overrideAccess: true, depth: 0 })) as unknown as { statut: string }
    expect(promu.statut).toBe('inscrit')
    const mails = pour(`recette-visiteur2-${unique}@test.rec242.test`)
    expect(mails).toHaveLength(1)
    const tpl = await getTemplate(payload, 'placeLiberee')
    expect(mails[0].subject).toBe(renderEmail(tpl.objet, tpl.corps, { evenement: titre }).subject)
    expect(mails[0].html).toContain(`/billet`)
  })
})

describe('Recette : paramètres (docs/12 §19)', () => {
  it('changer le lien du groupe WhatsApp est inscrit au journal', async () => {
    const avant = await payload.findGlobal({ slug: 'settings', overrideAccess: true, depth: 0 })
    try {
      await payload.updateGlobal({
        slug: 'settings',
        user: equipe.admin as never,
        overrideAccess: false,
        data: { whatsapp: { ...avant.whatsapp, lienGroupe: `https://chat.whatsapp.com/recette${unique}` } } as never,
      })
      const apres = await payload.findGlobal({ slug: 'settings', overrideAccess: true, depth: 0 })
      expect(apres.whatsapp?.lienGroupe).toBe(`https://chat.whatsapp.com/recette${unique}`)
      const entrees = await journal('A modifié le lien du groupe WhatsApp des membres', equipe.admin)
      expect(entrees).toHaveLength(1)
      expect(entrees[0]).toMatchObject({ categorie: 'parametres', auteurType: 'utilisateur', auteurNom: equipe.admin.name })
    } finally {
      await payload.updateGlobal({ slug: 'settings', overrideAccess: true, data: { whatsapp: avant.whatsapp } as never })
    }
  })

  it('modifier un tarif ne change pas une échéance déjà émise', async () => {
    const m = await membre(8, { annuaire: false })
    const avant = await payload.findGlobal({ slug: 'settings', overrideAccess: true, depth: 0 })
    const tarifB = avant.tarifs?.cotisationB
    // Montant administrable : sans tarif B renseigné, aucune échéance de renouvellement n'est émise (docs/05 §1).
    expect(tarifB, 'tarif de la cotisation B absent des paramètres').toBeTruthy()
    // Renouvellement : l'échéance est émise au tarif en vigueur.
    const id = (await creerEcheance(payload, m.id, new Date(Date.now() - 10 * JOUR), false)) as number
    noter('dues', id)
    const emise = (await payload.findByID({ collection: 'dues', id, overrideAccess: true })) as unknown as { montant: number; tranches: { montant: number }[] }
    expect(emise.montant).toBe(tarifB)
    try {
      await payload.updateGlobal({
        slug: 'settings',
        user: equipe.admin as never,
        overrideAccess: false,
        data: { tarifs: { ...avant.tarifs, cotisationB: Number(tarifB) + 5000 } } as never,
      })
      expect((await payload.findGlobal({ slug: 'settings', overrideAccess: true })).tarifs?.cotisationB).toBe(Number(tarifB) + 5000)
      const relue = (await payload.findByID({ collection: 'dues', id, overrideAccess: true })) as unknown as { montant: number; tranches: { montant: number }[] }
      expect(relue.montant).toBe(emise.montant)
      expect(relue.tranches.map((t) => t.montant)).toEqual(emise.tranches.map((t) => t.montant))
      expect(await journal('A modifié les tarifs', equipe.admin)).toHaveLength(1)
    } finally {
      await payload.updateGlobal({ slug: 'settings', overrideAccess: true, data: { tarifs: avant.tarifs } as never })
    }
  })
})

describe('Recette : formulaires (docs/12, Sécurité)', () => {
  const formulaire = (champs: Record<string, string>) => {
    const f = new FormData()
    f.set('jeton', jetonFormulaire(Date.now() - 5000))
    for (const [k, v] of Object.entries(champs)) f.set(k, v)
    return f
  }

  it('limitation de débit : au-delà du plafond, l’envoi est refusé, puis de nouveau permis après la fenêtre', async () => {
    const cle = `recette:${unique}`
    const t0 = Date.now()
    for (let i = 0; i < 5; i++) expect(autoriserEnvoi(cle, 5, HEURE, t0 + i)).toBe(true)
    expect(autoriserEnvoi(cle, 5, HEURE, t0 + 10)).toBe(false)
    expect(autoriserEnvoi(`recette-autre:${unique}`, 5, HEURE, t0 + 10)).toBe(true)
    expect(autoriserEnvoi(cle, 5, HEURE, t0 + HEURE + 10)).toBe(true)

    // Formulaire de contact réel : appareil ayant épuisé son plafond (au plus 50 envois par heure hors production).
    entetes.ip = `198.51.100.${unique % 200}`
    for (let i = 0; i < 50; i++) autoriserEnvoi(`contact:${entetes.ip}`, 1000, HEURE)
    const email = `contact-limite-${unique}@test.rec242.test`
    const r = await envoyerContact({}, formulaire({ nom: 'Visiteur Recette', email, motif: 'autre', message: 'Message de test de limitation.' }))
    expect(r.ok).toBeFalsy()
    expect(r.general).toMatch(/Trop d’envois/)
    const enregistres = await payload.find({ collection: 'contactMessages', where: { email: { equals: email } }, overrideAccess: true })
    expect(enregistres.totalDocs).toBe(0)
  })

  it('HTML et script d’un message de contact neutralisés dans les e-mails', async () => {
    entetes.ip = `192.0.2.${unique % 200}`
    const email = `contact-html-${unique}@test.rec242.test`
    const message = '<script>alert(1)</script><img src=x onerror=alert(2)> Bonjour, demande de recette.'
    const r = await envoyerContact({}, formulaire({ nom: 'Visiteur Recette', email, motif: 'autre', message }))
    expect(r.ok).toBe(true)
    const m = (
      await payload.find({ collection: 'contactMessages', where: { email: { equals: email } }, overrideAccess: true, depth: 0 })
    ).docs[0] as unknown as { id: number; objet: string; message: string }
    noter('contactMessages', m.id)
    // Le texte est conservé tel quel (champ texte, jamais interprété) : l'objet est tiré du message.
    expect(m.objet).toContain('<script>')
    // Réponse depuis le back-office (docs/05 §11) : l'objet du message est repris dans l'e-mail.
    await appeler(ContactMessages.endpoints as Endpoint[], '/:id/repondre', equipe.admin, { id: String(m.id) }, { canal: 'email', texte: 'Merci pour votre message.' })
    const mails = envoyes()
    expect(mails.length).toBeGreaterThanOrEqual(2)
    const reponse = pour(email).find((x) => x.subject.startsWith('Re : '))
    expect(reponse, 'réponse par e-mail envoyée').toBeTruthy()
    for (const x of mails) {
      expect(x.html).not.toMatch(/<script/i)
      expect(x.html).not.toMatch(/<img src=x/i)
    }
    expect(reponse!.html).toContain('&lt;script&gt;')
  })
})

describe('Recette : délais (docs/12 §12 et §16)', () => {
  it('cinq jours ouvrés enjambent le week-end (docs/05 §9)', () => {
    expect(DELAI_JOURS_OUVRES).toBe(5)
    // Jeudi 22 octobre 2026 : vendredi, lundi, mardi, mercredi, jeudi.
    const jeudi = new Date('2026-10-22T10:00:00Z')
    expect(ajouterJoursOuvres(jeudi, 5).toISOString()).toBe('2026-10-29T10:00:00.000Z')
    // Vendredi 23 octobre 2026 : du lundi 26 au vendredi 30.
    expect(ajouterJoursOuvres(new Date('2026-10-23T10:00:00Z'), 5).toISOString()).toBe('2026-10-30T10:00:00.000Z')
    // Samedi : le week-end ne compte pas.
    expect(ajouterJoursOuvres(new Date('2026-10-24T10:00:00Z'), 5).toISOString()).toBe('2026-10-30T10:00:00.000Z')
  })

  it('défense de 15 jours (docs/05 §5) : avis refusé à J+14, permis à J+15', () => {
    expect(DELAI_DEFENSE_JOURS).toBe(15)
    const griefs = new Date('2026-11-02T09:00:00Z')
    const d = { statut: 'griefs' as const, dateGriefs: griefs.toISOString(), finDefense: plusJours(griefs, 15).toISOString(), avis: 'Avis consultatif.' }
    expect(refusTransition(d, 'avis', plusJours(griefs, 14))).toMatch(/délai de défense de 15 jours/)
    expect(refusTransition(d, 'avis', plusJours(griefs, 15))).toBeNull()
  })

  it('défense de 15 jours appliquée par le serveur : J+14 refusé, J+15 accepté', async () => {
    const m = await membre(9, { annuaire: false })
    const c = await payload.create({ collection: 'disciplinaryCases', overrideAccess: true, data: { membre: m.id } as never })
    noter('disciplinaryCases', c.id)
    const E = DisciplinaryCases.endpoints as Endpoint[]
    const params = { id: String(c.id) }
    await appeler(E, '/:id/griefs', equipe.admin, params, { griefs: ['charte'], faits: 'Faits datés de recette.', sanctionEnvisagee: 'avertissement' })
    const notifie = (await payload.findByID({ collection: 'disciplinaryCases', id: c.id, overrideAccess: true })) as unknown as { dateGriefs: string; finDefense: string }
    expect(new Date(notifie.finDefense).getTime() - new Date(notifie.dateGriefs).getTime()).toBe(15 * JOUR)
    // Horloge simulée : griefs notifiés il y a 14 jours.
    await payload.db.updateOne({ collection: 'disciplinaryCases', id: c.id, data: { dateGriefs: new Date(Date.now() - 14 * JOUR).toISOString(), finDefense: new Date(Date.now() + JOUR).toISOString() }, returning: false })
    await expect(appeler(E, '/:id/avis', equipe.admin, params, { avis: 'Avis de la commission.' })).rejects.toThrow(/délai de défense/)
    // Griefs notifiés il y a 15 jours : le délai est écoulé, l'avis est possible même sans défense écrite.
    await payload.db.updateOne({ collection: 'disciplinaryCases', id: c.id, data: { dateGriefs: new Date(Date.now() - 15 * JOUR - 60e3).toISOString(), finDefense: new Date(Date.now() - 60e3).toISOString() }, returning: false })
    await appeler(E, '/:id/avis', equipe.admin, params, { avis: 'Avis de la commission.' })
    const apres = (await payload.findByID({ collection: 'disciplinaryCases', id: c.id, overrideAccess: true })) as unknown as { statut: string }
    expect(apres.statut).toBe('avis')
  })

  // Défaut trouvé par la recette interne et corrigé : un `finDefense` passé envoyé dans le corps levait le délai de 15 jours
  // de docs/05 §5. Le corps ne peut plus remplacer les dates du dossier (CHAMPS_SERVEUR, src/collections/DisciplinaryCases.ts).
  it('le délai de défense ne peut pas être contourné par le corps de la requête', async () => {
    const m = await membre(10, { annuaire: false })
    const c = await payload.create({ collection: 'disciplinaryCases', overrideAccess: true, data: { membre: m.id } as never })
    noter('disciplinaryCases', c.id)
    const E = DisciplinaryCases.endpoints as Endpoint[]
    const params = { id: String(c.id) }
    await appeler(E, '/:id/griefs', equipe.admin, params, { griefs: ['charte'], faits: 'Faits datés de recette.', sanctionEnvisagee: 'avertissement' })
    // Le jour même des griefs, une date de fin de délai passée glissée dans le corps ne doit pas ouvrir l'avis.
    await expect(
      appeler(E, '/:id/avis', equipe.admin, params, { avis: 'Avis anticipé.', finDefense: new Date(Date.now() - JOUR).toISOString() }),
    ).rejects.toThrow(/délai de défense/)
  })
})
