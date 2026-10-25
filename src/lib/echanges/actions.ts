'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { autoriserEnvoi, ipDe } from '@/lib/antispam'
import { verifierJetonExpert } from '@/lib/experts/delais'
import { membreConnecte } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'
import { marquerLu, type Onglet } from './service'

/**
 * Actions de « Mes échanges » (écran 10) et de « Solliciter un expert » (écran 09). Chaque action vérifie que le membre
 * participe au fil ; les écritures passent ensuite par l'API locale sans utilisateur (accès système).
 */
export type EtatEchange = { ok?: boolean; erreur?: string; erreurs?: Record<string, string> }

const idDe = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number | undefined))
const maintenant = () => new Date().toISOString()

async function contexte() {
  const m = await membreConnecte()
  if (!m || m.statut !== 'actif') return null
  const payload = await getPayloadClient()
  return { m, payload }
}

/** « Solliciter un expert » : étiquette, personne, question, préférence de réponse (et opportunité si « Me faire aider »). */
export async function poserQuestion(_: EtatEchange, f: FormData): Promise<EtatEchange> {
  const c = await contexte()
  if (!c) return { erreur: 'Session expirée : reconnectez-vous.' }
  if (!autoriserEnvoi(`expert:${ipDe(await headers())}`, process.env.NODE_ENV === 'production' ? 10 : 100, 24 * 3600 * 1000))
    return { erreur: 'Trop de questions envoyées aujourd’hui. Réessayez demain.' }
  const question = String(f.get('question') ?? '').trim()
  if (question.length < 10) return { erreurs: { question: 'Posez votre question (10 caractères au moins).' } }
  const { user } = await c.payload.auth({ headers: await headers() })
  try {
    await c.payload.create({
      collection: 'expertRequests',
      overrideAccess: false,
      user,
      data: {
        etiquette: Number(f.get('etiquette')),
        personne: Number(f.get('personne')),
        question,
        preference: String(f.get('preference') ?? 'email'),
        opportunite: Number(f.get('opportunite')) || undefined,
      } as never,
    })
  } catch (e) {
    return { erreur: (e as Error).message }
  }
  revalidatePath('/espace-membre', 'layout')
  return { ok: true }
}

/** Écrire dans un fil ouvert (mise en relation acceptée, réponse à une annonce, demande à un expert non clôturée). */
export async function ecrire(onglet: Onglet, id: number, texte: string): Promise<EtatEchange> {
  const c = await contexte()
  if (!c) return { erreur: 'Session expirée : reconnectez-vous.' }
  const t = String(texte ?? '').trim().slice(0, 3000)
  if (t.length < 2) return { erreur: 'Écrivez votre message.' }
  const { payload, m } = c
  if (onglet === 'relations') {
    const r = (await payload.findByID({ collection: 'connectionRequests', id, depth: 0, overrideAccess: true })) as unknown as {
      statut: string
      demandeur: number
      destinataire: number
      fil?: unknown[]
    }
    const autre = idDe(r.demandeur) === m.id ? idDe(r.destinataire) : idDe(r.destinataire) === m.id ? idDe(r.demandeur) : undefined
    if (!autre) return { erreur: 'Échange introuvable.' }
    if (r.statut !== 'acceptee') return { erreur: 'Vous pourrez écrire quand la mise en relation sera acceptée.' }
    await payload.update({
      collection: 'connectionRequests',
      id,
      overrideAccess: true,
      context: { systeme: true },
      data: { fil: [...(r.fil ?? []), { auteur: m.id, texte: t, date: maintenant() }], nonLuPar: [autre] } as never,
    })
  } else if (onglet === 'annonces') {
    const r = (await payload.findByID({ collection: 'opportunityReplies', id, depth: 1, overrideAccess: true })) as unknown as {
      membre: number | { id: number }
      opportunite: { membre?: number | { id: number } | null }
      fil?: unknown[]
    }
    const auteurAnnonce = idDe(r.opportunite?.membre)
    const repondant = idDe(r.membre)
    const autre = m.id === auteurAnnonce ? repondant : m.id === repondant ? auteurAnnonce : undefined
    if (!autre) return { erreur: 'Échange introuvable.' }
    await payload.update({
      collection: 'opportunityReplies',
      id,
      overrideAccess: true,
      context: { systeme: true },
      data: { fil: [...(r.fil ?? []), { auteur: m.id, texte: t, date: maintenant() }], nonLuPar: [autre] } as never,
    })
  } else if (onglet === 'experts') {
    const r = (await payload.findByID({ collection: 'expertRequests', id, depth: 0, overrideAccess: true })) as unknown as { membre: number; statut: string; fil?: unknown[] }
    if (idDe(r.membre) !== m.id) return { erreur: 'Échange introuvable.' }
    if (r.statut === 'cloturee') return { erreur: 'Cette demande est clôturée.' }
    await payload.update({
      collection: 'expertRequests',
      id,
      overrideAccess: true,
      context: { systeme: true },
      data: { fil: [...(r.fil ?? []), { auteurType: 'membre', auteurNom: `${m.prenom} ${m.nom}`, texte: t, date: maintenant() }] } as never,
    })
  } else return { erreur: 'Les messages du réseau sont en lecture seule.' }
  revalidatePath('/espace-membre/echanges')
  return { ok: true }
}

export async function lu(onglet: Onglet, id: number): Promise<void> {
  const c = await contexte()
  if (!c) return
  // marquerLu ne touche que la liste du membre connecté : rien n'est révélé sur un fil qui n'est pas le sien.
  await marquerLu(c.payload, onglet, id, c.m.id)
  revalidatePath('/espace-membre', 'layout')
}

/** Clôture d'une demande à un expert par le membre. */
export async function cloturerDemande(id: number): Promise<EtatEchange> {
  const c = await contexte()
  if (!c) return { erreur: 'Session expirée : reconnectez-vous.' }
  const { user } = await c.payload.auth({ headers: await headers() })
  try {
    await c.payload.update({ collection: 'expertRequests', id, overrideAccess: false, user, data: { statut: 'cloturee' } as never })
  } catch (e) {
    return { erreur: (e as Error).message }
  }
  revalidatePath('/espace-membre/echanges')
  return { ok: true }
}

/** Réponse de la personne sollicitée, depuis le lien de son e-mail (jeton lié à la demande et à la personne). */
export async function repondreCommeExpert(_: EtatEchange, f: FormData): Promise<EtatEchange> {
  const j = verifierJetonExpert(String(f.get('jeton') ?? ''))
  if (!j) return { erreur: 'Ce lien n’est pas valable.' }
  const texte = String(f.get('reponse') ?? '').trim().slice(0, 5000)
  if (texte.length < 5) return { erreurs: { reponse: 'Écrivez votre réponse.' } }
  const payload = await getPayloadClient()
  const r = (await payload.findByID({ collection: 'expertRequests', id: j.demande, depth: 1, overrideAccess: true }).catch(() => null)) as unknown as {
    personne?: { id: number; nom?: string } | null
    statut: string
    fil?: unknown[]
  } | null
  if (!r || r.personne?.id !== j.personne) return { erreur: 'Cette demande a été confiée à une autre personne.' }
  if (r.statut === 'cloturee') return { erreur: 'Cette demande est clôturée.' }
  await payload.update({
    collection: 'expertRequests',
    id: j.demande,
    overrideAccess: true,
    context: { systeme: true },
    data: { fil: [...(r.fil ?? []), { auteurType: 'expert', auteurNom: r.personne?.nom ?? '', texte, date: maintenant() }], statut: 'repondue', nonLuMembre: true } as never,
  })
  return { ok: true }
}

/** « Rejoindre une autre commission » (écran 03) : commission ouverte et « ce que je peux apporter ». */
export async function demanderCommission(_: EtatEchange, f: FormData): Promise<EtatEchange> {
  const c = await contexte()
  if (!c) return { erreur: 'Session expirée : reconnectez-vous.' }
  const apport = String(f.get('apport') ?? '').trim()
  if (apport.length < 10) return { erreurs: { apport: 'Dites en quelques mots ce que vous pouvez apporter.' } }
  const { user } = await c.payload.auth({ headers: await headers() })
  try {
    await c.payload.create({ collection: 'commissionRequests', overrideAccess: false, user, data: { commission: Number(f.get('commission')), apport } as never })
  } catch (e) {
    return { erreur: (e as Error).message }
  }
  revalidatePath('/espace-membre/profil')
  return { ok: true }
}
