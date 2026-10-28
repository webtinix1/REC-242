import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { AnnuaireRelation } from '@/components/espace/AnnuaireRelation'
import { Visage } from '@/components/espace/AnnuaireVisage'
import { estAbonne } from '@/lib/abonnement/service'
import { ficheAnnuaire } from '@/lib/annuaire/donnees'
import { exigerMembre } from '@/lib/membres/espace'
import { demanderRelation, signalerFiche } from '../actions'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const m = await exigerMembre()
  const f = await ficheAnnuaire(slug, true, estAbonne(m))
  return { title: f?.nom ?? 'Annuaire' }
}

/** Fiche d'un membre (écran 08). */
export default async function FichePage({ params }: Props) {
  const m = await exigerMembre()
  const { slug } = await params
  const f = await ficheAnnuaire(slug, true, estAbonne(m))
  if (!f) notFound()
  const soiMeme = f.titulaireId === m.id
  return (
    <>
      <div className="top">
        <h1 className="h1">Fiche membre</h1>
      </div>
      <Link className="linkbtn" href="/espace-membre/annuaire">
        ← Annuaire
      </Link>
      <div className="card-soft" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        <Visage grand photo={f.photo} logo={f.logo} dirigeant={f.dirigeant} nom={f.nom} />
        <div className="grow stack-s">
          <p className="h2">{f.nom}</p>
          <p className="small muted">
            {[f.secteur, [f.ville, f.quartier].filter(Boolean).join(', ')].filter(Boolean).join(' · ')} · catégorie {f.categorie}
          </p>
          <div className="row">
            <span className="st">Membre actif</span>
          </div>
        </div>
      </div>
      <div className="split">
        <div className="stack">
          <div className="card">
            <h2 className="h3">Présentation</h2>
            <p>{f.presentation || 'Présentation à venir.'}</p>
            {f.illustration && (
              <figure className="photo" style={{ height: 240, borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.illustration.url} alt={f.illustration.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </figure>
            )}
          </div>
          {f.detaille ? (
            <div className="card">
              <h2 className="h3">Fiche détaillée</h2>
              <div className="contact">
                <span className="muted">Dirigeant</span>
                <span>{f.dirigeant}</span>
              </div>
              <div className="contact">
                <span className="muted">Quartier</span>
                <span>{f.quartier}</span>
              </div>
              <div className="contact">
                <span className="muted">Taille</span>
                <span>{f.taille}</span>
              </div>
              <div className="contact">
                <span className="muted">Commission</span>
                <span>{f.commission}</span>
              </div>
            </div>
          ) : (
            <div className="card">
              <h2 className="h3">Fiche détaillée</h2>
              <p className="small">
                Dirigeant, portrait, quartier, taille et commissions sont réservés à l’abonnement « Annuaire détaillé ». Vous pouvez déjà écrire à ce membre depuis la plateforme.
              </p>
              <Link className="linkbtn" href="/espace-membre/annuaire#abonnement">
                Découvrir l’abonnement →
              </Link>
            </div>
          )}
        </div>
        <AnnuaireRelation entreprise={f.id} nom={f.nom} soiMeme={soiMeme} demander={demanderRelation} signaler={signalerFiche} />
      </div>
    </>
  )
}
