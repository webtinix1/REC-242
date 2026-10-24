import type { Metadata } from 'next'
import React from 'react'

import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/composants.css'
import '@/styles/site.css'
import '@/styles/animations.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
  title: {
    default: 'REC 242 · Réseau des Entrepreneurs Congolais',
    template: '%s · REC 242',
  },
  description:
    "REC 242 réunit entreprenants de l'informel, commerçants et entreprises pour s'entraider, se rencontrer et faire des affaires ensemble.",
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
