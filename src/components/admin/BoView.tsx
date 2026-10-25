import React from 'react'

import '@/styles/back-office.css'
import '@/styles/bo-views.css'

/**
 * Cadre des vues personnalisées du back-office : styles de la maquette (design/back-office.css, portée « .bb »)
 * à l'intérieur de l'admin Payload, titre de l'écran, contenu.
 */
export const BoView = ({ titre, children }: { titre: string; children: React.ReactNode }) => (
  <div className="bb bo-view">
    <div className="content">
      <h1 className="top-t bo-title">{titre}</h1>
      {children}
    </div>
  </div>
)

/** « Il y a 2 h », « Hier », « Il y a 3 jours »… (heure de Brazzaville pour les dates longues). */
export const relatif = (iso: string, now = Date.now()): string => {
  const d = (now - new Date(iso).getTime()) / 1000
  if (d < 60) return 'À l’instant'
  if (d < 3600) return `Il y a ${Math.floor(d / 60)} min`
  if (d < 86400) return `Il y a ${Math.floor(d / 3600)} h`
  if (d < 2 * 86400) return 'Hier'
  if (d < 30 * 86400) return `Il y a ${Math.floor(d / 86400)} jours`
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Brazzaville',
  })
}

export const initiales = (nom: string) =>
  nom
    .replace(/,.*$/, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
