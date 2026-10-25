'use client'
import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'

/** Mode aperçu : bandeau et rafraîchissement à chaque enregistrement dans l'admin (aperçu en direct). */
export const Preview = ({ serverURL }: { serverURL: string }) => {
  const router = useRouter()
  return (
    <>
      <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={serverURL} />
      <div className="toast" role="status">
        <span>Aperçu des brouillons</span>
        <Link className="linkbtn" href="/apercu/quitter" prefetch={false}>
          Quitter l’aperçu
        </Link>
      </div>
    </>
  )
}
