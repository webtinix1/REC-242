import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { cleChamp, optionsDe, questionsPour, verifierReponses, type Question } from '@/lib/evenements/formulaire'

/** Formulaire d'inscription personnalisé : règles des réponses, contrôle serveur, droits sur les réponses et les fichiers. */
let payload: Payload
const unique = Date.now()
const crees: Record<string, number[]> = { registrations: [], events: [], members: [] }
const QUESTIONS: Question[] = [
  { libelle: 'Votre repas', type: 'liste', obligatoire: true, options: 'Viande\nPoisson\nVégétarien', pour: 'tous' },
  { libelle: 'Vos centres d’intérêt', type: 'choix-multiple', options: 'Finance\nExport\nNumérique', pour: 'tous' },
  { libelle: 'Votre numéro d’adhérent parrain', type: 'texte', pour: 'visiteurs' },
  { libelle: 'Votre commission', type: 'texte', obligatoire: true, pour: 'membres' },
]

const evenement = async (questions: Question[] = QUESTIONS) => {
  const e = await payload.create({
    collection: 'events',
    overrideAccess: true,
    data: { titre: `Formulaire ${unique} ${crees.events.length}`, debut: new Date(Date.now() + 7 * 86400e3).toISOString(), statut: 'publie', acces: 'tous', questions } as never,
  })
  crees.events.push(e.id as number)
  return e as unknown as { id: number; questions: Required<Question>[] }
}

const visiteur = async (ev: number, saisies: Record<string, string[]>, email = `q-${unique}-${Math.random()}@e2e.test`) => {
  const r = await payload.create({
    collection: 'registrations',
    overrideAccess: true,
    context: { visiteur: true, sansEmail: true, reponses: saisies },
    data: { evenement: ev, visiteur: { nom: 'Visiteur Test', email } } as never,
  })
  crees.registrations.push(r.id as number)
  return r as unknown as { id: number; reponses: { libelle: string; valeur: string }[] }
}

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  for (const c of ['registrations', 'events', 'members'] as const)
    for (const id of crees[c]) await payload.db.deleteOne({ collection: c, where: { id: { equals: id } } }).catch(() => null)
})

describe('Règles des réponses', () => {
  const q = (type: Question['type'], extra: Partial<Question> = {}) => questionsPour([{ id: 'a', libelle: 'Q', type, ...extra }], 'visiteurs')
  const erreur = (type: Question['type'], valeurs: string[], extra: Partial<Question> = {}) => verifierReponses(q(type, extra), { a: valeurs }).erreurs[cleChamp('a')]

  it('chaque type est contrôlé', () => {
    expect(erreur('nombre', ['douze'])).toBeTruthy()
    expect(erreur('nombre', ['12,5'])).toBeUndefined()
    expect(erreur('email', ['pas-une-adresse'])).toBeTruthy()
    expect(erreur('telephone', ['abc'])).toBeTruthy()
    expect(erreur('date', ['2026-02-31'])).toBeTruthy()
    expect(erreur('date', ['2026-11-12'])).toBeUndefined()
    expect(erreur('texte', ['x'.repeat(301)])).toBeTruthy()
    expect(erreur('choix-unique', ['Autre'], { options: 'Oui\nNon' })).toBeTruthy()
    expect(erreur('choix-unique', ['Oui', 'Non'], { options: 'Oui\nNon' })).toBeTruthy()
    expect(erreur('choix-multiple', ['Oui', 'Non'], { options: 'Oui\nNon' })).toBeUndefined()
    expect(erreur('choix-multiple', ['Oui', 'Peut-être'], { options: 'Oui\nNon' })).toBeTruthy()
  })

  it('une question obligatoire vide est refusée, une question facultative vide n’est pas enregistrée', () => {
    expect(erreur('texte', ['  '], { obligatoire: true })).toBeTruthy()
    expect(erreur('case', [], { obligatoire: true })).toBeTruthy()
    expect(verifierReponses(q('texte'), { a: [''] }).reponses).toEqual([])
  })

  it('les questions dépendent du public, les choix sont lus ligne par ligne sans doublon', () => {
    const avecId = QUESTIONS.map((x, i) => ({ ...x, id: String(i) }))
    expect(questionsPour(avecId, 'visiteurs').map((x) => x.libelle)).not.toContain('Votre commission')
    expect(questionsPour(avecId, 'membres').map((x) => x.libelle)).not.toContain('Votre numéro d’adhérent parrain')
    expect(optionsDe({ options: 'A\r\n\r\n B \nA' })).toEqual(['A', 'B'])
  })
})

describe('Questions d’un événement', () => {
  it('un choix sans au moins deux propositions et plus de trois fichiers sont refusés', async () => {
    await expect(evenement([{ libelle: 'Repas', type: 'liste', options: 'Viande' }])).rejects.toThrow(/deux choix/)
    await expect(evenement(Array.from({ length: 4 }, (_, i) => ({ libelle: `Pièce ${i}`, type: 'fichier' as const })))).rejects.toThrow(/3 questions/)
  })
})

describe('Inscription', () => {
  it('un visiteur doit répondre aux questions obligatoires ; les réponses gardent le libellé de la question', async () => {
    const e = await evenement()
    const [repas, interets] = e.questions
    await expect(visiteur(e.id, {})).rejects.toThrow(/formulaire/)
    const r = await visiteur(e.id, { [repas.id!]: ['Poisson'], [interets.id!]: ['Finance', 'Export'] })
    expect(r.reponses.map((x) => [x.libelle, x.valeur])).toEqual([
      ['Votre repas', 'Poisson'],
      ['Vos centres d’intérêt', 'Finance, Export'],
    ])
    await payload.update({ collection: 'events', id: e.id, overrideAccess: true, data: { questions: [] } as never })
    const relue = (await payload.findByID({ collection: 'registrations', id: r.id, depth: 0, overrideAccess: true })) as unknown as { reponses: { libelle: string }[] }
    expect(relue.reponses[0].libelle).toBe('Votre repas')
  })

  it('par l’API, un membre ne contourne ni les questions obligatoires ni les réponses, et ne les réécrit pas', async () => {
    const e = await evenement()
    const m = await payload.create({
      collection: 'members',
      overrideAccess: true,
      data: { email: `q-membre-${unique}@test.rec242.test`, password: 'Mot-de-passe-test-1', prenom: 'Q', nom: 'Membre', categorie: 'B', statut: 'actif' } as never,
    })
    crees.members.push(m.id as number)
    const user = { ...m, collection: 'members' } as never
    const forgees = [{ question: 'x', libelle: 'Forgée', valeur: 'Forgée' }]
    await expect(
      payload.create({ collection: 'registrations', overrideAccess: false, user, context: { sansEmail: true }, data: { evenement: e.id, reponses: forgees } as never }),
    ).rejects.toThrow(/formulaire/)

    const [repas, , , commission] = e.questions
    const r = await payload.create({
      collection: 'registrations',
      overrideAccess: false,
      user,
      context: { sansEmail: true, reponses: { [repas.id!]: ['Viande'], [commission.id!]: ['Formalisation'] } },
      data: { evenement: e.id, reponses: forgees } as never,
    })
    crees.registrations.push(r.id as number)
    const reponses = (r as unknown as { reponses: { valeur: string }[] }).reponses
    expect(reponses.map((x) => x.valeur)).toEqual(['Viande', 'Formalisation'])

    await payload.update({ collection: 'registrations', id: r.id, overrideAccess: false, user, data: { reponses: forgees } as never })
    const relue = (await payload.findByID({ collection: 'registrations', id: r.id, depth: 0, overrideAccess: true })) as unknown as { reponses: { valeur: string }[] }
    expect(relue.reponses.map((x) => x.valeur)).toEqual(['Viande', 'Formalisation'])
  })

  it('un événement sans question s’inscrit toujours en un clic', async () => {
    const e = await evenement([])
    const r = await visiteur(e.id, {})
    expect(r.reponses ?? []).toEqual([])
  })
})

describe('Fichiers joints', () => {
  const lire = (user: unknown) => payload.find({ collection: 'inscriptionFichiers', overrideAccess: false, user: user as never, limit: 1 })

  it('lisibles par l’équipe des événements seulement, jamais créés par l’API', async () => {
    await expect(lire(null)).rejects.toThrow()
    await expect(lire({ id: 1, collection: 'members', statut: 'actif' })).rejects.toThrow()
    await expect(lire({ id: 1, collection: 'users', roles: ['editeur'], statut: 'actif' })).rejects.toThrow()
    await expect(lire({ id: 1, collection: 'users', roles: ['evenements'], statut: 'actif' })).resolves.toBeTruthy()
    await expect(
      payload.create({
        collection: 'inscriptionFichiers',
        overrideAccess: false,
        user: { id: 1, collection: 'users', roles: ['superadmin'], statut: 'actif' } as never,
        data: {},
        file: { data: Buffer.from('%PDF-1.4'), mimetype: 'application/pdf', name: 'test.pdf', size: 8 },
      }),
    ).rejects.toThrow()
  })
})
