import type { Payload } from 'payload'

import { media, readSeed } from './lib'

/**
 * Lot 8 : événements de démonstration (seed/evenements.json et maquette, écrans 14 à 16).
 * Les nombres d'inscrits de la maquette sont atteints avec des inscriptions de démonstration.
 */
type Ev = { titre: string; type: string; ville: string; lieu: string; acces: string; places: number; inscrits: number }

const ACCES: Record<string, string> = { 'Ouvert à tous': 'tous', 'Réservé aux membres': 'membres', 'Sur invitation': 'invitation' }
// Heures de Brazzaville (UTC+1) de la maquette.
const DEBUTS: Record<string, string> = {
  'Afterwork des entrepreneurs de Brazzaville': '2026-11-14T17:00:00.000Z',
  'Formaliser son activité : par où commencer ?': '2026-11-28T08:30:00.000Z',
  'Rencontre B2B commerce et distribution': '2026-12-05T09:00:00.000Z',
  'Porteurs de projets et investisseurs': '2026-12-12T14:00:00.000Z',
}
const CHAPEAU =
  'Une rencontre pour échanger avec d’autres membres, présenter son activité et repartir avec des contacts utiles. Ouvert selon les conditions d’accès indiquées.'
const COMPTE_RENDU =
  'L’assemblée générale constitutive a adopté les statuts et le règlement intérieur de REC 242. Elle a mis en place les organes de l’association : assemblée générale, comité de direction, commissions thématiques et contrôleurs aux comptes. Le compte rendu complet sera publié par le secrétariat.'

const paragraphe = (texte: string) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [{ type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr', textFormat: 0, children: [{ type: 'text', text: texte, version: 1, format: 0, mode: 'normal', style: '', detail: 0 }] }],
  },
})

export async function seedEvenements(payload: Payload): Promise<void> {
  if ((await payload.count({ collection: 'events', overrideAccess: true })).totalDocs) return
  const { a_venir, passes, programme_exemple, intervenants_exemple, inscrits_exemple } = readSeed<{
    a_venir: Ev[]
    passes: Ev[]
    programme_exemple: { h: string; t: string }[]
    intervenants_exemple: { nom: string; fn: string; photo: string }[]
    inscrits_exemple: { nom: string; tel: string; ent: string; present: boolean }[]
  }>('evenements')
  const [types, villes, docs] = await Promise.all([
    payload.find({ collection: 'eventTypes', limit: 50, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'localities', limit: 50, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'documents', limit: 100, depth: 0, overrideAccess: true }),
  ])
  const idPar = (d: unknown[], nom: string) => (d as { id: number; nom?: string; titre?: string }[]).find((x) => x.nom === nom || x.titre === nom)?.id
  const christelle = await payload.find({ collection: 'members', where: { email: { equals: 'christelle@kimiacreations.cg' } }, limit: 1, overrideAccess: true })
  const cId = christelle.docs[0]?.id as number | undefined
  const intervenants = await Promise.all(intervenants_exemple.map(async (i) => ({ nom: i.nom, fonction: i.fn, photo: await media(payload, i.photo, i.nom, false) })))

  // Inscriptions saisies au nom de l'équipe : les règles d'accès (membres, invitation) s'appliquent comme au back-office.
  const admin = await payload.find({ collection: 'users', where: { email: { equals: 'ange.mouandza@rec242.test' } }, limit: 1, overrideAccess: true })
  const user = { ...admin.docs[0], collection: 'users' }
  let n = 0
  const inscrire = (evenement: number, data: Record<string, unknown>) =>
    payload.create({ collection: 'registrations', overrideAccess: true, user: user as never, context: { sansEmail: true }, data: { evenement, ...data } as never })
  const demo = () => {
    n++
    return { visiteur: { nom: `Inscrit de démonstration ${n}`, email: `inscrit${n}@demo.rec242.test` } }
  }

  for (const ev of a_venir) {
    const e = await payload.create({
      collection: 'events',
      overrideAccess: true,
      data: {
        titre: ev.titre,
        type: idPar(types.docs, ev.type),
        debut: DEBUTS[ev.titre],
        lieu: ev.lieu,
        ville: idPar(villes.docs, ev.ville),
        acces: ACCES[ev.acces] ?? 'tous',
        capacite: ev.places,
        chapeau: CHAPEAU,
        statut: 'publie',
        programme: ev.type === 'Afterwork' ? programme_exemple.map((p) => ({ heure: p.h, intitule: p.t })) : [],
        intervenants: ev.type === 'Afterwork' ? intervenants : [],
      } as never,
    })
    const id = e.id as number
    if (ev.type === 'Afterwork') {
      for (const x of inscrits_exemple) {
        const r = x.nom === 'Christelle Malonga' && cId ? await inscrire(id, { membre: cId }) : await inscrire(id, { visiteur: { nom: x.nom, email: `${x.nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '.')}@demo.rec242.test`, telephone: x.tel } })
        if (x.present) await payload.db.updateOne({ collection: 'registrations', id: r.id, data: { statut: 'present', pointeLe: new Date().toISOString(), pointePar: 'Démonstration' }, returning: false })
      }
    }
    while ((await payload.count({ collection: 'registrations', where: { and: [{ evenement: { equals: id } }, { statut: { in: ['inscrit', 'present'] } }] }, overrideAccess: true })).totalDocs < ev.inscrits)
      await inscrire(id, demo())
    // Atelier complet : liste d'attente, Christelle Malonga en position 2 (maquette, écran membre 04).
    if (ev.inscrits >= ev.places) {
      await inscrire(id, demo())
      if (cId) await inscrire(id, { membre: cId })
    }
  }
  for (const ev of passes) {
    await payload.create({
      collection: 'events',
      overrideAccess: true,
      data: {
        titre: ev.titre,
        type: idPar(types.docs, ev.type),
        debut: '2026-10-03T09:00:00.000Z',
        lieu: ev.lieu,
        ville: idPar(villes.docs, ev.ville),
        acces: 'invitation',
        statut: 'termine',
        compteRendu: paragraphe(COMPTE_RENDU),
        documents: ['Statuts de l’association', 'Règlement intérieur']
          .map((t) => idPar(docs.docs, t))
          .filter(Boolean)
          .map((document) => ({ document, visibilite: 'tous' })),
      } as never,
    })
  }
  payload.logger.info(`Événements de démonstration : ${a_venir.length + passes.length}.`)
}
