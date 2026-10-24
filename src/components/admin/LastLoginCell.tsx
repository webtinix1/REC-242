'use client'
import React from 'react'

const TZ = 'Africa/Brazzaville'
const day = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ }) // AAAA-MM-JJ
const time = (d: Date) =>
  d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

/** « Aujourd'hui, 09:40 », « Hier, 19:12 », « Il y a 3 jours », « Jamais » (comme la maquette). */
export const formatLastLogin = (value?: string | null, now = new Date()): string => {
  if (!value) return 'Jamais'
  const d = new Date(value)
  const diffDays = Math.round((Date.parse(day(now)) - Date.parse(day(d))) / 86_400_000)
  if (diffDays <= 0) return `Aujourd’hui, ${time(d)}`
  if (diffDays === 1) return `Hier, ${time(d)}`
  if (diffDays < 30) return `Il y a ${diffDays} jours`
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  })
}

export const LastLoginCell = ({ cellData }: { cellData?: string }) => (
  <span>{formatLastLogin(cellData)}</span>
)
