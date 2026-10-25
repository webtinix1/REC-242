import { APIError, type Endpoint, type PayloadRequest } from 'payload'

import { atLeast } from '@/access/roles'
import { solliciter } from '@/collections/ExpertRequests'
import { logAction } from '@/lib/audit'
import { ajouterJoursOuvres, DELAI_JOURS_OUVRES } from '@/lib/experts/delais'

/** Écran back-office 21, onglet « Questions aux experts » : relancer, réattribuer, répondre au nom de REC 242, clôturer. */
const corps = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  try {
    return ((await req.json?.()) ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}
const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))

type Demande = {
  id: number
  statut: string
  relances?: number
  personne?: number | { id: number; nom?: string }
  etiquette?: number | { id: number }
  fil?: { auteurType: string; auteurNom?: string; texte: string; date: string }[]
}

const charger = async (req: PayloadRequest) => {
  if (!atLeast(req.user, 'membres', 'partial')) throw new APIError('Action non autorisée.', 403)
  const d = (await req.payload.findByID({ collection: 'expertRequests', id: req.routeParams?.id as string, depth: 1, overrideAccess: false, req }).catch(() => null)) as unknown as Demande | null
  if (!d) throw new APIError('Demande introuvable.', 404)
  if (d.statut === 'cloturee') throw new APIError('Cette demande est clôturée.', 400, null, true)
  return d
}
const auteur = (req: PayloadRequest) => (req.user as { name?: string; email?: string } | null)?.name ?? 'REC 242'
const evenement = (d: Demande, texte: string, req: PayloadRequest, type = 'systeme') => [
  ...(d.fil ?? []),
  { auteurType: type, auteurNom: type === 'rec242' ? `REC 242 (${auteur(req)})` : auteur(req), texte, date: new Date().toISOString() },
]

const relancer: Endpoint = {
  path: '/:id/relancer',
  method: 'post',
  handler: async (req) => {
    const d = await charger(req)
    if (!(await solliciter(req.payload, d.id, true, req))) throw new APIError('La personne sollicitée n’a pas d’adresse e-mail.', 400, null, true)
    await req.payload.update({
      collection: 'expertRequests',
      id: d.id,
      overrideAccess: true,
      req,
      context: { systeme: true },
      data: { relances: (d.relances ?? 0) + 1, fil: evenement(d, 'Relance envoyée à la personne sollicitée.', req) } as never,
    })
    await logAction(req.payload, { req, categorie: 'validation', action: 'Relance d’un expert' })
    return Response.json({ ok: true })
  },
}

const reattribuer: Endpoint = {
  path: '/:id/reattribuer',
  method: 'post',
  handler: async (req) => {
    const d = await charger(req)
    const personne = Number((await corps(req)).personne)
    const p = (await req.payload.findByID({ collection: 'people', id: personne, depth: 0, overrideAccess: true, req }).catch(() => null)) as unknown as {
      nom: string
      etiquettes?: unknown[]
    } | null
    if (!p || !(p.etiquettes ?? []).map(idDe).includes(idDe(d.etiquette))) throw new APIError('Choisissez une personne qui porte cette étiquette.', 400, null, true)
    if (personne === idDe(d.personne)) throw new APIError('La demande est déjà confiée à cette personne.', 400, null, true)
    await req.payload.update({
      collection: 'expertRequests',
      id: d.id,
      overrideAccess: true,
      req,
      context: { systeme: true },
      data: {
        personne,
        statut: 'reattribuee',
        echeance: ajouterJoursOuvres(new Date(), DELAI_JOURS_OUVRES).toISOString(),
        fil: evenement(d, `Demande réattribuée à ${p.nom}.`, req),
      } as never,
    })
    await solliciter(req.payload, d.id, false, req)
    await logAction(req.payload, { req, categorie: 'validation', action: `Question réattribuée à ${p.nom}` })
    return Response.json({ ok: true })
  },
}

const repondre: Endpoint = {
  path: '/:id/repondre',
  method: 'post',
  handler: async (req) => {
    const d = await charger(req)
    const texte = String((await corps(req)).texte ?? '').trim()
    if (texte.length < 5) throw new APIError('Écrivez la réponse.', 400, null, true)
    await req.payload.update({
      collection: 'expertRequests',
      id: d.id,
      overrideAccess: true,
      req,
      context: { systeme: true },
      data: { statut: 'repondue', nonLuMembre: true, fil: evenement(d, texte.slice(0, 5000), req, 'rec242') } as never,
    })
    return Response.json({ ok: true })
  },
}

const cloturer: Endpoint = {
  path: '/:id/cloturer',
  method: 'post',
  handler: async (req) => {
    const d = await charger(req)
    await req.payload.update({
      collection: 'expertRequests',
      id: d.id,
      overrideAccess: true,
      req,
      context: { systeme: true },
      data: { statut: 'cloturee', fil: evenement(d, 'Demande clôturée par l’équipe.', req) } as never,
    })
    return Response.json({ ok: true })
  },
}

export const endpointsExperts: Endpoint[] = [relancer, reattribuer, repondre, cloturer]
