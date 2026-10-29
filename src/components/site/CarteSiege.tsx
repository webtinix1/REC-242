'use client'

import React, { useState } from 'react'

/**
 * Plan d'accès du siège. Le plan illustré de la maquette s'affiche d'abord ; la carte Google n'est chargée
 * qu'au clic du visiteur, pour ne déposer aucun cookie de Google sans son geste (politique de confidentialité).
 */
export function CarteSiege({ position, label, children }: { position: string; label: string; children: React.ReactNode }) {
  const [ouverte, setOuverte] = useState(false)
  if (ouverte)
    return (
      <div className="map">
        <iframe
          title={label}
          src={`https://www.google.com/maps?q=${encodeURIComponent(position)}&z=16&hl=fr&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    )
  return (
    <div className="map-wrap">
      {children}
      <button type="button" className="rec-btn rec-btn--secondary map-load" onClick={() => setOuverte(true)}>
        Afficher la carte Google
      </button>
    </div>
  )
}
