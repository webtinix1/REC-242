import React from 'react'

/** Photo du dirigeant et logo de l'entreprise (classe `duo` de la maquette). */
export function Visage({ photo, logo, dirigeant, nom, grand }: { photo?: string; logo?: string; dirigeant: string; nom: string; grand?: boolean }) {
  const ini = dirigeant
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <span className={`duo${grand ? ' duo-xl' : ''}`}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="duo-face" src={photo} alt={dirigeant} />
      ) : (
        <span
          className="duo-face"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-sunken)', fontWeight: 600 }}
          aria-hidden="true"
        >
          {ini}
        </span>
      )}
      {logo && (
        <span className="logo-tile">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={`Logo ${nom}`} />
        </span>
      )}
    </span>
  )
}
