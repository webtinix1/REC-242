'use client'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { api } from '../membres/api'

/** Écran 07 : « Dupliquer » crée une copie en brouillon puis l'ouvre. */
export const DupliquerEvenement = ({ id }: { id: number }) => {
  const router = useRouter()
  const [occupe, setOccupe] = useState(false)
  const [err, setErr] = useState('')
  return (
    <>
      <button
        type="button"
        className="linkbtn"
        disabled={occupe}
        onClick={async () => {
          setOccupe(true)
          setErr('')
          try {
            const r = (await api(`/api/events/${id}/dupliquer`, { method: 'POST', body: '{}' })) as { id?: number }
            if (r.id) router.push(`/admin/collections/events/${r.id}`)
          } catch (e) {
            setErr((e as Error).message)
            setOccupe(false)
          }
        }}
      >
        Dupliquer
      </button>
      {err && (
        <p className="err" role="alert">
          {err}
        </p>
      )}
    </>
  )
}
