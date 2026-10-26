'use client'
import { Link, toast, useAuth } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

type Props = {
  collectionSlug?: string
  rowData?: Record<string, unknown>
  /** « modifier » (par défaut), « page » (Modifier et Prévisualiser) ou « desactiver » (comptes d'administration). */
  variante?: 'modifier' | 'page' | 'desactiver'
}

/** Dernière colonne des tableaux de la maquette : liens « Modifier », « Prévisualiser » ou « Désactiver ». */
export const ActionCell = ({ collectionSlug, rowData, variante = 'modifier' }: Props) => {
  const { user } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const id = rowData?.id
  if (id === undefined || id === null || !collectionSlug) return null
  const href = `/admin/collections/${collectionSlug}/${id}`

  if (variante === 'desactiver') {
    // Seul le super administrateur gère les comptes ; l'API refuse de toute façon les autres.
    const isSuper = ((user as { roles?: string[] } | null)?.roles ?? []).includes('superadmin')
    if (!isSuper || rowData?.statut === 'desactive') return null
    const desactiver = async () => {
      if (!window.confirm(`Désactiver le compte de ${String(rowData?.name ?? '')} ?`)) return
      setBusy(true)
      const r = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'desactive' }),
      })
      setBusy(false)
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { errors?: { message: string }[] }
        toast.error(j.errors?.[0]?.message || 'Le compte n’a pas pu être désactivé.')
        return
      }
      router.refresh()
    }
    return (
      <span className="rec-linkcell">
        <button type="button" className="rec-linkbtn" onClick={desactiver} disabled={busy}>
          Désactiver
        </button>
      </span>
    )
  }

  return (
    <span className="rec-linkcell">
      <Link className="rec-linkbtn" href={href}>
        Modifier
      </Link>
      {variante === 'page' && typeof rowData?.slug === 'string' ? (
        <>
          {' '}
          <a
            className="rec-linkbtn"
            href={`/apercu?type=pages&slug=${encodeURIComponent(rowData.slug)}`}
            target="_blank"
            rel="noopener"
          >
            Prévisualiser
          </a>
        </>
      ) : null}
    </span>
  )
}
