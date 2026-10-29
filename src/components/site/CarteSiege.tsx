import React from 'react'

/**
 * Plan d'accès du siège : carte Google intégrée, affichée d'emblée (décision Webtinix du 29/10/2026).
 * La politique de confidentialité signale les cookies que Google peut déposer.
 */
export function CarteSiege({ position, label }: { position: string; label: string }) {
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
}
