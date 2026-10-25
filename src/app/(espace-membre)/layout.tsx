import type { Metadata } from 'next'
import React from 'react'

import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/composants.css'
import '@/styles/espace-membre.css'
import '@/styles/espace-membre-next.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
  title: { default: 'Espace membre · REC 242', template: '%s · Espace membre · REC 242' },
  // Espace privé : jamais indexé.
  robots: { index: false, follow: false },
  icons: { icon: '/images/logo-rec242.jpg' },
}

export default function EspaceMembreLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className="mb">{children}</div>
      </body>
    </html>
  )
}
