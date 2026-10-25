import type { Payload } from 'payload'

import { destinationLabel, motifLabel, ROUTAGE, type Motif } from '@/collections/ContactMessages'
import { notify } from '@/emails/send'

export type NouveauMessage = {
  formulaire: 'contact' | 'partenariat'
  motif: Motif
  nom: string
  organisation?: string
  telephone?: string
  email?: string
  objet?: string
  message: string
  typePartenariat?: string
  page?: string
}

const court = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s)

/**
 * Enregistre un message reçu par un formulaire du site, l'achemine selon le motif,
 * envoie l'accusé de réception (modèle 23) et, si les paramètres le prévoient, l'alerte à l'équipe.
 */
export async function recevoirMessage(payload: Payload, m: NouveauMessage) {
  const objet =
    m.objet?.trim() ||
    (m.formulaire === 'partenariat'
      ? `Proposition de partenariat${m.typePartenariat ? ` : ${m.typePartenariat.toLowerCase()}` : ''}`
      : court(m.message.replace(/\s+/g, ' ')))
  const doc = await payload.create({
    collection: 'contactMessages',
    overrideAccess: true,
    data: {
      formulaire: m.formulaire,
      motif: m.motif,
      nom: m.nom,
      organisation: m.organisation,
      telephone: m.telephone,
      email: m.email,
      objet,
      message: m.message,
      typePartenariat: m.typePartenariat,
      page: m.page,
      qui: m.formulaire === 'partenariat' ? m.organisation : undefined,
    } as never,
  })
  const destinataire = destinationLabel(ROUTAGE[m.motif])
  const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })) as {
    whatsapp?: { numero?: string }
    alertes?: { adresseAlerte?: string; copie?: string; alertesAussi?: string }
  }
  if (m.email) {
    await notify(payload, {
      to: m.email,
      template: 'accuseReceptionFormulaire',
      vars: {
        prenom: m.nom.trim().split(/\s+/)[0],
        destinataire: destinataire.toLowerCase(),
        whatsapp: s.whatsapp?.numero,
      },
    })
  }
  if (s.alertes?.alertesAussi === 'messages' && s.alertes.adresseAlerte) {
    await notify(payload, {
      to: s.alertes.adresseAlerte,
      cc: s.alertes.copie || undefined,
      template: 'alerteMessage',
      vars: {
        nom: m.nom,
        formulaire: m.formulaire === 'partenariat' ? 'Devenir partenaire' : 'Contact',
        motif: motifLabel(m.motif),
        objet,
        destinataire,
        lien_back_office: `${process.env.NEXT_PUBLIC_SERVER_URL || ''}/admin/collections/contactMessages?id=${doc.id}`,
      },
    })
  }
  return doc
}
