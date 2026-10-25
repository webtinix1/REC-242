import type { Metadata } from 'next'
import React from 'react'

import { CotisationHaut } from '@/components/espace/CotisationHaut'
import { Icone } from '@/components/espace/Icones'
import { categorie, fcfa, montants, telephoneAffiche, type Tarifs } from '@/lib/adhesion/categories'
import { modeLabel, objetLabel } from '@/lib/adhesion/paiement'
import { numeroRecu } from '@/lib/compteurs'
import { resteDu, type Echeance } from '@/lib/cotisations/regles'
import { dateCourte, dateLongue, exigerMembre } from '@/lib/membres/espace'
import { getPayloadClient } from '@/lib/site/payload'

export const metadata: Metadata = { title: 'Cotisation et paiements' }

type Due = Echeance & { exercice?: { debut?: string; fin?: string; libelle?: string } }
type Paye = { id: number; numero?: number | null; objet?: string; mode?: string; montant: number; datePaiement?: string | null; createdAt?: string }

const nombre = (n: number) => n.toLocaleString('fr-FR').replace(/[  ]/g, ' ')
const rang = (n: number) => (n === 1 ? '1re' : `${n}e`)

/** Cotisation et paiements (écran 11) : échéance en cours, paiement mobile, échéancier, renouvellement, reçus. */
export default async function CotisationPage() {
  const m = await exigerMembre()
  const payload = await getPayloadClient()
  const [dues, payes, s] = await Promise.all([
    payload.find({ collection: 'dues', where: { membre: { equals: m.id } }, sort: '-exercice.debut', limit: 1, depth: 0, overrideAccess: true }),
    payload.find({ collection: 'payments', where: { and: [{ membre: { equals: m.id } }, { statut: { equals: 'paye' } }] }, sort: '-datePaiement', limit: 100, depth: 0, overrideAccess: true }),
    payload.findGlobal({ slug: 'settings', depth: 0, overrideAccess: true }) as Promise<{ adresse?: string; tarifs?: Tarifs }>,
  ])
  const e = dues.docs[0] as unknown as Due | undefined
  const recus = payes.docs as unknown as Paye[]
  const cat = categorie(m.categorie)
  const tranches = e?.tranches ?? []
  const total = tranches.reduce((x, t) => x + (t.montant ?? 0), 0)
  const reste = e ? resteDu(e) : 0
  const pct = total > 0 ? Math.round(((total - reste) / total) * 100) : 0
  const dues1 = tranches.filter((t) => t.statut !== 'paye')
  const libelle = e?.exercice?.libelle ?? ''
  const dateDe = (id?: number | null) => {
    const p = id ? recus.find((r) => r.id === id) : undefined
    return p ? dateCourte(p.datePaiement ?? p.createdAt) : ''
  }
  const droit = e?.droit ?? 0
  const lignes = [
    ...(droit > 0 && tranches[0]
      ? [{ cle: 'droit', objet: 'Droit d’adhésion', montant: droit, paye: tranches[0].statut === 'paye', date: dateDe(tranches[0].paiement) }]
      : []),
    ...tranches.map((t) => ({
      cle: `t${t.numero}`,
      objet: tranches.length === 1 ? `Cotisation ${libelle}` : `Cotisation ${libelle}, ${rang(t.numero)} tranche`,
      montant: t.numero === 1 ? t.montant - droit : t.montant,
      paye: t.statut === 'paye',
      date: t.statut === 'paye' ? dateDe(t.paiement) : `Avant le ${dateLongue(e?.dateLimite ?? t.echeance)}`,
    })),
  ]
  const prochaine = dues1[0]
  const bouton = !prochaine ? '' : tranches.length === 1 ? 'Payer ma cotisation' : `Payer la ${rang(prochaine.numero)} tranche`
  const anniversaire = e?.exercice?.fin ? new Date(new Date(e.exercice.fin).getTime() + 86400e3).toISOString() : ''
  const suivante = montants(cat, s.tarifs)?.cotisation

  return (
    <>
      <div className="top">
        <h1 className="h1">Cotisation et paiements</h1>
      </div>

      {e ? (
        <>
          <CotisationHaut
            d={{
              categorie: cat ? `${cat.lettre} · ${cat.nom}` : '',
              montants: e.montant ? `${droit > 0 ? `${nombre(droit)} + ` : ''}${nombre(e.montant)} FCFA` : '',
              exercice: libelle,
              pct,
              reste: `${nombre(reste)} FCFA`,
              soldee: reste <= 0,
              bouton,
              montant: prochaine?.montant ?? 0,
              montantTexte: fcfa(prochaine?.montant ?? 0),
              solde: reste,
              soldeTexte: fcfa(reste),
              tranchesDues: dues1.length,
              telephone: telephoneAffiche(m.telephone),
              siege: s.adresse ?? 'Au siège de REC 242',
            }}
          />

          <div className="split">
            <div className="card">
              <h2 className="h3">Échéancier</h2>
              {lignes.map((l) => (
                <div className={`sched ${l.paye ? 'active' : 'pending'}`} key={l.cle}>
                  <span className="bullet" aria-hidden="true" />
                  <div className="grow">
                    <p style={{ fontWeight: 600 }}>{l.objet}</p>
                    {l.date && <p className="xs muted">{l.date}</p>}
                  </div>
                  <span className="mono">{fcfa(l.montant)}</span>
                  <span className={`rec-badge rec-badge--${l.paye ? 'active' : 'pending'}`}>{l.paye ? 'Payé' : 'À payer'}</span>
                </div>
              ))}
            </div>
            <div className="card-soft">
              <h2 className="h3">Les règles</h2>
              <p className="small">
                Cotisation payable en deux tranches au plus, soldée dans les 3 mois suivant l’adhésion. Sans régularisation, le trésorier envoie trois relances écrites espacées d’au moins 15 jours, puis le comité de direction
                constate la perte de la qualité de membre.
              </p>
            </div>
          </div>

          {anniversaire && (
            <div className="card renew">
              <div className="row between">
                <h2 className="h3">Renouvellement</h2>
                <span className="rec-badge rec-badge--pending">Le {dateLongue(anniversaire)}</span>
              </div>
              <p className="small">
                Votre adhésion se renouvelle à sa date anniversaire.{' '}
                {suivante != null && `La cotisation ${new Date(anniversaire).getFullYear()} de ${fcfa(suivante)} sera payable en une fois ou en deux tranches, soldée sous 3 mois. `}
                Rappel par e-mail et WhatsApp 30 jours avant, paiement depuis cette page.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <h2 className="h3">Ma cotisation</h2>
          <p className="small muted">Aucune échéance de cotisation n’est enregistrée pour le moment. Le secrétariat vous écrit dès qu’elle est émise.</p>
        </div>
      )}

      <div className="card">
        <h2 className="h3">Mes reçus</h2>
        {recus.length ? (
          recus.map((r) => (
            <div className="item" key={r.id}>
              <span className="doc-th" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-brand)' }}>
                <Icone nom="file" className="ic" />
              </span>
              <div className="grow">
                <p style={{ fontWeight: 600 }}>{objetLabel(r.objet)}</p>
                <p className="xs muted">
                  <span className="mono">{numeroRecu(r.numero)}</span> · {modeLabel(r.mode)} · {dateCourte(r.datePaiement ?? r.createdAt)}
                </p>
              </div>
              <span className="mono">{fcfa(r.montant)}</span>
              <a className="linkbtn" href={`/espace-membre/cotisation/recu/${r.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Reçu ${numeroRecu(r.numero)} en PDF`}>
                PDF
              </a>
            </div>
          ))
        ) : (
          <p className="small muted">Aucun reçu pour le moment : ils apparaissent ici dès qu’un paiement est confirmé.</p>
        )}
      </div>
    </>
  )
}
