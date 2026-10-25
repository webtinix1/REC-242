'use server'
import { headers } from 'next/headers'

import { MOTIFS, TYPES_PARTENARIAT, type Motif } from '@/collections/ContactMessages'
import { autoriserEnvoi, CHAMP_PIEGE, ipDe, jetonValide } from '@/lib/antispam'
import { recevoirMessage } from '@/lib/site/messages'
import { getPayloadClient } from '@/lib/site/payload'

export type EtatFormulaire = {
  ok?: boolean
  erreurs?: Record<string, string>
  general?: string
  avecEmail?: boolean
}

// Cinq envois par heure et par appareil en production ; plus souple en développement (tests répétés).
const MAX_PAR_HEURE = process.env.NODE_ENV === 'production' ? 5 : 50
const HEURE = 3600 * 1000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const val = (f: FormData, k: string, max = 500) =>
  String(f.get(k) ?? '')
    .trim()
    .slice(0, max)

/** Contrôles communs : champ piège, jeton horodaté, limitation par appareil. Renvoie une erreur ou null. */
async function controler(f: FormData, usage: string): Promise<EtatFormulaire | null> {
  // Robot : on fait comme si l'envoi avait réussi, sans rien enregistrer.
  if (val(f, CHAMP_PIEGE)) return { ok: true }
  if (!jetonValide(f.get('jeton')))
    return {
      general:
        'Le formulaire a expiré ou a été envoyé trop vite. Rechargez la page puis réessayez.',
    }
  if (!autoriserEnvoi(`${usage}:${ipDe(await headers())}`, MAX_PAR_HEURE, HEURE))
    return {
      general:
        'Trop d’envois depuis cet appareil. Réessayez dans une heure ou écrivez-nous sur WhatsApp.',
    }
  return null
}

/** Formulaire de contact (écran site 22). */
export async function envoyerContact(_: EtatFormulaire, f: FormData): Promise<EtatFormulaire> {
  const nom = val(f, 'nom', 120)
  const telephone = val(f, 'telephone', 40)
  const email = val(f, 'email', 160)
  const message = val(f, 'message', 5000)
  const motif = (MOTIFS.find((m) => m.value === val(f, 'motif'))?.value ?? 'autre') as Motif
  const erreurs: Record<string, string> = {}
  if (!nom) erreurs.nom = 'Indiquez votre nom.'
  if (!telephone && !email) erreurs.telephone = 'Indiquez un numéro ou un e-mail.'
  if (email && !EMAIL.test(email)) erreurs.email = 'Vérifiez l’adresse e-mail.'
  if (!message) erreurs.message = 'Écrivez votre message.'
  if (Object.keys(erreurs).length) return { erreurs }
  const bloque = await controler(f, 'contact')
  if (bloque) return bloque
  await recevoirMessage(await getPayloadClient(), {
    formulaire: 'contact',
    motif,
    nom,
    telephone,
    email,
    message,
    objet: val(f, 'objet', 120) || undefined,
    page: '/contact',
  })
  return { ok: true, avecEmail: Boolean(email) }
}

/** Formulaire « Devenir partenaire » (écran site 08) : motif Partenariat, transmis à la commission Partenariats. */
export async function envoyerPartenariat(_: EtatFormulaire, f: FormData): Promise<EtatFormulaire> {
  const organisation = val(f, 'organisation', 160)
  const nom = val(f, 'nom', 160)
  const email = val(f, 'email', 160)
  const telephone = val(f, 'telephone', 40)
  const message = val(f, 'message', 5000)
  const type = TYPES_PARTENARIAT.includes(val(f, 'type')) ? val(f, 'type') : 'Autre'
  const erreurs: Record<string, string> = {}
  if (!organisation) erreurs.organisation = 'Indiquez le nom de l’organisation.'
  if (!nom) erreurs.nom = 'Indiquez le nom et la fonction du contact.'
  if (!email) erreurs.email = 'Indiquez une adresse e-mail.'
  else if (!EMAIL.test(email)) erreurs.email = 'Vérifiez l’adresse e-mail.'
  if (!message) erreurs.message = 'Décrivez votre proposition.'
  if (Object.keys(erreurs).length) return { erreurs }
  const bloque = await controler(f, 'partenariat')
  if (bloque) return bloque
  await recevoirMessage(await getPayloadClient(), {
    formulaire: 'partenariat',
    motif: 'partenariat',
    nom,
    organisation,
    email,
    telephone,
    message,
    typePartenariat: type,
    page: '/devenir-partenaire',
  })
  return { ok: true, avecEmail: true }
}
