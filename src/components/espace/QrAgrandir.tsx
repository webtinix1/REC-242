'use client'

import React, { useState } from 'react'

/** « Agrandir ou réduire le QR code » (écran 13) : bascule la classe qr-true / qr-false de la maquette. */
export function QrAgrandir({ svg }: { svg: string }) {
  const [grand, setGrand] = useState(false)
  return (
    <div className="stack-s" style={{ alignItems: 'center' }}>
      <span className={`qr qr-${grand}`} role="img" aria-label="QR code de membre" dangerouslySetInnerHTML={{ __html: svg }} />
      <button type="button" className="linkbtn" onClick={() => setGrand((v) => !v)} aria-pressed={grand}>
        Agrandir ou réduire le QR code
      </button>
    </div>
  )
}
