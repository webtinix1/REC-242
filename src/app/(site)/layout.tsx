import type { Metadata } from 'next'
import React from 'react'
import { preload } from 'react-dom'

import { Footer } from '@/components/site/Footer'
import { Header } from '@/components/site/Header'
import { MobileNav } from '@/components/site/MobileNav'
import { Motion } from '@/components/site/Motion'
import { Preview } from '@/components/site/Preview'
import { isPreview } from '@/lib/site/payload'
import { getNavigation, getSettings, linkHref, waLink } from '@/lib/site/settings'

import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/composants.css'
import '@/styles/site.css'
import '@/styles/animations.css'
import '@/styles/site-next.css'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  const titre = s.seo?.titre || 'REC 242 · Réseau des Entrepreneurs Congolais'
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
    title: { default: titre, template: '%s · REC 242' },
    description: s.seo?.description,
    openGraph: { siteName: 'REC 242', locale: 'fr_FR', type: 'website' },
    icons: { icon: '/images/logo-rec242-96.png' },
  }
}

// Polices du premier écran (titres en Montserrat 800, texte en Inter 400) : préchargées pour l'affichage initial.
const POLICES = ['/fonts/montserrat-latin-800-normal.woff2', '/fonts/inter-latin-400-normal.woff2']

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  for (const f of POLICES) preload(f, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  const [nav, s, draft] = await Promise.all([getNavigation(), getSettings(), isPreview()])
  const items = (nav.principal ?? []).map((n) => ({ libelle: n.libelle, href: linkHref(n) }))
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'REC 242, Réseau des Entrepreneurs Congolais',
    url: process.env.NEXT_PUBLIC_SERVER_URL,
    logo: `${process.env.NEXT_PUBLIC_SERVER_URL}/images/logo-rec242.jpg`,
    email: s.email,
    telephone: s.whatsapp?.numero,
    address: s.adresse
      ? { '@type': 'PostalAddress', streetAddress: s.adresse, addressCountry: 'CG' }
      : undefined,
    sameAs: (s.reseauxSociaux ?? []).map((r) => r.url),
  }
  return (
    <html lang="fr">
      <body>
        <div className="sb">
          <a className="skip" href="#contenu">
            Aller au contenu
          </a>
          <Header />
          <main id="contenu">{children}</main>
          <Footer />
          <MobileNav items={items} whatsapp={waLink(s.whatsapp?.numero)} />
        </div>
        <Motion />
        {draft && (
          <Preview serverURL={process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'} />
        )}
        <script
          type="application/ld+json"
          // « < » échappé : un paramètre contenant « </script> » ne peut pas sortir du bloc JSON-LD.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd).replace(/</g, '\\u003c') }}
        />
      </body>
    </html>
  )
}
