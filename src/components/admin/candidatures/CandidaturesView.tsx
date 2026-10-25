import type { ListViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { atLeast } from '@/access/roles'
import { lettreCategorie } from '@/lib/adhesion/categories'
import { badgeStatut, label, STATUTS_CANDIDATURE } from '@/lib/adhesion/options'
import { situationPaiement, type PaiementResume } from '@/lib/adhesion/paiement'
import { numeroDossier } from '@/lib/compteurs'
import { BoView, initiales, relatif } from '../BoView'
import { BarreCandidatures } from './BarreCandidatures'

const BASE = '/admin/collections/applications'
const FILTRES = ['recue', 'en-examen', 'complement', 'acceptee', 'refusee']

type Ligne = {
  id: number
  numero?: number
  prenom?: string
  nom?: string
  raisonSociale?: string
  categorie?: string
  modePaiement?: string
  modalite?: string
  statut?: string
  createdAt: string
  secteurs?: { nom?: string }[]
  localite?: { nom?: string } | null
}

/** Écran 03 : liste des candidatures, filtres par statut avec compteurs, export, saisie d'une candidature papier. */
export const CandidaturesView = async (props: ListViewServerProps) => {
  const { payload, user, searchParams } = props
  const statut =
    typeof searchParams?.statut === 'string' && FILTRES.includes(searchParams.statut)
      ? searchParams.statut
      : undefined
  const [r, comptes, localites] = await Promise.all([
    payload.find({
      collection: 'applications',
      user,
      overrideAccess: false,
      where: statut ? { statut: { equals: statut } } : { statut: { not_equals: 'archivee' } },
      sort: '-createdAt',
      limit: 200,
      depth: 1,
    }),
    Promise.all(
      [undefined, ...FILTRES].map((s) =>
        payload.count({
          collection: 'applications',
          user,
          overrideAccess: false,
          where: s ? { statut: { equals: s } } : { statut: { not_equals: 'archivee' } },
        }),
      ),
    ),
    payload.find({ collection: 'localities', limit: 50, depth: 0, sort: 'ordre' }),
  ])
  const ids = r.docs.map((d) => d.id)
  const paiements = ids.length
    ? await payload.find({
        collection: 'payments',
        where: { candidature: { in: ids } },
        overrideAccess: true,
        depth: 0,
        limit: 1000,
      })
    : { docs: [] }
  const parDossier = new Map<number, PaiementResume[]>()
  for (const p of paiements.docs) {
    const c = (p as { candidature?: number }).candidature as number
    parDossier.set(c, [...(parDossier.get(c) ?? []), p as unknown as PaiementResume])
  }
  const filtres = [
    { value: '', label: 'Toutes' },
    ...FILTRES.map((v) => ({ value: v, label: label(STATUTS_CANDIDATURE, v) })),
  ]

  return (
    <BoView titre="Candidatures">
      <BarreCandidatures
        localites={localites.docs.map((l) => ({
          id: l.id as number,
          nom: (l as unknown as { nom: string }).nom,
        }))}
        peutSaisir={atLeast(user as never, 'candidatures', 'partial')}
        peutEncaisser={atLeast(user as never, 'cotisations', 'full')}
      >
        {filtres.map((f, i) => (
          <Link
            key={f.value}
            href={f.value ? `${BASE}?statut=${f.value}` : BASE}
            className={`chip${(statut ?? '') === f.value ? ' is-on' : ''}`}
          >
            {f.label} <span className="cnt">{comptes[i].totalDocs}</span>
          </Link>
        ))}
      </BarreCandidatures>
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">Dossier</th>
              <th scope="col">Candidat</th>
              <th scope="col">Catégorie</th>
              <th scope="col">Secteur · ville</th>
              <th scope="col">Reçue</th>
              <th scope="col">Paiement</th>
              <th scope="col">Statut</th>
              <th scope="col">
                <span className="sr">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {r.docs.length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  Aucune candidature pour ce filtre.
                </td>
              </tr>
            )}
            {(r.docs as unknown as Ligne[]).map((c) => {
              const nom = `${c.prenom ?? ''} ${c.nom ?? ''}`.trim()
              return (
                <tr key={c.id}>
                  <td className="mono">{numeroDossier(c.numero)}</td>
                  <td data-label="Candidat">
                    <span className="ent-cell">
                      <span className="av av-photo face">{initiales(nom)}</span>
                      <span>
                        <b>{nom}</b>
                        <br />
                        <span className="small muted">{c.raisonSociale}</span>
                      </span>
                    </span>
                  </td>
                  <td data-label="Catégorie">
                    <span className="cat">{lettreCategorie(c.categorie)}</span>
                  </td>
                  <td data-label="Secteur">
                    {c.secteurs?.[0]?.nom ?? ''} · {c.localite?.nom ?? ''}
                  </td>
                  <td data-label="Reçue">{relatif(c.createdAt)}</td>
                  <td data-label="Paiement" className="small">
                    {situationPaiement(c, parDossier.get(c.id))}
                  </td>
                  <td data-label="Statut">
                    <span className={`rec-badge rec-badge--${badgeStatut(c.statut)}`}>
                      {label(STATUTS_CANDIDATURE, c.statut)}
                    </span>
                  </td>
                  <td>
                    <Link className="linkbtn" href={`${BASE}/${c.id}`}>
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Les candidatures en double sont bloquées à l’envoi (même e-mail ou même téléphone).
      </p>
    </BoView>
  )
}
