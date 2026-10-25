import { APIError, type Endpoint, type PayloadRequest } from 'payload'

import { atLeast } from '@/access/roles'
import { promouvoir } from '@/lib/evenements/inscriptions'
import { telephoneAffiche } from '@/lib/adhesion/categories'
import { logAction } from '@/lib/audit'
import { pointer } from '@/lib/evenements/pointage'

const corps = async (req: PayloadRequest): Promise<Record<string, unknown>> => {
  try {
    return ((await req.json?.()) ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}
const exiger = (req: PayloadRequest, niveau: 'read' | 'partial' | 'full' = 'partial') => {
  if (!atLeast(req.user, 'evenements', niveau)) throw new APIError('Action non autorisée.', 403)
}

/** Écran 08 : scan d'un QR code (billet ou carte de membre). */
const scanner: Endpoint = {
  path: '/pointer',
  method: 'post',
  handler: async (req) => {
    exiger(req)
    const b = await corps(req)
    return Response.json(await pointer(req, Number(b.evenement), String(b.code ?? '')))
  },
}

/** Écran 08 : scans faits hors connexion, rejoués dans l'ordre à la reconnexion. */
const synchroniser: Endpoint = {
  path: '/synchroniser',
  method: 'post',
  handler: async (req) => {
    exiger(req)
    const b = await corps(req)
    const scans = (Array.isArray(b.scans) ? b.scans : []).slice(0, 2000) as { code?: string; date?: string }[]
    const resultats = []
    for (const s of scans) resultats.push({ code: s.code, ...(await pointer(req, Number(b.evenement), String(s.code ?? ''), s.date)) })
    return Response.json({ resultats })
  },
}

/** Écran 08, liste d'attente : « Promouvoir » manuellement une personne (e-mail automatique). */
const promotion: Endpoint = {
  path: '/:id/promouvoir',
  method: 'post',
  handler: async (req) => {
    exiger(req)
    const r = (await req.payload.findByID({ collection: 'registrations', id: req.routeParams?.id as string, depth: 0, overrideAccess: false, req })) as unknown as {
      id: number
      evenement: number
      statut: string
    }
    if (r.statut !== 'attente') throw new APIError('Cette personne n’est pas en liste d’attente.', 400, null, true)
    const promu = await promouvoir(req, r.evenement, r.id)
    await logAction(req.payload, { req, categorie: 'validation', action: 'Promotion manuelle depuis la liste d’attente' })
    return Response.json({ ok: Boolean(promu) })
  },
}

/** Écran 08 : export CSV des inscrits d'un événement (droit « Exports » partiel : ses événements). */
const exporter: Endpoint = {
  path: '/export',
  method: 'get',
  handler: async (req) => {
    exiger(req, 'read')
    if (!atLeast(req.user, 'exports', 'partial')) throw new APIError('Export non autorisé pour votre rôle.', 403)
    const ev = Number(new URL(req.url ?? '', 'http://x').searchParams.get('evenement'))
    const e = (await req.payload.findByID({ collection: 'events', id: ev, depth: 0, overrideAccess: false, req })) as unknown as { titre: string; slug?: string }
    const r = await req.payload.find({ collection: 'registrations', where: { evenement: { equals: ev } }, depth: 2, limit: 5000, sort: 'createdAt', overrideAccess: false, req })
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lignes = r.docs.map((d) => {
      const x = d as unknown as {
        statut: string
        position?: number
        numeroBillet?: string
        pointeLe?: string
        visiteur?: { nom?: string; email?: string; telephone?: string; entreprise?: string }
        membre?: { prenom?: string; nom?: string; email?: string; telephone?: string; entreprise?: { nom?: string } | null } | null
      }
      const m = x.membre
      return [
        m ? `${m.prenom ?? ''} ${m.nom ?? ''}`.trim() : x.visiteur?.nom,
        m ? 'Membre' : 'Visiteur',
        m ? m.entreprise?.nom : x.visiteur?.entreprise,
        m ? m.email : x.visiteur?.email,
        telephoneAffiche((m ? m.telephone : x.visiteur?.telephone) ?? undefined),
        x.statut === 'attente' ? `Liste d’attente (${x.position})` : x.statut,
        x.numeroBillet,
        x.pointeLe ? new Date(x.pointeLe).toISOString() : '',
      ]
        .map(esc)
        .join(';')
    })
    await logAction(req.payload, { req, categorie: 'export', action: `A exporté les inscrits : ${e.titre}` })
    return new Response('﻿' + ['participant;profil;entreprise;email;telephone;statut;billet;pointe_le', ...lignes].join('\r\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="inscrits-${e.slug ?? ev}.csv"` },
    })
  },
}

export const endpointsInscriptions: Endpoint[] = [scanner, synchroniser, exporter, promotion]

/** Écran 07 : « Dupliquer » (copie en brouillon, sans inscrits ni éléments d'après l'événement). */
export const dupliquer: Endpoint = {
  path: '/:id/dupliquer',
  method: 'post',
  handler: async (req) => {
    exiger(req)
    const e = (await req.payload.findByID({ collection: 'events', id: req.routeParams?.id as string, depth: 0, overrideAccess: false, req })) as unknown as Record<string, unknown>
    const copie: Record<string, unknown> = { ...e }
    for (const k of ['id', 'createdAt', 'updatedAt', 'slug', 'compteRendu', 'participants', 'galerie', 'actualite', 'messageInscrits', 'nouvelleDate'])
      delete copie[k]
    const strip = (rows: unknown) => (Array.isArray(rows) ? rows.map(({ id: _id, ...r }) => r) : rows)
    copie.programme = strip(copie.programme)
    copie.intervenants = strip(copie.intervenants)
    copie.documents = strip(copie.documents)
    copie.titre = `${e.titre} (copie)`
    copie.statut = 'brouillon'
    const doc = await req.payload.create({ collection: 'events', data: copie as never, overrideAccess: false, req })
    return Response.json({ id: doc.id })
  },
}
