import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { OpportunitePublier, type ValeursPublier } from '@/components/espace/OpportunitePublier'
import { exigerMembre } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

export const metadata: Metadata = { title: 'Publier une opportunité' }

const jour = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Africa/Brazzaville' })

/** Publier une opportunité (écran 06). `?id=` : modifier ou republier une de ses annonces. */
export default async function PublierPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const m = await exigerMembre()
  const q = await searchParams
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  const secteurs = (await payload.find({ collection: 'sectors', sort: 'ordre', limit: 100, depth: 0, overrideAccess: true, select: { nom: true } })).docs as unknown as { id: number; nom: string }[]

  let init: ValeursPublier = {
    type: 'offre-membre',
    titre: '',
    description: '',
    secteur: secteurs[0] ? String(secteurs[0].id) : '',
    visibilite: 'membres',
    dateLimite: '',
    commentRepondre: 'Par le formulaire de réponse de l’espace membre',
  }
  const id = Number(typeof q.id === 'string' ? q.id : '')
  if (id) {
    const d = (await payload.findByID({ collection: 'opportunities', id, depth: 1, user, overrideAccess: false }).catch(() => null)) as unknown as
      | { id: number; type: string; titre: string; description: string; secteurs?: ({ id: number } | number)[]; visibilite: string; dateLimite?: string; commentRepondre?: string; pieceJointe?: { filename?: string } | number; membre?: number | { id: number }; statut: string }
      | null
    const auteur = d && (typeof d.membre === 'object' ? d.membre?.id : d.membre)
    if (!d || auteur !== m.id || d.statut === 'publiee') notFound()
    const s = d.secteurs?.[0]
    const futur = d.dateLimite && jour(d.dateLimite) >= jour(new Date()) ? jour(d.dateLimite) : ''
    init = {
      id: d.id,
      type: d.type,
      titre: d.titre,
      description: d.description,
      secteur: s ? String(typeof s === 'object' ? s.id : s) : '',
      visibilite: d.visibilite === 'public' ? 'public' : 'membres',
      dateLimite: futur,
      commentRepondre: d.commentRepondre || init.commentRepondre,
      pieceActuelle: d.pieceJointe && typeof d.pieceJointe === 'object' ? d.pieceJointe.filename : undefined,
    }
  }
  return (
    <>
      <div className="top">
        <h1 className="h1">Publier une opportunité</h1>
      </div>
      <div>
        <Link className="linkbtn" href="/espace-membre/opportunites">
          ← Opportunités
        </Link>
      </div>
      <OpportunitePublier init={init} secteurs={secteurs} aujourdhui={jour(new Date())} />
    </>
  )
}
