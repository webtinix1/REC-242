import type { ListViewServerProps } from 'payload'
import React from 'react'

import { DESTINATIONS, destinationLabel, motifLabel, MOTIFS } from '@/collections/ContactMessages'
import { BoView, initiales, relatif } from '../BoView'
import { MessagesInbox, type InboxMessage } from './MessagesInbox'

/**
 * Écran 13 : boîte de réception des messages des formulaires.
 * Les messages sont lus avec les droits de l'utilisateur : chaque rôle ne voit que ce qui lui est transmis.
 */
export const MessagesView = async (props: ListViewServerProps) => {
  const { payload, user, searchParams } = props
  const motif =
    typeof searchParams?.motif === 'string' && MOTIFS.some((m) => m.value === searchParams.motif)
      ? searchParams.motif
      : undefined
  const r = await payload.find({
    collection: 'contactMessages',
    user,
    overrideAccess: false,
    where: {
      and: [
        { statut: { not_equals: 'archive' } },
        ...(motif ? [{ motif: { equals: motif } }] : []),
      ],
    },
    sort: '-createdAt',
    limit: 200,
    depth: 0,
  })
  const s = (await payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true })) as {
    alertes?: { reponsesTypes?: { titre: string; texte: string }[] }
    whatsapp?: { numero?: string }
    email?: string
  }
  // Destinataires possibles pour « Transmettre », avec les personnes qui ont le rôle correspondant.
  const users = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    where: { statut: { equals: 'actif' } },
  })
  const transmettre = DESTINATIONS.map((d) => {
    const noms = users.docs
      .filter((u) =>
        ((u as { roles?: string[] }).roles ?? []).some((x) =>
          (d.roles as readonly string[]).includes(x),
        ),
      )
      .map((u) => (u as { name?: string }).name)
      .filter(Boolean)
      .slice(0, 2)
    return { value: d.value, label: noms.length ? `${d.label} · ${noms.join(', ')}` : d.label }
  })
  const messages: InboxMessage[] = r.docs.map((d) => {
    const m = d as unknown as Record<string, unknown> & {
      id: number
      nom: string
      createdAt: string
      notes?: { auteurNom?: string; date?: string; texte: string }[]
      reponses?: { canal: string; texte: string; auteurNom?: string; date?: string }[]
      luPar?: number[]
    }
    return {
      id: m.id,
      nom: m.nom,
      ini: initiales(m.nom),
      qui: (m.qui as string) || (m.organisation as string) || '',
      telephone: (m.telephone as string) || '',
      email: (m.email as string) || '',
      objet: (m.objet as string) || '',
      message: (m.message as string) || '',
      motif: motifLabel(m.motif as string),
      formulaire: m.formulaire === 'partenariat' ? 'Devenir partenaire' : 'Contact',
      typePartenariat: (m.typePartenariat as string) || '',
      destination: destinationLabel(m.destination as string),
      statut: m.statut as string,
      recu: relatif(m.createdAt),
      nonLu: m.statut === 'a-traiter' && !(m.luPar ?? []).includes(user?.id as number),
      notes: (m.notes ?? []).map((n) => ({
        qui: n.auteurNom || '',
        quand: n.date ? relatif(n.date) : '',
        texte: n.texte,
      })),
      reponses: (m.reponses ?? []).map((x) => ({
        canal: x.canal === 'whatsapp' ? 'WhatsApp' : 'e-mail',
        texte: x.texte,
        qui: x.auteurNom || '',
        quand: x.date ? relatif(x.date) : '',
      })),
    }
  })
  const selection = typeof searchParams?.id === 'string' ? Number(searchParams.id) : undefined
  return (
    <BoView titre="Messages">
      <MessagesInbox
        messages={messages}
        motif={motif}
        motifs={MOTIFS.map(({ value, label }) => ({ value, label }))}
        selection={selection}
        reponsesTypes={s.alertes?.reponsesTypes ?? []}
        transmettre={transmettre}
      />
      <p className="small muted">
        Routage par motif : Adhésion → responsable membres, Partenariat → commission Partenariats,
        Presse → communication, Événement → responsable événements. Une réponse par e-mail part de{' '}
        {s.email || 'l’adresse de contact'} ; par WhatsApp, du numéro officiel.
      </p>
    </BoView>
  )
}
