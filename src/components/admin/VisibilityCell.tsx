'use client'
import React from 'react'

const MAP: Record<string, string> = {
  public: 'Public',
  membres: 'Membres actifs',
  inscrits: 'Inscrits à un événement',
  comite: 'Comité de direction',
}

export const VisibilityCell = ({ cellData }: { cellData?: string }) => (
  <span className={`rec-pill${cellData === 'public' ? ' rec-pill--ok' : ''}`}>
    {MAP[cellData || ''] ?? cellData}
  </span>
)
