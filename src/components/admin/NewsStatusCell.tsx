'use client'
import React from 'react'

const MAP: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'pending' },
  relecture: { label: 'En relecture', cls: 'pending' },
  programme: { label: 'Programmé', cls: 'pending' },
  publie: { label: 'Publié', cls: 'active' },
  archive: { label: 'Archivé', cls: 'suspended' },
}

export const NewsStatusCell = ({ cellData }: { cellData?: string }) => {
  const s = MAP[cellData || 'brouillon'] ?? MAP.brouillon
  return <span className={`rec-badge rec-badge--${s.cls}`}>{s.label}</span>
}
