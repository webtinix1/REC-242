import type { Metadata } from 'next'
import React from 'react'

import { CandidatureForm, type CategorieVue } from '@/components/site/CandidatureForm'
import { JsonLd } from '@/components/site/JsonLd'
import { jetonFormulaire } from '@/lib/antispam'
import { CATEGORIES, montants, type Tarifs } from '@/lib/adhesion/categories'
import {
  AGES,
  ANCIENNETES,
  AUTORISATIONS,
  CIVILITES,
  CONNU_PAR,
  EFFECTIFS,
  FORMES,
  OBJECTIFS,
} from '@/lib/adhesion/options'
import { docHref, getTextesOfficiels } from '@/lib/site/data'
import { getPayloadClient } from '@/lib/site/payload'
import { breadcrumbLd, metadataFor } from '@/lib/site/seo'
import { getSettings } from '@/lib/site/settings'

// Jeton anti-robot horodaté et catégorie de l'adresse : la page n'est pas prérendue.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await metadataFor('/adherer/candidature', {
      title: 'Ma candidature',
      description: 'Candidature en ligne à REC 242, en cinq étapes.',
    })),
    robots: { index: false },
  }
}

/** Écran 10 : candidature en ligne. */
export default async function Candidature({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>
}) {
  const sp = await searchParams
  const [payload, s, textes] = await Promise.all([
    getPayloadClient(),
    getSettings(),
    getTextesOfficiels(),
  ])
  const [localites, secteurs] = await Promise.all([
    payload.find({ collection: 'localities', sort: 'ordre', limit: 50, depth: 0 }),
    payload.find({ collection: 'sectors', sort: 'ordre', limit: 50, depth: 0 }),
  ])
  const tarifs = s.tarifs as Tarifs | undefined
  const categories: CategorieVue[] = CATEGORIES.map((c) => {
    const m = montants(c, tarifs)
    return {
      valeur: c.valeur,
      lettre: c.lettre,
      nom: c.nom,
      convention: c.convention,
      note: c.note,
      droit: m?.droit,
      cotisation: m?.cotisation,
      total: m?.total,
      tranche: m?.tranche,
      premier: m?.premierVersement,
    }
  })
  const lienTexte = (debut: string) => {
    const d = textes.find((t) => t.titre.startsWith(debut) && t.visibilite === 'public')
    return d ? docHref(d) : undefined
  }
  return (
    <>
      <CandidatureForm
        jeton={jetonFormulaire()}
        categorieInitiale={sp.categorie}
        categories={categories}
        localites={localites.docs.map((l) => ({
          id: l.id as number,
          nom: (l as unknown as { nom: string }).nom,
        }))}
        secteurs={secteurs.docs.map((x) => ({
          id: x.id as number,
          nom: (x as unknown as { nom: string }).nom,
        }))}
        options={{
          civilites: CIVILITES,
          ages: AGES,
          formes: FORMES,
          effectifs: EFFECTIFS,
          anciennetes: ANCIENNETES,
          objectifs: OBJECTIFS,
          connuPar: CONNU_PAR,
          autorisations: AUTORISATIONS.map((a) => ({ name: a.name, label: a.label })),
        }}
        delaiMois={tarifs?.delaiMois ?? 3}
        liens={{
          statuts: lienTexte('Statuts'),
          reglement: lienTexte('Règlement'),
          charte: lienTexte('Charte'),
        }}
      />
      <JsonLd
        data={breadcrumbLd([
          { nom: 'Adhérer', chemin: '/adherer' },
          { nom: 'Ma candidature', chemin: '/adherer/candidature' },
        ])}
      />
    </>
  )
}
