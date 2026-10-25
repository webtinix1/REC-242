import type { DocumentViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast } from '@/access/roles'
import { categorie, fcfa, lettreCategorie, telephoneAffiche } from '@/lib/adhesion/categories'
import {
  AGES,
  badgeStatut,
  CONNU_PAR,
  FORMES,
  label,
  OBJECTIFS,
  STATUTS_CANDIDATURE,
} from '@/lib/adhesion/options'
import {
  modeLabel,
  objetLabel,
  situationPaiement,
  type PaiementResume,
} from '@/lib/adhesion/paiement'
import { numeroDossier, numeroRecu } from '@/lib/compteurs'
import { BoView, initiales, relatif } from '../BoView'
import { CandidatureActions } from './CandidatureActions'

const dateHeure = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Brazzaville',
      })
    : ''

type Dossier = Record<string, unknown> & {
  id: number
  numero?: number
  prenom?: string
  nom?: string
  raisonSociale?: string
  categorie?: string
  statut?: string
  createdAt: string
  telephone?: string
  email?: string
  trancheAge?: string
  formeJuridique?: string
  objectifs?: string[]
  connuPar?: string
  source?: string
  papierLieu?: string
  secteurs?: { nom?: string }[]
  localite?: { nom?: string } | null
  pieces?: { id: number; filename?: string; url?: string }[]
  bulletin?: { id: number; filename?: string; url?: string } | null
  pieceVerifiee?: boolean
  charteSignee?: boolean
  avisCommission?: boolean
  motifRefus?: string
  notes?: { auteurNom?: string; date?: string; texte: string }[]
  historique?: { date?: string; auteur?: string; action: string }[]
}

/** Écran 04 : dossier d'une candidature. */
export const CandidatureView = async (props: DocumentViewServerProps) => {
  const { payload, user } = props
  const id = props.id ?? (props.doc as { id?: number } | undefined)?.id
  if (!id)
    return (
      <BoView titre="Candidature">
        <p>
          Une candidature arrive par le site, ou se saisit depuis la liste avec « Saisir une
          candidature papier ».{' '}
          <Link className="linkbtn" href="/admin/collections/applications">
            ← Candidatures
          </Link>
        </p>
      </BoView>
    )
  const d = (await payload.findByID({
    collection: 'applications',
    id,
    depth: 1,
    user,
    overrideAccess: false,
  })) as unknown as Dossier
  const paiements = (
    await payload.find({
      collection: 'payments',
      where: { candidature: { equals: d.id } },
      overrideAccess: true,
      depth: 0,
      sort: 'createdAt',
    })
  ).docs as unknown as (PaiementResume & { id: number; numero?: number; createdAt: string })[]
  const nom = `${d.prenom ?? ''} ${d.nom ?? ''}`.trim()
  const cat = categorie(d.categorie)
  const fichiers = [...(d.bulletin ? [d.bulletin] : []), ...(d.pieces ?? [])].filter(
    (p) => typeof p === 'object',
  )
  const modifiable = atLeast(user as never, 'candidatures', 'partial')

  return (
    <BoView titre="Candidature">
      <Link
        className="linkbtn"
        href="/admin/collections/applications"
        style={{ width: 'max-content' }}
      >
        ← Candidatures
      </Link>
      <div className="head-card">
        <span className="av av-lg av-photo">{initiales(nom)}</span>
        <div>
          <p className="small muted mono">
            Dossier {numeroDossier(d.numero)} · reçue {relatif(d.createdAt).toLowerCase()}
            {d.source === 'papier' ? ` · bulletin papier (${d.papierLieu ?? ''})` : ''}
          </p>
          <h2 className="h1">{nom}</h2>
          <p className="muted">
            {[
              d.raisonSociale,
              d.secteurs?.map((s) => s.nom).join(', '),
              d.localite?.nom,
              `catégorie ${lettreCategorie(d.categorie)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <span className={`rec-badge rec-badge--${badgeStatut(d.statut)}`}>
          {label(STATUTS_CANDIDATURE, d.statut)}
        </span>
      </div>
      <CandidatureActions
        id={d.id}
        modifiable={modifiable}
        statut={d.statut ?? 'recue'}
        statuts={STATUTS_CANDIDATURE}
        email={d.email ?? ''}
        nom={nom}
        rdv={{
          pieceVerifiee: Boolean(d.pieceVerifiee),
          charteSignee: Boolean(d.charteSignee),
          avisCommission: Boolean(d.avisCommission),
        }}
        motifRefus={d.motifRefus ?? ''}
        notes={(d.notes ?? [])
          .map((n) => ({
            qui: n.auteurNom ?? '',
            quand: n.date ? relatif(n.date) : '',
            texte: n.texte,
          }))
          .reverse()}
        historique={(d.historique ?? [])
          .map((h) => ({ t: h.action, d: dateHeure(h.date), who: h.auteur ?? '' }))
          .reverse()}
        dossier={
          <section className="panel">
            <h3 className="h3">Dossier</h3>
            <dl className="dl">
              <dt>Téléphone</dt>
              <dd>{telephoneAffiche(d.telephone)}</dd>
              <dt>E-mail</dt>
              <dd>{d.email}</dd>
              <dt>Tranche d’âge</dt>
              <dd>{label(AGES, d.trancheAge) || 'Non renseignée'}</dd>
              <dt>Forme juridique</dt>
              <dd>{label(FORMES, d.formeJuridique) || 'Non renseignée'}</dd>
              <dt>Objectifs</dt>
              <dd>
                {(d.objectifs ?? []).map((o) => label(OBJECTIFS, o)).join(', ') || 'Non renseignés'}
              </dd>
              <dt>Connu par</dt>
              <dd>{label(CONNU_PAR, d.connuPar) || 'Non renseigné'}</dd>
              <dt>Paiement</dt>
              <dd>
                {situationPaiement(d, paiements)}
                {cat?.note ? ` · ${cat.note}` : ''}
                {paiements
                  .filter((p) => p.numero)
                  .map((p) => (
                    <React.Fragment key={p.id}>
                      <br />
                      <a
                        className="linkbtn"
                        href={`/api/payments/${p.id}/recu`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Reçu {numeroRecu(p.numero)}
                      </a>{' '}
                      · {objetLabel(p.objet)} · {fcfa(p.montant)} · {modeLabel(p.mode)}
                    </React.Fragment>
                  ))}
              </dd>
              <dt>Pièces jointes</dt>
              <dd>
                {fichiers.length
                  ? fichiers.map((f, i) => (
                      <React.Fragment key={f.id}>
                        {i > 0 && <br />}
                        <a
                          className="linkbtn"
                          href={f.url ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {f.filename}
                        </a>
                      </React.Fragment>
                    ))
                  : 'Aucune'}
              </dd>
            </dl>
          </section>
        }
      />
    </BoView>
  )
}
