'use client'
import { Link, useDocumentInfo } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

type Version = { id: string | number; updatedAt: string }

const TZ = 'Africa/Brazzaville'
const quand = (iso: string): string => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 120) return 'à l’instant'
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ })
}

/**
 * Historique des versions dans le panneau latéral (écrans 10 et 22) : les dernières versions, chacune avec
 * « Restaurer » (vue de comparaison native de Payload, qui porte le bouton de restauration).
 */
export const Historique = ({ titre = 'Historique des versions' }: { titre?: string }) => {
  const { collectionSlug, id } = useDocumentInfo()
  const [versions, setVersions] = useState<Version[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!id || !collectionSlug) return
    let vivant = true
    fetch(
      `/api/${collectionSlug}/versions?where[parent][equals]=${id}&sort=-updatedAt&limit=3&depth=0&select[updatedAt]=true`,
      { credentials: 'include' },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { docs?: Version[]; totalDocs?: number } | null) => {
        if (!vivant || !j?.docs) return
        setVersions(j.docs)
        setTotal(j.totalDocs ?? j.docs.length)
      })
      .catch(() => {})
    return () => {
      vivant = false
    }
  }, [collectionSlug, id])

  if (!id || versions.length === 0) return null
  return (
    <div className="rec-historique">
      <h3 className="rec-historique__titre">{titre}</h3>
      {versions.map((v, i) => (
        <div className="rec-historique__ligne" key={v.id}>
          <span className="rec-historique__dot" aria-hidden="true" />
          <p>
            Version {total - i} · {i === 0 ? quand(v.updatedAt) : null}
            {i > 0 ? (
              <Link
                className="rec-linkbtn"
                href={`/admin/collections/${collectionSlug}/${id}/versions/${v.id}`}
              >
                Restaurer
              </Link>
            ) : null}
          </p>
        </div>
      ))}
    </div>
  )
}
