import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import React from 'react'

import { ReponseExpert } from '@/components/site/ReponseExpert'
import { repondreCommeExpert } from '@/lib/echanges/actions'
import { verifierJetonExpert } from '@/lib/experts/delais'
import { getPayloadClient } from '@/lib/site/payload'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Répondre à une question', robots: { index: false, follow: false } }

type Demande = {
  id: number
  question: string
  preference: string
  statut: string
  etiquette?: { nom?: string } | null
  personne?: { id: number; nom?: string } | null
  membre?: { prenom?: string; nom?: string; entreprise?: { nom?: string } | null } | null
  fil?: { auteurType?: string; auteurNom?: string; texte?: string; date?: string }[] | null
}

const PREFERENCE: Record<string, string> = { whatsapp: 'WhatsApp', email: 'E-mail', siege: 'Rendez-vous au siège' }
const quand = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' }) : ''

/** Page de réponse de la personne sollicitée (lien de l'e-mail 14) : le jeton est lié à la demande et à la personne. */
export default async function ReponseExpertPage({ params }: { params: Promise<{ jeton: string }> }) {
  const j = verifierJetonExpert(decodeURIComponent((await params).jeton))
  if (!j) notFound()
  const payload = await getPayloadClient()
  const d = (await payload.findByID({ collection: 'expertRequests', id: j.demande, depth: 2, overrideAccess: true }).catch(() => null)) as unknown as Demande | null
  if (!d) notFound()

  const reattribuee = d.personne?.id !== j.personne
  const cloturee = d.statut === 'cloturee'
  const membre = d.membre ? `${d.membre.prenom ?? ''} ${d.membre.nom ?? ''}`.trim() : ''

  return (
    <>
      <section className="band bg-tint trame phead">
        <div className="wrap stack" style={{ gap: 18, maxWidth: 940 }}>
          <span className="eyebrow">Question d&apos;un membre</span>
          <h1 className="h-xl">Répondre à une question</h1>
        </div>
      </section>
      <section className="band bg-white">
        <div className="wrap stack" style={{ maxWidth: 940, gap: 24 }}>
          {reattribuee ? (
            <div className="okbox" role="status">
              <span className="rec-badge rec-badge--pending">Demande réattribuée</span>
              <p className="small">Cette demande a été confiée à une autre personne. Vous n&apos;avez plus rien à faire, merci pour votre disponibilité.</p>
            </div>
          ) : cloturee ? (
            <div className="okbox" role="status">
              <span className="rec-badge rec-badge--active">Demande clôturée</span>
              <p className="small">Cette demande est clôturée : il n&apos;est plus possible d&apos;y répondre. Merci pour votre disponibilité.</p>
            </div>
          ) : (
            <>
              <div className="card stack-s">
                <h2 className="h-s">La question</h2>
                <p className="small muted">
                  {membre}
                  {d.membre?.entreprise?.nom ? ` · ${d.membre.entreprise.nom}` : ''}
                  {d.etiquette?.nom ? ` · #${d.etiquette.nom}` : ''}
                </p>
                <p style={{ whiteSpace: 'pre-line' }}>{d.question}</p>
                <p className="small">
                  Réponse souhaitée : <b>{PREFERENCE[d.preference] ?? ''}</b>
                </p>
              </div>
              {(d.fil ?? []).length > 1 && (
                <div className="card stack-s">
                  <h2 className="h-s">Les échanges</h2>
                  {(d.fil ?? []).map((m, i) => (
                    <div className="item" key={i}>
                      <div className="grow">
                        <p className="xs muted">
                          {m.auteurType === 'membre' ? membre : m.auteurNom || (m.auteurType === 'rec242' ? 'REC 242' : '')} · {quand(m.date)}
                        </p>
                        <p style={{ whiteSpace: 'pre-line' }}>{m.texte}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <ReponseExpert jeton={(await params).jeton} action={repondreCommeExpert} />
            </>
          )}
        </div>
      </section>
    </>
  )
}
