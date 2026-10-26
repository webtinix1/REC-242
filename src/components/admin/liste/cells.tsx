import Link from 'next/link'
import type { Payload } from 'payload'
import React from 'react'

import { ROLES } from '@/access/roles'

/**
 * Cellules des tableaux natifs du back-office, rendues côté serveur (écrans 09, 14, 16, 18) : mêmes contenus et
 * mêmes classes que les tableaux de la maquette (.ent-cell, .av, .doc-th, .rec-badge, .pill, .mono).
 */
type Row = Record<string, unknown>
type CellProps = { rowData?: Row; collectionSlug?: string; payload?: Payload }

/** Relation non peuplée dans la liste (identifiant seul) : lecture du document lié côté serveur. */
const peupler = async (payload: Payload | undefined, collection: 'media' | 'users', v: unknown) => {
  if (!payload || (typeof v !== 'number' && typeof v !== 'string')) return v
  return payload.findByID({ collection, id: v, depth: 0, overrideAccess: true }).catch(() => null)
}

const TZ = 'Africa/Brazzaville'
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** « 3 oct. 2026 » (heure de Brazzaville). */
export const dateCourte = (iso?: unknown): string => {
  if (typeof iso !== 'string' || !iso) return '–'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '–'
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'numeric', year: 'numeric' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  )
  return `${Number(p.day)} ${MOIS[Number(p.month) - 1]} ${p.year}`
}

/** « 25 oct. 2026, 9 h » ou « 25 oct. 2026, 9 h 30 ». */
const dateHeure = (iso: string): string => {
  const d = new Date(iso)
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  )
  const m = Number(p.minute)
  return `${dateCourte(iso)}, ${Number(p.hour)} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`
}

const lien = (slug?: string, id?: unknown) => `/admin/collections/${slug}/${String(id)}`

const urlImage = (v: unknown, taille = 'thumbnail'): string | null => {
  if (!v || typeof v !== 'object') return null
  const m = v as { url?: string; sizes?: Record<string, { url?: string | null }> }
  return m.sizes?.[taille]?.url || m.url || null
}

const initiales = (nom: string) =>
  nom
    .replace(/\(.*\)/, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

/** Date de mise à jour : « 20 oct. 2026 ». */
export const MiseAJourCell = ({ rowData }: CellProps) => <span>{dateCourte(rowData?.updatedAt)}</span>

/** Statut d'une page : « Publiée » ou « Brouillon » (version la plus récente). */
export const StatutPageCell = ({ rowData }: CellProps) => {
  const publiee = rowData?._status === 'published'
  return (
    <span className={`rec-badge rec-badge--${publiee ? 'active' : 'pending'}`}>
      {publiee ? 'Publiée' : 'Brouillon'}
    </span>
  )
}

/** Actualités : date de publication, avec l'heure si l'actualité est programmée. */
export const PublicationCell = ({ rowData }: CellProps) => {
  const d = rowData?.datePublication
  if (typeof d !== 'string' || !d || rowData?.etat === 'brouillon' || rowData?.etat === 'relecture')
    return <span>–</span>
  return <span>{rowData?.etat === 'programme' ? dateHeure(d) : dateCourte(d)}</span>
}

/** Actualités : rôle de l'auteur (« Éditeur », « Administrateur »), comme la maquette. */
export const AuteurCell = async ({ rowData, payload }: CellProps) => {
  const a = (await peupler(payload, 'users', rowData?.auteur)) as { roles?: string[] } | null | undefined
  const role = a && typeof a === 'object' ? ROLES.find((r) => r.value === a.roles?.[0])?.label : undefined
  return <span>{role ?? '–'}</span>
}

/** Utilisateurs : photo (ou icône pour le compte de maintenance) et nom, lien vers la fiche. */
export const UtilisateurCell = async ({ rowData, collectionSlug, payload }: CellProps) => {
  const nom = String(rowData?.name ?? '')
  const photo = urlImage(await peupler(payload, 'media', rowData?.photo))
  return (
    <Link href={lien(collectionSlug, rowData?.id)} className="ent-cell rec-cell-lien">
      <span className="av av-photo" aria-hidden="true">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : String(rowData?.email ?? '').endsWith('@webtinix.test') || /webtinix/i.test(nom) ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
          </svg>
        ) : (
          initiales(nom)
        )}
      </span>
      <b>{nom}</b>
    </Link>
  )
}

/** Utilisateurs : rôle(s) en toutes lettres. */
export const RoleCell = ({ rowData }: CellProps) => {
  const roles = (rowData?.roles as string[] | undefined) ?? []
  return <span>{roles.map((v) => ROLES.find((r) => r.value === v)?.label ?? v).join(', ')}</span>
}

/** Documents : miniature de la couverture et titre, lien vers la fiche. */
export const DocumentCell = async ({ rowData, collectionSlug, payload }: CellProps) => {
  const titre = String(rowData?.titre ?? '')
  const img = urlImage(await peupler(payload, 'media', rowData?.couverture))
  return (
    <Link href={lien(collectionSlug, rowData?.id)} className="ent-cell rec-cell-lien">
      <span className="doc-th">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? <img src={img} alt={`Couverture : ${titre}`} /> : null}
      </span>
      <b>{titre}</b>
    </Link>
  )
}

/** Libellé masqué visuellement (en-tête de la colonne d'actions : « Action »). */
export const LibelleMasque = ({ field }: { field?: { label?: unknown } }) => (
  <span className="rec-sr">{typeof field?.label === 'string' ? field.label : 'Action'}</span>
)

/** « 21 oct. 2026, 14:02 » (heure de Brazzaville). */
const dateHeureJournal = (iso?: unknown): string => {
  if (typeof iso !== 'string' || !iso) return ''
  const h = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  return `${dateCourte(iso)}, ${h}`
}

/** Journal des actions (écran 17) : une entrée de la frise, action en gras puis date, auteur et ville. */
export const JournalCell = ({ rowData }: CellProps) => {
  const meta = [dateHeureJournal(rowData?.createdAt), rowData?.auteurNom, rowData?.ville]
    .filter((x) => typeof x === 'string' && x.trim())
    .join(' · ')
  return (
    <span className="tl">
      <span className="tl-dot" />
      <span className="tl-t">
        <b>{String(rowData?.action ?? '')}</b>
        <span className="small muted">{meta}</span>
      </span>
    </span>
  )
}

/** Première colonne d'une liste : titre du document en gras, lien vers la fiche (« useAsTitle » de la collection). */
export const TitreCell = ({
  rowData,
  collectionSlug,
  collectionConfig,
}: CellProps & { collectionConfig?: { admin?: { useAsTitle?: string } } }) => {
  const cle = collectionConfig?.admin?.useAsTitle ?? 'id'
  return (
    <Link href={lien(collectionSlug, rowData?.id)} className="rec-cell-lien">
      <b>{String(rowData?.[cle] ?? '')}</b>
    </Link>
  )
}
