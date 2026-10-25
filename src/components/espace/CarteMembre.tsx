import Link from 'next/link'
import React from 'react'

import { jetonCarte, qrSvg } from '@/lib/membres/carte'

type Props = {
  nom: string
  ini: string
  photo?: string
  entreprise?: string
  categorie: string
  numero?: string
  statut: string
}

export async function Qr({ numero, className = 'qr' }: { numero?: string; className?: string }) {
  if (!numero) return null
  const svg = await qrSvg(jetonCarte(numero))
  return <span className={className} role="img" aria-label="QR code de membre" dangerouslySetInnerHTML={{ __html: svg }} />
}

/** Carte récapitulative du tableau de bord (lien vers Ma carte). */
export async function CarteResume(p: Props) {
  return (
    <Link className="mcard" href="/espace-membre/carte" aria-label="Ouvrir ma carte de membre">
      <span className="rec-rule" style={{ display: 'flex' }}>
        <span />
        <span />
        <span />
      </span>
      <span className="mcard-body">
        <span className="stack-s">
          <span className={`av av-lg mcard-av ${p.photo ? 'av-photo' : ''}`}>
            {p.ini}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.photo && <img src={p.photo} alt={p.nom} />}
          </span>
          <span className="st" style={{ width: 'max-content' }}>
            {p.statut}
          </span>
          <span className="h3">{p.nom}</span>
          <span className="small muted">
            {p.entreprise} · Cat. {p.categorie}
          </span>
          <span className="mono brand">{p.numero}</span>
        </span>
        <Qr numero={p.numero} />
      </span>
    </Link>
  )
}
