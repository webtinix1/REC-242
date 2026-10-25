import type { Payload, PayloadRequest } from 'payload'

import { notify } from '@/emails/send'
import { lienAnnulation, lienBillet } from './billets'
import { fichierIcs } from './ics'

export type Evenement = {
  id: number
  titre: string
  slug?: string
  debut: string
  fin?: string | null
  lieu?: string | null
  adresse?: string | null
  ville?: { nom?: string } | number | null
  indicationsAcces?: string | null
  messageInscrits?: string | null
  nouvelleDate?: string | null
  statut?: string
  billetQr?: boolean
}
export type Inscription = {
  id: number
  statut: string
  position?: number | null
  numeroBillet?: string | null
  membre?: { id: number; email?: string } | number | null
  visiteur?: { nom?: string; email?: string } | null
}

const TZ = 'Africa/Brazzaville'
export const jourLong = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
export const heureFr = (iso: string) =>
  new Date(iso)
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
    .replace(':00', ' h')
    .replace(':', ' h ')
export const lieuDe = (e: Evenement) =>
  [e.lieu, e.adresse, typeof e.ville === 'object' ? e.ville?.nom : undefined].filter(Boolean).join(', ')

/** Adresse e-mail de l'inscrit (membre ou visiteur). */
export async function emailDe(payload: Payload, i: Inscription, req?: PayloadRequest): Promise<string | undefined> {
  if (i.visiteur?.email) return i.visiteur.email
  const id = typeof i.membre === 'object' ? i.membre?.id : i.membre
  if (!id) return undefined
  if (typeof i.membre === 'object' && i.membre?.email) return i.membre.email
  const m = (await payload.findByID({ collection: 'members', id, depth: 0, overrideAccess: true, req })) as unknown as { email?: string }
  return m.email
}

/** E-mail 6 (inscrit, avec .ics et billet) ou 6 bis (liste d'attente). */
export async function envoyerConfirmation(payload: Payload, e: Evenement, i: Inscription, req?: PayloadRequest) {
  const to = await emailDe(payload, i, req)
  if (!to) return
  if (i.statut === 'attente') {
    await notify(payload, {
      to,
      template: 'inscriptionListeAttente',
      vars: { evenement: e.titre, date: jourLong(e.debut), position: String(i.position ?? ''), lien_annulation: lienAnnulation(i.id) },
    })
    return
  }
  const url = e.slug ? `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/agenda/${e.slug}` : undefined
  await notify(payload, {
    to,
    template: 'inscriptionConfirmation',
    vars: {
      evenement: e.titre,
      date: jourLong(e.debut),
      heure: heureFr(e.debut),
      lieu: lieuDe(e),
      numero_billet: i.numeroBillet ?? '',
      lien_billet: lienBillet(i.id),
      lien_annulation: lienAnnulation(i.id),
    },
    attachments: [
      {
        filename: 'evenement-rec242.ics',
        content: fichierIcs({ id: e.id, titre: e.titre, debut: e.debut, fin: e.fin, lieu: lieuDe(e), url }),
        contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
      },
    ],
  })
}

/** E-mail 7 : promotion depuis la liste d'attente. */
export async function envoyerPlaceLiberee(payload: Payload, e: Evenement, i: Inscription, req?: PayloadRequest) {
  const to = await emailDe(payload, i, req)
  if (to) await notify(payload, { to, template: 'placeLiberee', vars: { evenement: e.titre, lien_billet: lienBillet(i.id) } })
}

/** E-mail 9 : annulation ou report, à tous les inscrits et personnes en liste d'attente. */
export async function prevenirInscrits(payload: Payload, e: Evenement, req?: PayloadRequest) {
  const r = await payload.find({
    collection: 'registrations',
    where: { and: [{ evenement: { equals: e.id } }, { statut: { in: ['inscrit', 'attente'] } }] },
    depth: 1,
    limit: 5000,
    overrideAccess: true,
    req,
  })
  for (const d of r.docs as unknown as Inscription[]) {
    const to = await emailDe(payload, d, req)
    if (!to) continue
    await notify(payload, {
      to,
      template: 'evenementAnnuleReporte',
      vars: {
        evenement: e.titre,
        annule_ou_reporte: e.statut === 'annule' ? 'annulé' : 'reporté',
        message_organisateur: e.messageInscrits ?? '',
        nouvelle_date: e.statut === 'reporte' && e.nouvelleDate ? `${jourLong(e.nouvelleDate)} à ${heureFr(e.nouvelleDate)}` : '',
        lien_annulation: lienAnnulation(d.id),
      },
    })
  }
}
