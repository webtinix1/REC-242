import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import React from 'react'

import { SuiviPaiement } from '@/components/site/SuiviPaiement'
import { Words } from '@/components/site/Words'
import { COOKIE_MERCI, lireJetonMerci } from '@/lib/adhesion/merci'
import { numeroDossierCandidat } from '@/lib/compteurs'
import { getPayloadClient } from '@/lib/site/payload'
import { getSettings, waLink } from '@/lib/site/settings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Candidature envoyée', robots: { index: false } }

const ETAPES = [
  ['L’équipe vous contacte', 'Sur WhatsApp, pour fixer un rendez-vous.'],
  ['Rendez-vous', 'Pièce d’identité vérifiée en main propre, charte signée.'],
  ['Agrément', 'Décision du comité de direction.'],
  ['Activation', 'E-mail de bienvenue et création de votre mot de passe.'],
  ['Membre actif', 'Carte de membre avec QR code et accès à votre espace.'],
]

/** Écran 11 : merci. Accessible seulement juste après l'envoi (cookie signé de 30 minutes), sinon retour à « Adhérer ». */
export default async function Merci() {
  const id = lireJetonMerci((await cookies()).get(COOKIE_MERCI)?.value)
  if (!id) redirect('/adherer')
  const payload = await getPayloadClient()
  const d = (await payload
    .findByID({ collection: 'applications', id, depth: 0, overrideAccess: true })
    .catch(() => null)) as {
    numero?: number
    createdAt?: string
    modePaiement?: string
  } | null
  if (!d) redirect('/adherer')
  const s = await getSettings()
  const dossier = numeroDossierCandidat(d.numero, d.createdAt)
  const paiement = (
    await payload.find({
      collection: 'payments',
      where: { candidature: { equals: id } },
      overrideAccess: true,
      depth: 0,
      limit: 1,
      sort: '-createdAt',
    })
  ).docs[0] as { statut?: string } | undefined
  const wa = waLink(s.whatsapp?.numero, `Bonjour REC 242, mon numéro de dossier est ${dossier}.`)

  return (
    <>
      <section className="band bg-green dark rings rings-w phead" data-m="head">
        <div className="wrap" style={{ maxWidth: 940 }}>
          <div className="fond">
            <div className="ok-disc" data-m="disc">
              <svg
                viewBox="0 0 24 24"
                width="48"
                height="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12l5 5 9-10" data-m-draw="" data-m-d="5" />
              </svg>
            </div>
            <div className="stack" style={{ gap: 14 }}>
              <span
                className="rec-badge rec-badge--pending"
                style={{ width: 'max-content' }}
                data-m="pop"
                data-m-d="2"
              >
                Reçue
              </span>
              <h1 className="h-xl" data-m="words" data-m-stagger="" data-m-d="2">
                <Words text="Candidature envoyée" />
              </h1>
              <p className="lead" data-m="rise" data-m-d="4">
                Merci. Votre dossier porte le numéro
              </p>
              <p className="dossier" data-m="wipe" data-m-d="5">
                {dossier}
              </p>
              <p className="muted" data-m="rise" data-m-d="7">
                Un e-mail récapitulatif vient de vous être envoyé.
              </p>
              {paiement && <SuiviPaiement initial={paiement.statut ?? 'en-attente'} />}
            </div>
          </div>
        </div>
      </section>
      <section className="band bg-white">
        <div className="wrap" style={{ maxWidth: 1100 }}>
          <h2 className="h-l" style={{ marginBottom: 28 }} data-m="rise">
            La suite
          </h2>
          <div className="path" data-m="line" data-m-stagger="">
            {ETAPES.map(([t, x], i) => (
              <div className="path-step" key={t}>
                <div className="n">{i + 1}</div>
                <div className="stack" style={{ gap: 6 }}>
                  <p className="h-s" style={{ fontSize: 17 }}>
                    {t}
                  </p>
                  <p className="small muted">{x}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="band bg-gold rings band-end" data-m="ripple" data-m-scrub="">
        <div className="wrap" style={{ maxWidth: 1100 }}>
          <div className="g2" style={{ alignItems: 'start' }} data-m="deal" data-m-stagger="">
            <div className="stack" style={{ gap: 14 }}>
              <h2 className="h-l">Suivez REC 242 sur WhatsApp</h2>
              <p className="muted">
                La chaîne officielle diffuse les annonces du réseau. Le groupe des membres vous sera
                ouvert après validation.
              </p>
              {s.whatsapp?.lienChaine && (
                <a
                  className="rec-btn rec-btn--primary"
                  style={{ width: 'max-content' }}
                  href={s.whatsapp.lienChaine}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Rejoindre la chaîne WhatsApp
                </a>
              )}
            </div>
            <div className="card" style={{ padding: 28 }}>
              <p className="h-s">Une question sur votre dossier ?</p>
              <p className="muted small">Écrivez à l’équipe avec votre numéro de dossier.</p>
              {wa ? (
                <a
                  className="rec-btn rec-btn--secondary"
                  style={{ width: 'max-content' }}
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Écrire à l’équipe sur WhatsApp
                </a>
              ) : (
                <Link
                  className="rec-btn rec-btn--secondary"
                  style={{ width: 'max-content' }}
                  href="/contact?motif=Adhésion"
                >
                  Écrire à l’équipe
                </Link>
              )}
            </div>
          </div>
          <p className="small" style={{ marginTop: 24 }} data-m="rise" data-m-d="3">
            Votre espace membre sera accessible après validation.
          </p>
        </div>
      </section>
    </>
  )
}
