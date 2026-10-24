'use client'
import React from 'react'

const MAP: Record<string, { label: string; cls: string }> = {
  actif: { label: 'Actif', cls: 'active' },
  invite: { label: 'Invitation envoyée', cls: 'pending' },
  desactive: { label: 'Désactivé', cls: 'suspended' },
}

export const StatusCell = ({ cellData }: { cellData?: string }) => {
  const s = MAP[cellData || ''] ?? { label: cellData || '', cls: 'pending' }
  return <span className={`rec-badge rec-badge--${s.cls}`}>{s.label}</span>
}
