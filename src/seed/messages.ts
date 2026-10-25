/**
 * Lot 4 : messages des formulaires (seed/demandes-et-messages.json), réponses types, page Contact.
 */
import type { Payload } from 'payload'

import { MOTIFS, type Destination } from '@/collections/ContactMessages'
import { slugify } from '@/fields/slug'
import { media, readSeed } from './lib'

type MessageSeed = {
  motif: string
  de: string
  objet: string
  recu: string
  traite: boolean
  dest: string
  qui: string
  tel: string
  mail: string
  corps: string
  rep: string
  notes: { who: string; t: string }[]
  sent: boolean
}

const DEST: Record<string, Destination> = {
  'Responsable membres': 'membres',
  'Commission Partenariats': 'partenariats',
  Communication: 'communication',
  'Responsable événements': 'evenements',
  Secrétariat: 'secretariat',
}

/** « Il y a 2 h », « Hier », « Il y a 3 jours » → date passée correspondante. */
const ilYa = (recu: string): Date => {
  const now = Date.now()
  const h = recu.match(/(\d+)\s*h/)
  if (h) return new Date(now - Number(h[1]) * 3600e3)
  if (/hier/i.test(recu)) return new Date(now - 24 * 3600e3)
  const j = recu.match(/(\d+)\s*jour/)
  return new Date(now - Number(j?.[1] ?? 0) * 24 * 3600e3)
}

// Réponses types proposées dans la boîte de réception (titres de la maquette, textes à relire par REC 242).
const REPONSES_TYPES = [
  {
    titre: 'Informations sur l’adhésion',
    texte:
      'Bonjour {{prenom}}, merci pour votre message. Vous trouverez les catégories, les montants et le dossier de candidature sur la page Adhérer du site. Nous restons à votre disposition pour toute question. Bien cordialement, l’équipe de REC 242.',
  },
  {
    titre: 'Remerciement et prise en charge',
    texte:
      'Bonjour {{prenom}}, merci pour votre message. Nous l’avons bien reçu et nous revenons vers vous rapidement. Bien cordialement, l’équipe de REC 242.',
  },
  {
    titre: 'Proposer un rendez-vous au siège',
    texte:
      'Bonjour {{prenom}}, merci pour votre message. Nous vous proposons une rencontre au siège de REC 242. Indiquez-nous les jours et heures qui vous conviennent. Bien cordialement, l’équipe de REC 242.',
  },
  {
    titre: 'Transmis au bon interlocuteur',
    texte:
      'Bonjour {{prenom}}, merci pour votre message. Nous l’avons transmis à la personne chargée de votre demande, qui vous répond directement. Bien cordialement, l’équipe de REC 242.',
  },
]

export async function seedMessages(payload: Payload): Promise<void> {
  // Réponses types : ajoutées seulement si la liste est vide.
  const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })) as {
    alertes?: { reponsesTypes?: unknown[] }
  }
  if (!s.alertes?.reponsesTypes?.length)
    await payload.updateGlobal({
      slug: 'settings',
      overrideAccess: true,
      context: { skipAudit: true },
      data: { alertes: { ...(s.alertes ?? {}), reponsesTypes: REPONSES_TYPES } } as never,
    })

  // Page Contact : bandeau photo du siège.
  const contact = await payload.find({
    collection: 'pages',
    where: { chemin: { equals: '/contact' } },
    limit: 1,
    depth: 0,
    draft: true,
    overrideAccess: true,
  })
  if (!contact.docs[0])
    await payload.create({
      collection: 'pages',
      overrideAccess: true,
      context: { skipAudit: true },
      data: {
        title: 'Contact',
        slug: slugify('Contact'),
        chemin: '/contact',
        menu: 'Contact',
        _status: 'published',
        layout: [
          {
            blockType: 'section',
            ancre: 'siege',
            surtitre: 'Siège',
            image: await media(
              payload,
              'design/images/photos/brazzaville-fleuve.webp',
              'Vue de Brazzaville',
              true,
              [50, 60],
            ),
            note: 'Brazzaville, Centre-Ville',
          },
        ],
      } as never,
    })

  const deja = await payload.count({ collection: 'contactMessages', overrideAccess: true })
  if (deja.totalDocs) return
  const users = await payload.find({
    collection: 'users',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  const userId = (nom: string) => users.docs.find((u) => (u as { name?: string }).name === nom)?.id
  const { messages_contact } = readSeed<{ messages_contact: MessageSeed[] }>('demandes-et-messages')
  for (const m of [...messages_contact].reverse()) {
    const motif = MOTIFS.find((x) => x.label === m.motif)?.value ?? 'autre'
    const date = ilYa(m.recu)
    const doc = await payload.create({
      collection: 'contactMessages',
      overrideAccess: true,
      data: {
        formulaire: motif === 'partenariat' ? 'partenariat' : 'contact',
        motif,
        nom: m.de,
        organisation: motif === 'partenariat' ? m.de : undefined,
        telephone: m.tel,
        email: m.mail,
        objet: m.objet,
        message: m.corps,
        qui: m.qui,
        destination: DEST[m.dest],
        page: '/contact',
      } as never,
    })
    const notes = m.notes.map((n) => {
      const [auteurNom] = n.who.split(',')
      return {
        auteur: userId(auteurNom.trim()),
        auteurNom: auteurNom.trim(),
        date: new Date(date.getTime() + 3600e3).toISOString(),
        texte: n.t,
      }
    })
    const repondu = m.sent || m.traite
    await payload.update({
      collection: 'contactMessages',
      id: doc.id,
      overrideAccess: true,
      data: {
        notes,
        statut: repondu ? 'traite' : 'a-traiter',
        reponses: repondu
          ? [
              {
                canal: 'email',
                texte: m.rep,
                auteurNom: 'Secrétariat',
                date: new Date(date.getTime() + 2 * 3600e3).toISOString(),
              },
            ]
          : [],
        historique: [
          { date: date.toISOString(), action: `Reçu, transmis à ${m.dest}` },
          ...(repondu
            ? [
                {
                  date: new Date(date.getTime() + 2 * 3600e3).toISOString(),
                  auteur: 'Secrétariat',
                  action: 'Réponse envoyée par e-mail',
                },
              ]
            : []),
        ],
      } as never,
    })
    await payload.db.updateOne({
      collection: 'contactMessages',
      id: doc.id,
      data: { createdAt: date.toISOString(), updatedAt: date.toISOString() },
    })
  }
  payload.logger.info(`Messages de démonstration : ${messages_contact.length}.`)
}
