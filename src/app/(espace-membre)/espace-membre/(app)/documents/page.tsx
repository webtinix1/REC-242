import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import React from 'react'

import { Icone } from '@/components/espace/Icones'
import { telephoneAffiche } from '@/lib/adhesion/categories'
import { RUBRIQUES } from '@/collections/Documents'
import { dateLongue, exigerMembre, urlMedia, type Media } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

export const metadata: Metadata = { title: 'Documents du réseau' }

type Doc = { id: number; titre: string; rubrique: string; visibilite: string; dateDocument?: string | null; createdAt: string; couverture?: Media | number | null }

const VISIBILITE: Record<string, string> = { public: 'Public', membres: 'Membres' }

/** Documents du réseau (écran 12) : ceux que le membre a le droit de lire (la collection filtre), ses reçus, le groupe WhatsApp, le secrétariat. */
export default async function DocumentsPage() {
  const m = await exigerMembre()
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  const [docs, recus, s] = await Promise.all([
    payload.find({ collection: 'documents', sort: '-dateDocument', limit: 100, depth: 1, user, overrideAccess: false }),
    payload.count({ collection: 'payments', where: { and: [{ membre: { equals: m.id } }, { statut: { equals: 'paye' } }] }, overrideAccess: true }),
    payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true }) as Promise<{ email?: string; whatsapp?: { numero?: string; lienGroupe?: string } }>,
  ])
  const liste = docs.docs as unknown as Doc[]
  const wa = s.whatsapp?.numero ? telephoneAffiche(s.whatsapp.numero) : ''
  const contact = [wa && `sur WhatsApp au ${wa}`, s.email && `à ${s.email}`].filter(Boolean)

  const vignette = (url?: string) => (
    <span className="doc-th pick" aria-hidden="true" style={url ? undefined : { display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-brand)' }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <Icone nom="file" className="ic" />
      )}
    </span>
  )

  return (
    <>
      <div className="top">
        <h1 className="h1">Documents du réseau</h1>
      </div>
      <div className="split">
        <div className="card">
          <h2 className="h3">Documents du réseau</h2>
          {liste.map((d) => (
            <div className="item" key={d.id}>
              {vignette(urlMedia(d.couverture, 'vignette'))}
              <div className="grow">
                <p style={{ fontWeight: 600 }}>{d.titre}</p>
                <p className="xs muted">
                  {RUBRIQUES.find((r) => r.value === d.rubrique)?.label ?? ''} · PDF · {dateLongue(d.dateDocument ?? d.createdAt)}
                </p>
              </div>
              <span className="tag vis-m">{VISIBILITE[d.visibilite] ?? 'Membres'}</span>
              <a className="linkbtn" href={`/api/documents/${d.id}/telecharger`} target="_blank" rel="noopener noreferrer" aria-label={`Télécharger : ${d.titre}`}>
                Télécharger
              </a>
            </div>
          ))}
          {recus.totalDocs > 0 && (
            <div className="item">
              {vignette()}
              <div className="grow">
                <p style={{ fontWeight: 600 }}>Reçus de paiement</p>
                <p className="xs muted">
                  Personnel · PDF · {recus.totalDocs} reçu{recus.totalDocs > 1 ? 's' : ''}
                </p>
              </div>
              <span className="tag vis-m">Personnel</span>
              <Link className="linkbtn" href="/espace-membre/cotisation">
                Télécharger
              </Link>
            </div>
          )}
          {!liste.length && recus.totalDocs === 0 && <p className="small muted">Aucun document pour le moment.</p>}
        </div>
        <div className="stack">
          {s.whatsapp?.lienGroupe && (
            <div className="card-soft">
              <p className="lbl">Groupe des membres</p>
              <p className="h3">WhatsApp des membres</p>
              <p className="small muted">Réservé aux membres actifs. Le comité de direction peut changer le lien s’il circule hors du réseau.</p>
              <a className="rec-btn rec-btn--primary" style={{ width: 'max-content' }} href={s.whatsapp.lienGroupe} target="_blank" rel="noopener noreferrer">
                Rejoindre le groupe
              </a>
            </div>
          )}
          {contact.length > 0 && (
            <div className="card">
              <p className="h3">Une question sur un document ?</p>
              <p className="small muted">Le secrétariat répond {contact.join(' et ')}.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
