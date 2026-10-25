import type { Metadata } from 'next'
import React from 'react'

import { QrAgrandir } from '@/components/espace/QrAgrandir'
import { jetonCarte, qrSvg } from '@/lib/membres/carte'
import { dateLongue, exigerMembre, initialesDe, lettreCategorie, nomCategorie, urlMedia } from '@/lib/membres/espace'
import { statutMembreLabel } from '@/lib/membres/options'

export const metadata: Metadata = { title: 'Ma carte' }

/** Ma carte de membre (écran 13). */
export default async function CartePage() {
  const m = await exigerMembre()
  const photo = urlMedia(m.photo, 'vignette')
  const nom = `${m.prenom} ${m.nom}`
  return (
    <>
      <div className="top">
        <h1 className="h1">Ma carte de membre</h1>
      </div>
      <div className="split">
        <div className="mcard bigcard">
          <div className="bigcard-head">
            <span className="plate">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-rec242-328.webp" alt="REC 242" width={96} height={28} />
            </span>
            <span className="st">{statutMembreLabel(m.statut)}</span>
          </div>
          <span className="rec-rule" style={{ display: 'flex' }}>
            <span />
            <span />
            <span />
          </span>
          <div className="mcard-body">
            <div className="stack-s">
              <span className={`av av-lg ${photo ? 'av-photo' : ''}`}>
                {initialesDe(m)}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photo && <img src={photo} alt={nom} />}
              </span>
              <p className="h2">{nom}</p>
              <p className="small muted">{m.entreprise?.nom}</p>
              <p className="small">
                Catégorie {lettreCategorie(m.categorie)} · {nomCategorie(m.categorie)}
              </p>
              <p className="mono brand" style={{ fontSize: 18 }}>
                {m.numeroAdherent}
              </p>
              {m.validiteCarte && <p className="xs muted">Valable jusqu’au {dateLongue(m.validiteCarte)}</p>}
            </div>
            {m.numeroAdherent && <QrAgrandir svg={await qrSvg(jetonCarte(m.numeroAdherent))} />}
          </div>
        </div>
        <div className="stack">
          <div className="card-soft">
            <h2 className="h3">À l&apos;entrée des événements</h2>
            <p className="small">Présentez ce QR code : il est scanné pour confirmer votre présence. Agrandissez-le pour faciliter le scan.</p>
          </div>
          <div className="card">
            <h2 className="h3">Garder ma carte sous la main</h2>
            <a className="rec-btn rec-btn--secondary" style={{ width: 'max-content' }} href="/espace-membre/carte/pdf" download>
              Télécharger en PDF
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
